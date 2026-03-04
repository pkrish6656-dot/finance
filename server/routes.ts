import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { isAuthenticated } from "./replit_integrations/auth";
import { openai } from "./replit_integrations/audio/client";
import multer from "multer";
import { parse as parseCsv } from "csv-parse/sync";

const upload = multer({ storage: multer.memoryStorage() });
const defaultCategoryRules: Record<string, string> = {
  rent: "Housing",
  mortgage: "Housing",
  uber: "Transportation",
  lyft: "Transportation",
  gas: "Transportation",
  fuel: "Transportation",
  grocery: "Groceries",
  trader: "Groceries",
  walmart: "Groceries",
  restaurant: "Dining",
  cafe: "Dining",
  netflix: "Subscriptions",
  spotify: "Subscriptions",
  gym: "Subscriptions",
  amazon: "Shopping",
  pharmacy: "Healthcare",
  doctor: "Healthcare",
  cinema: "Entertainment",
  electric: "Utilities",
  water: "Utilities",
  internet: "Utilities",
};
const categoryTrainingByUser = new Map<string, Record<string, string>>();

const toNum = (amount: string | number) => Number(amount) || 0;

function categorizeMerchant(userId: string, merchant: string, fallback = "Uncategorized") {
  const normalized = merchant.toLowerCase();
  const trained = categoryTrainingByUser.get(userId) || {};
  const rules = { ...defaultCategoryRules, ...trained };
  const match = Object.entries(rules).find(([key]) => normalized.includes(key));
  return match?.[1] || fallback;
}

function trainCategory(userId: string, merchant: string, category: string) {
  const rules = categoryTrainingByUser.get(userId) || {};
  rules[merchant.toLowerCase()] = category;
  categoryTrainingByUser.set(userId, rules);
}

