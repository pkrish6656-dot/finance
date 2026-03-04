import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { 
  transactions, 
  budgets, 
  savingsGoals, 
  subscriptions,
  type InsertTransaction,
  type InsertBudget,
  type InsertSavingsGoal,
  type InsertSubscription
} from "@shared/schema";

export interface IStorage {
  // Transactions
  getTransactions(userId: string): Promise<(typeof transactions.$inferSelect)[]>;
  createTransaction(transaction: InsertTransaction): Promise<typeof transactions.$inferSelect>;
  createTransactionsBatch(txs: InsertTransaction[]): Promise<(typeof transactions.$inferSelect)[]>;
  
  // Budgets
  getBudgets(userId: string): Promise<(typeof budgets.$inferSelect)[]>;
  createBudget(budget: InsertBudget): Promise<typeof budgets.$inferSelect>;
  
  // Goals
  getSavingsGoals(userId: string): Promise<(typeof savingsGoals.$inferSelect)[]>;
  createSavingsGoal(goal: InsertSavingsGoal): Promise<typeof savingsGoals.$inferSelect>;
  
  // Subscriptions
  getSubscriptions(userId: string): Promise<(typeof subscriptions.$inferSelect)[]>;
  createSubscription(sub: InsertSubscription): Promise<typeof subscriptions.$inferSelect>;
}

export class DatabaseStorage implements IStorage {
  async getTransactions(userId: string) {
    return await db.select().from(transactions).where(eq(transactions.userId, userId));
  }

  async createTransaction(transaction: InsertTransaction) {
    const [tx] = await db.insert(transactions).values(transaction).returning();
    return tx;
  }
  
  async createTransactionsBatch(txs: InsertTransaction[]) {
    if (txs.length === 0) return [];
    return await db.insert(transactions).values(txs).returning();
  }

  async getBudgets(userId: string) {
    return await db.select().from(budgets).where(eq(budgets.userId, userId));
  }

  async createBudget(budget: InsertBudget) {
    const [b] = await db.insert(budgets).values(budget).returning();
    return b;
  }

  async getSavingsGoals(userId: string) {
    return await db.select().from(savingsGoals).where(eq(savingsGoals.userId, userId));
  }

  async createSavingsGoal(goal: InsertSavingsGoal) {
    const [g] = await db.insert(savingsGoals).values(goal).returning();
    return g;
  }

  async getSubscriptions(userId: string) {
    return await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  }
  
  async createSubscription(sub: InsertSubscription) {
    const [s] = await db.insert(subscriptions).values(sub).returning();
    return s;
  }
}

export const storage = new DatabaseStorage();
