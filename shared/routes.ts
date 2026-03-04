import { z } from 'zod';
import { insertTransactionSchema, transactions, budgets, insertBudgetSchema, savingsGoals, insertSavingsGoalSchema, subscriptions, insertSubscriptionSchema } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const api = {
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions' as const,
      responses: {
        200: z.array(z.custom<typeof transactions.$inferSelect>()),
        401: errorSchemas.unauthorized,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/transactions' as const,
      input: insertTransactionSchema.omit({ userId: true }).extend({
         amount: z.union([z.string(), z.number()]),
      }),
      responses: {
        201: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    },
    uploadCsv: {
      method: 'POST' as const,
      path: '/api/transactions/upload' as const,
      // File upload using FormData
      responses: {
        200: z.object({ message: z.string(), count: z.number() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    }
  },
  budgets: {
    list: {
      method: 'GET' as const,
      path: '/api/budgets' as const,
      responses: {
        200: z.array(z.custom<typeof budgets.$inferSelect>()),
        401: errorSchemas.unauthorized,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/budgets' as const,
      input: insertBudgetSchema.omit({ userId: true }).extend({
        amount: z.union([z.string(), z.number()]),
      }),
      responses: {
        201: z.custom<typeof budgets.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  goals: {
    list: {
      method: 'GET' as const,
      path: '/api/goals' as const,
      responses: {
        200: z.array(z.custom<typeof savingsGoals.$inferSelect>()),
        401: errorSchemas.unauthorized,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/goals' as const,
      input: insertSavingsGoalSchema.omit({ userId: true }).extend({
         targetAmount: z.union([z.string(), z.number()]),
         currentAmount: z.union([z.string(), z.number()]).optional(),
      }),
      responses: {
        201: z.custom<typeof savingsGoals.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  subscriptions: {
    list: {
      method: 'GET' as const,
      path: '/api/subscriptions' as const,
      responses: {
        200: z.array(z.custom<typeof subscriptions.$inferSelect>()),
        401: errorSchemas.unauthorized,
      }
    }
  },
  insights: {
    get: {
      method: 'GET' as const,
      path: '/api/insights' as const,
      responses: {
        200: z.object({
          financialScore: z.number(),
          totalExpenses: z.number(),
          totalIncome: z.number(),
          savingsRate: z.number(),
          categoryBreakdown: z.array(z.object({ category: z.string(), amount: z.number() })),
        }),
        401: errorSchemas.unauthorized,
      }
    }
  },
  ai: {
    chat: {
      method: 'POST' as const,
      path: '/api/ai/chat' as const,
      input: z.object({ message: z.string() }),
      responses: {
        200: z.object({ response: z.string() }),
        401: errorSchemas.unauthorized,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
