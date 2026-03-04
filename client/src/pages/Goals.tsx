import { useState } from "react";
import { useGoals, useCreateGoal } from "@/hooks/use-finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, Trophy } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { api } from "@shared/routes";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

export default function Goals() {
  const { data: goals = [], isLoading } = useGoals();
  const createGoal = useCreateGoal();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof api.goals.create.input>>({
    resolver: zodResolver(api.goals.create.input),
    defaultValues: {
      name: "",
      targetAmount: "",
      currentAmount: "0",
      targetDate: "",
    },
  });

  const onSubmit = (data: z.infer<typeof api.goals.create.input>) => {
    // Convert empty string to null if schema allows, or handle date carefully
    const payload = {
      ...data,
      targetDate: data.targetDate || undefined
    };
    
    createGoal.mutate(payload, {
      onSuccess: () => {
        toast({ title: "Goal created successfully!" });
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
          <h1 className="text-3xl font-bold text-foreground">Savings Goals</h1>
          <p className="text-muted-foreground mt-1">Track progress towards your financial milestones.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl hover-elevate shadow-md bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Create Savings Goal</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. New Car" {...field} className="rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="10000" {...field} className="rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Starting Amount ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0" {...field} className="rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="targetDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} className="rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full rounded-xl mt-4 bg-blue-600 hover:bg-blue-700 text-white" disabled={createGoal.isPending}>
                  {createGoal.isPending ? "Creating..." : "Save Goal"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {[1,2].map(i => <div key={i} className="h-48 bg-muted/20 animate-pulse rounded-3xl" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border/50 p-12 text-center text-muted-foreground flex flex-col items-center shadow-sm">
          <Target className="w-16 h-16 mb-4 opacity-20 text-blue-500" />
          <p className="text-xl font-medium text-foreground">No active goals</p>
          <p className="text-sm mt-2 mb-6 max-w-md">Setting financial goals increases your likelihood of saving successfully by 40%.</p>
          <Button onClick={() => setIsOpen(true)} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">Start a Goal</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const current = Number(goal.currentAmount);
            const target = Number(goal.targetAmount);
            const percent = Math.min(100, Math.round((current / target) * 100));
            const isComplete = percent >= 100;

            return (
              <Card key={goal.id} className={`rounded-3xl border-border/50 shadow-sm transition-all hover:shadow-lg ${isComplete ? 'bg-gradient-to-br from-card to-blue-500/5' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${isComplete ? 'bg-blue-500 text-white' : 'bg-primary/10 text-primary'}`}>
                        {isComplete ? <Trophy className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                      </div>
                      <div>
                        <CardTitle className="text-xl">{goal.name}</CardTitle>
                        {goal.targetDate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Target: {new Date(goal.targetDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <span className="text-3xl font-bold text-foreground">${current.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground ml-2">/ ${target.toLocaleString()}</span>
                    </div>
                    <span className={`text-sm font-bold ${isComplete ? 'text-blue-500' : 'text-primary'}`}>{percent}%</span>
                  </div>
                  <Progress 
                    value={percent} 
                    className={`h-3 rounded-full bg-secondary ${isComplete ? "[&>div]:bg-blue-500" : "[&>div]:bg-primary"}`} 
                  />
                  {isComplete && (
                    <p className="text-xs text-blue-500 font-semibold mt-3 flex items-center">
                      Goal accomplished! 🎉
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
