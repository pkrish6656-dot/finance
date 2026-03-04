import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { isAuthenticated } from "./replit_integrations/auth";
import { openai } from "./replit_integrations/audio/client"; // Reusing the OpenAI client initialized there
import multer from "multer";
import { parse as parseCsv } from "csv-parse/sync";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Protect all API routes starting with /api (except auth routes handled elsewhere)
  // We apply the middleware to individual endpoints to make sure req.user is typed or handled
  
  app.get(api.transactions.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const items = await storage.getTransactions(userId);
    res.status(200).json(items);
  });

  app.post(api.transactions.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.transactions.create.input.parse(req.body);
      const tx = await storage.createTransaction({
        ...input,
        userId,
        amount: input.amount.toString(),
      });
      res.status(201).json(tx);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // CSV Upload for transactions
  app.post(api.transactions.uploadCsv.path, isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const records = parseCsv(req.file.buffer, {
        columns: true,
        skip_empty_lines: true
      });
      
      const txsToInsert = records.map((record: any) => ({
        userId,
        date: record.Date || record.date || new Date().toISOString().split('T')[0],
        amount: record.Amount || record.amount || "0",
        merchant: record.Merchant || record.Description || record.merchant || "Unknown",
        category: record.Category || record.category || "Uncategorized",
        isSubscription: false
      }));
      
      await storage.createTransactionsBatch(txsToInsert);
      res.status(200).json({ message: "Upload successful", count: txsToInsert.length });
    } catch (error) {
      console.error(error);
      res.status(400).json({ message: "Failed to parse CSV file" });
    }
  });

  app.get(api.budgets.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const items = await storage.getBudgets(userId);
    res.status(200).json(items);
  });

  app.post(api.budgets.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.budgets.create.input.parse(req.body);
      const b = await storage.createBudget({
        ...input,
        userId,
        amount: input.amount.toString(),
      });
      res.status(201).json(b);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.goals.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const items = await storage.getSavingsGoals(userId);
    res.status(200).json(items);
  });

  app.post(api.goals.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.goals.create.input.parse(req.body);
      const b = await storage.createSavingsGoal({
        ...input,
        userId,
        targetAmount: input.targetAmount.toString(),
        currentAmount: input.currentAmount ? input.currentAmount.toString() : "0",
      });
      res.status(201).json(b);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.subscriptions.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const items = await storage.getSubscriptions(userId);
    res.status(200).json(items);
  });

  // Financial Insights Endpoint
  app.get(api.insights.get.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const txs = await storage.getTransactions(userId);
      
      let totalExpenses = 0;
      let totalIncome = 0;
      const categories: Record<string, number> = {};
      
      txs.forEach(tx => {
        const amt = parseFloat(tx.amount);
        if (amt < 0) {
          totalExpenses += Math.abs(amt);
          categories[tx.category] = (categories[tx.category] || 0) + Math.abs(amt);
        } else {
          totalIncome += amt;
        }
      });
      
      const categoryBreakdown = Object.entries(categories).map(([category, amount]) => ({
        category,
        amount
      }));
      
      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
      
      // Very basic score logic
      let score = 50; 
      if (savingsRate > 20) score += 20;
      if (savingsRate > 10) score += 10;
      if (totalExpenses < totalIncome) score += 20;
      else score -= 20;
      
      res.status(200).json({
        financialScore: Math.max(0, Math.min(100, Math.round(score))),
        totalExpenses,
        totalIncome,
        savingsRate,
        categoryBreakdown
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  // AI Chat Assistant Endpoint
  app.post(api.ai.chat.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { message } = api.ai.chat.input.parse(req.body);
      
      // Fetch user data for context
      const txs = await storage.getTransactions(userId);
      const budgets = await storage.getBudgets(userId);
      const subs = await storage.getSubscriptions(userId);
      
      const context = `
      User Financial Context:
      Transactions count: ${txs.length}
      Budgets set: ${budgets.length}
      Active subscriptions: ${subs.length}
      `;
      
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: "You are AutoFinance, a helpful and expert AI personal finance assistant. Keep answers concise and helpful. You have access to some basic context about the user's finances." },
          { role: "system", content: context },
          { role: "user", content: message }
        ]
      });
      
      res.status(200).json({ response: response.choices[0].message.content || "I couldn't process that request." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to communicate with AI assistant" });
    }
  });

  return httpServer;
}
