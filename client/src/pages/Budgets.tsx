import { useState } from "react";
import { useBudgets, useCreateBudget, useTransactions } from "@/hooks/use-finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, PieChart as PieChartIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { api } from "@shared/routes";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

export default function Budgets() {
  const { data: budgets = [], isLoading } = useBudgets();
  const { data: transactions = [] } = useTransactions();
  const createBudget = useCreateBudget();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof api.budgets.create.input>>({
    resolver: zodResolver(api.budgets.create.input),
    defaultValues: {
      category: "",
      amount: "",
      month: new Date().toISOString().slice(0, 7), // YYYY-MM
    },
  });

  const onSubmit = (data: z.infer<typeof api.budgets.create.input>) => {
    createBudget.mutate(data, {
      onSuccess: () => {
        toast({ title: "Budget created!" });
        setIsOpen(false);
        form.reset();
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Budgets</h1>
          <p className="text-muted-foreground mt-1">Set limits and track your monthly spending.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl hover-elevate">
              <Plus className="w-4 h-4 mr-2" /> New Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Create Budget Limit</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Groceries" {...field} className="rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Limit ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="500.00" {...field} className="rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Month (YYYY-MM)</FormLabel>
                      <FormControl>
                        <Input placeholder="2023-10" {...field} className="rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full rounded-xl mt-4" disabled={createBudget.isPending}>
                  {createBudget.isPending ? "Saving..." : "Save Budget"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[1,2,3].map(i => <div key={i} className="h-40 bg-muted/20 animate-pulse rounded-2xl" />)}
        </div>
      ) : budgets.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 p-12 text-center text-muted-foreground flex flex-col items-center shadow-sm">
          <PieChartIcon className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">No budgets set</p>
          <p className="text-sm mt-1 mb-6">Create a budget to start tracking category spending.</p>
          <Button onClick={() => setIsOpen(true)} variant="outline" className="rounded-xl">Create your first budget</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => {
            const amount = Number(budget.amount);
            const monthTx = transactions.filter((tx) => tx.date.slice(0, 7) === budget.month && tx.category === budget.category && Number(tx.amount) < 0);
            const spent = monthTx.reduce((acc, tx) => acc + Math.abs(Number(tx.amount)), 0);
            const percent = amount > 0 ? Math.min(100, Math.round((spent / amount) * 100)) : 0;
            const today = new Date();
            const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            const projected = spent * (daysInMonth / Math.max(1, today.getDate()));
            const isWarning = percent > 85 || projected > amount;

            return (
              <Card key={budget.id} className="rounded-2xl border-border/50 shadow-sm hover:shadow-md transition-all">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{budget.category}</CardTitle>
                    <span className="text-xs font-semibold px-2 py-1 bg-secondary text-secondary-foreground rounded-full">
                      {budget.month}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Spent: <strong className="text-foreground">${spent.toFixed(2)}</strong></span>
                    <span className="text-muted-foreground">Limit: <strong className="text-foreground">${amount.toFixed(2)}</strong></span>
                  </div>
                  <Progress 
                    value={percent} 
                    className={`h-2.5 bg-secondary ${isWarning ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"}`} 
                  />
                  <p className={`text-xs mt-3 font-medium ${isWarning ? "text-destructive" : "text-muted-foreground"}`}>
                    {percent}% used · projected ${projected.toFixed(0)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
