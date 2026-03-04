import { useInsights } from "@/hooks/use-finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";
import { ArrowUpRight, ArrowDownRight, Wallet, Activity, AlertTriangle, ShieldCheck } from "lucide-react";

export default function Dashboard() {
  const { data: insights, isLoading, error } = useInsights();

  if (isLoading) {
    return <div className="p-8 space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>;
  }
  if (error || !insights) {
    return <div className="p-8 text-destructive">Could not load insights.</div>;
  }

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AutoFinance Dashboard</h1>
        <p className="text-muted-foreground">Automatic tracking, budgeting, alerts, and optimization in one place.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat title="Financial Health Score" value={`${insights.financialScore}/100`} icon={<ShieldCheck className="w-4 h-4 text-primary" />} />
        <Stat title="Income" value={`$${insights.totalIncome.toLocaleString()}`} icon={<ArrowUpRight className="w-4 h-4 text-emerald-500" />} />
        <Stat title="Expenses" value={`$${insights.totalExpenses.toLocaleString()}`} icon={<ArrowDownRight className="w-4 h-4 text-rose-500" />} />
        <Stat title="Net Cash Flow" value={`$${insights.netCashFlow.toLocaleString()}`} icon={<Wallet className="w-4 h-4 text-blue-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Spending Breakdown</CardTitle></CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={insights.categoryBreakdown} dataKey="amount" nameKey="category" innerRadius={60} outerRadius={100}>{insights.categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><RechartsTooltip formatter={(v: number) => `$${v.toFixed(2)}`} /><Legend /></PieChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Monthly Trend</CardTitle></CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%"><LineChart data={insights.monthlyTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><RechartsTooltip /><Line type="monotone" dataKey="income" stroke="hsl(var(--chart-2))" /><Line type="monotone" dataKey="expenses" stroke="hsl(var(--chart-1))" /></LineChart></ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Largest Categories</CardTitle></CardHeader>
          <CardContent className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={insights.largestCategories}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="category" /><YAxis /><RechartsTooltip /><Bar dataKey="amount" fill="hsl(var(--chart-3))" /></BarChart></ResponsiveContainer></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Budget & Alerts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {insights.spendingAlerts.length === 0 ? <p className="text-sm text-muted-foreground">No alerts right now.</p> : insights.spendingAlerts.map((a, i) => <div key={i} className="text-sm p-3 rounded-lg bg-amber-500/10 text-amber-700 flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5" />{a.message}</div>)}
            <div className="pt-2 text-sm text-muted-foreground">Subscription spend: <strong className="text-foreground">${insights.subscriptionSummary.monthlyTotal.toFixed(2)}/mo</strong> · Inactive: {insights.subscriptionSummary.inactiveCount}</div>
            <div className="text-sm text-muted-foreground">Savings rate: <strong className="text-foreground">{insights.savingsRate}%</strong> · Budget adherence: <strong className="text-foreground">{insights.scoreFactors.budgetAdherence.toFixed(0)}%</strong></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Personalized Recommendations</CardTitle></CardHeader>
        <CardContent className="space-y-2">{insights.recommendations.map((r, i) => <div key={i} className="text-sm rounded-lg border p-3 bg-card flex gap-2"><Activity className="w-4 h-4 text-primary mt-0.5" />{r}</div>)}</CardContent>
      </Card>
    </div>
  );
}

function Stat({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>{icon}</CardHeader><CardContent><div className="text-2xl font-bold">{value}</div></CardContent></Card>;
}
