import { useSubscriptions, useInsights } from "@/hooks/use-finance";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Repeat, Calendar, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Subscriptions() {
  const { data: subscriptions = [], isLoading } = useSubscriptions();
  const { data: insights } = useInsights();
  const detected = insights?.subscriptionSummary.subscriptions || [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subscriptions</h1>
          <p className="text-muted-foreground mt-1">Manage your recurring payments and services.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Monthly subscription spend</p><p className="text-2xl font-bold">${insights?.subscriptionSummary.monthlyTotal.toFixed(2) || "0.00"}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Yearly projection</p><p className="text-2xl font-bold">${insights?.subscriptionSummary.yearlyProjection.toFixed(2) || "0.00"}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Inactive subscriptions</p><p className="text-2xl font-bold">{insights?.subscriptionSummary.inactiveCount || 0}</p></CardContent></Card>
      </div>

      <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (subscriptions.length + detected.length) === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <Repeat className="w-12 h-12 mb-4 opacity-20 text-purple-500" />
              <p className="text-lg font-medium text-foreground">No active subscriptions</p>
              <p className="text-sm mt-1">Your auto-detected recurring payments will appear here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Billing Cycle</TableHead>
                  <TableHead>Next Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...subscriptions, ...detected.map((d, i) => ({ id: 100000 + i, name: d.name, status: d.inactive ? "inactive" : "active", billingCycle: d.cadenceDays > 32 ? "custom" : "monthly", nextBillingDate: null, amount: d.amount }))].map((sub) => (
                  <TableRow key={sub.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold text-xs uppercase">
                          {sub.name.slice(0,2)}
                        </div>
                        {sub.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full w-fit">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {sub.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize text-sm">
                      {sub.billingCycle}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4" />
                        {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground">
                      ${Number(sub.amount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