function detectSubscriptions(txs: Awaited<ReturnType<typeof storage.getTransactions>>) {
  const byMerchant = txs.filter((tx) => toNum(tx.amount) < 0).reduce<Record<string, typeof txs>>((acc, tx) => {
    const key = tx.merchant.toLowerCase();
    acc[key] = acc[key] || [];
    acc[key].push(tx);
    return acc;
  }, {});

  return Object.entries(byMerchant)
    .map(([name, records]) => {
      if (records.length < 2) return null;
      const sorted = [...records].sort((a, b) => +new Date(a.date) - +new Date(b.date));
      const amount = Math.abs(toNum(sorted[0].amount));
      const gaps = sorted.slice(1).map((tx, i) => {
        const prev = sorted[i];
        return Math.round((+new Date(tx.date) - +new Date(prev.date)) / 86400000);
      });
      const avgGap = gaps.reduce((a, b) => a + b, 0) / Math.max(1, gaps.length);
      if (avgGap > 40) return null;
      const lastDate = sorted[sorted.length - 1].date;
      const inactive = (+new Date() - +new Date(lastDate)) / 86400000 > avgGap * 1.8;
      return { name: sorted[0].merchant, amount, cadenceDays: Math.max(1, Math.round(avgGap)), inactive };
    })
    .filter((x): x is { name: string; amount: number; cadenceDays: number; inactive: boolean } => Boolean(x));
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.get(api.transactions.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const items = await storage.getTransactions(userId);
    res.status(200).json(items);
  });

  app.post(api.transactions.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.transactions.create.input.parse(req.body);
      const computedCategory = input.category?.trim() || categorizeMerchant(userId, input.merchant);
      const tx = await storage.createTransaction({
        ...input,
        userId,
        amount: input.amount.toString(),
        category: computedCategory,
        isSubscription: input.isSubscription ?? false,
      });
      res.status(201).json(tx);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.transactions.updateCategory.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const txId = Number(req.params.id);
      const input = api.transactions.updateCategory.input.parse(req.body);
      const updated = await storage.updateTransactionCategory(userId, txId, input.category);
      if (!updated) return res.status(404).json({ message: "Transaction not found" });
      trainCategory(userId, input.merchant || updated.merchant, input.category);
      res.status(200).json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.post(api.transactions.uploadCsv.path, isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const records = parseCsv(req.file.buffer, { columns: true, skip_empty_lines: true });
      const txsToInsert = records.map((record: any) => {
        const merchant = record.Merchant || record.Description || record.merchant || "Unknown";
        const amount = String(record.Amount || record.amount || "0");
        return {
          userId,
          date: record.Date || record.date || new Date().toISOString().split("T")[0],
          amount,
          merchant,
          category: record.Category || record.category || categorizeMerchant(userId, merchant),
          isSubscription: false,
        };
      });

      await storage.createTransactionsBatch(txsToInsert);
      res.status(200).json({ message: "Upload successful", count: txsToInsert.length });
    } catch (error) {
      res.status(400).json({ message: "Failed to parse CSV file" });
    }
  });

  app.get(api.budgets.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    res.status(200).json(await storage.getBudgets(userId));
  });

  app.post(api.budgets.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.budgets.create.input.parse(req.body);
      res.status(201).json(await storage.createBudget({ ...input, userId, amount: input.amount.toString() }));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.goals.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    res.status(200).json(await storage.getSavingsGoals(userId));
  });

  app.post(api.goals.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.goals.create.input.parse(req.body);
      res.status(201).json(await storage.createSavingsGoal({ ...input, userId, targetAmount: input.targetAmount.toString(), currentAmount: input.currentAmount ? input.currentAmount.toString() : "0" }));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.subscriptions.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    res.status(200).json(await storage.getSubscriptions(userId));
  });

  app.get(api.insights.get.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const [txs, budgets] = await Promise.all([storage.getTransactions(userId), storage.getBudgets(userId)]);
      let totalExpenses = 0;
      let totalIncome = 0;
      const categories: Record<string, number> = {};
      const monthlyMap: Record<string, { income: number; expenses: number }> = {};

      txs.forEach((tx) => {
        const amt = toNum(tx.amount);
        const month = tx.date.slice(0, 7);
        monthlyMap[month] = monthlyMap[month] || { income: 0, expenses: 0 };
        if (amt < 0) {
          const abs = Math.abs(amt);
          totalExpenses += abs;
          monthlyMap[month].expenses += abs;
          categories[tx.category] = (categories[tx.category] || 0) + abs;
        } else {
          totalIncome += amt;
          monthlyMap[month].income += amt;
        }
      });

      const categoryBreakdown = Object.entries(categories).map(([category, amount]) => ({ category, amount }));
      const largestCategories = [...categoryBreakdown].sort((a, b) => b.amount - a.amount).slice(0, 5);
      const monthlyTrend = Object.entries(monthlyMap)
        .map(([month, values]) => ({ month, income: values.income, expenses: values.expenses }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);

      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
      const discretionary = (categories.Dining || 0) + (categories.Entertainment || 0) + (categories.Shopping || 0) + (categories.Subscriptions || 0);
      const debtLike = (categories.Housing || 0) + (categories.Transportation || 0);
      const debtToIncome = totalIncome > 0 ? (debtLike / totalIncome) * 100 : 0;

      const budgetStatus = budgets.map((budget) => {
        const spent = categories[budget.category] || 0;
        const limit = toNum(budget.amount);
        const remaining = limit - spent;
        const projectedSpend = spent * 1.15;
        return {
          category: budget.category,
          limit,
          spent,
          remaining,
          projectedSpend,
          atRisk: projectedSpend > limit,
        };
      });

      const subscriptions = detectSubscriptions(txs);
      const monthlyTotal = subscriptions.reduce((acc, s) => acc + (30 / s.cadenceDays) * s.amount, 0);
      const inactiveCount = subscriptions.filter((s) => s.inactive).length;

      const spendingAlerts = [
        ...budgetStatus.filter((b) => b.remaining < 0).map((b) => ({ type: "budget", message: `${b.category} is over budget by $${Math.abs(b.remaining).toFixed(2)}.` })),
        ...txs
          .filter((tx) => Math.abs(toNum(tx.amount)) > 800)
          .slice(-2)
          .map((tx) => ({ type: "large_transaction", message: `Large transaction detected at ${tx.merchant} for $${Math.abs(toNum(tx.amount)).toFixed(2)}.` })),
      ];

      const budgetAdherence = budgetStatus.length === 0 ? 100 : (budgetStatus.filter((b) => !b.atRisk).length / budgetStatus.length) * 100;
      const scoreFactors = {
        savingsRate: Math.max(0, savingsRate),
        debtToIncome,
        discretionarySpending: totalIncome > 0 ? (discretionary / totalIncome) * 100 : 0,
        budgetAdherence,
      };

      const score = Math.round(
        Math.max(0, Math.min(100, 40 + scoreFactors.savingsRate * 0.9 - scoreFactors.debtToIncome * 0.25 - scoreFactors.discretionarySpending * 0.2 + scoreFactors.budgetAdherence * 0.25))
      );
      const recommendations = [
        scoreFactors.savingsRate < 20 ? "Increase savings rate by automating transfers right after payday." : "Great savings rate—consider allocating extra cash to goals.",
        inactiveCount > 0 ? `Cancel ${inactiveCount} inactive subscription(s) to reduce recurring costs.` : "Your subscriptions look healthy—review annual plans for discount opportunities.",
        budgetStatus.some((b) => b.atRisk) ? "One or more categories are projected to exceed budget—trim variable spending this week." : "Budget adherence is strong this month.",
      ];

      res.status(200).json({
        financialScore: score,
        totalExpenses,
        totalIncome,
        savingsRate: Number(savingsRate.toFixed(1)),
        netCashFlow: totalIncome - totalExpenses,
        monthlyTrend,
        incomeVsExpenses: [
          { name: "Income", value: totalIncome },
          { name: "Expenses", value: totalExpenses },
        ],
        categoryBreakdown,
        largestCategories,
        budgetStatus,
        spendingAlerts,
        subscriptionSummary: {
          monthlyTotal,
          yearlyProjection: monthlyTotal * 12,
          inactiveCount,
          subscriptions,
        },
        scoreFactors,
        recommendations,
      });
    } catch {
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  app.post(api.ai.chat.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { message } = api.ai.chat.input.parse(req.body);
      const [txs, budgets] = await Promise.all([storage.getTransactions(userId), storage.getBudgets(userId)]);
      const expenses = txs.filter((tx) => toNum(tx.amount) < 0).reduce((acc, tx) => acc + Math.abs(toNum(tx.amount)), 0);
      const context = `Transactions: ${txs.length}, Budget categories: ${budgets.length}, Total expenses: ${expenses.toFixed(2)}`;
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: "You are AutoFinance, a practical personal finance assistant. Give personalized, concrete, short plans." },
          { role: "system", content: context },
          { role: "user", content: message },
        ],
      });
      res.status(200).json({ response: response.choices[0].message.content || "I couldn't process that request." });
    } catch {
      res.status(500).json({ message: "Failed to communicate with AI assistant" });
    }
  });

  return httpServer;
}
