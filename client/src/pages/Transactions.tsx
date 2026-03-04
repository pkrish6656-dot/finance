import { useState, useRef } from "react";
import { useTransactions, useCreateTransaction, useUploadTransactions, useUpdateTransactionCategory } from "@/hooks/use-finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Upload, Loader2, CalendarIcon, CreditCard } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { api } from "@shared/routes";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const categories = ["Housing", "Transportation", "Groceries", "Dining", "Subscriptions", "Shopping", "Healthcare", "Entertainment", "Utilities", "Income", "Uncategorized"];

export default function Transactions() {
  const { data: transactions = [], isLoading } = useTransactions();
  const createTx = useCreateTransaction();
  const uploadTx = useUploadTransactions();
  const updateCategory = useUpdateTransactionCategory();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const form = useForm<z.infer<typeof api.transactions.create.input>>({
    resolver: zodResolver(api.transactions.create.input),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      amount: "",
      merchant: "",
      category: "",
      isSubscription: false,
    },
  });

  const onSubmit = (data: z.infer<typeof api.transactions.create.input>) => {
    createTx.mutate(data, {
      onSuccess: () => {
        toast({ title: "Transaction added successfully!" });
        setIsAddOpen(false);
        form.reset();
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    uploadTx.mutate(formData, {
      onSuccess: (data) => {
        toast({ title: "Upload complete", description: `${data.message}. ${data.count} transactions imported.` });
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      onError: (err) => {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground mt-1">Import statements, auto-categorize spending, and train categories from corrections.</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <Button variant="outline" className="rounded-xl" onClick={() => fileInputRef.current?.click()} disabled={uploadTx.isPending}>
            {uploadTx.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}Upload CSV
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl"><Plus className="w-4 h-4 mr-2" /> Add Transaction</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-2xl">
              <DialogHeader><DialogTitle>Add New Transaction</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="merchant" render={({ field }) => (
                    <FormItem><FormLabel>Merchant</FormLabel><FormControl><Input placeholder="e.g. Netflix" {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="amount" render={({ field }) => (
                      <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" step="0.01" placeholder="-18.99" {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem><FormLabel>Category (optional)</FormLabel><FormControl><Input placeholder="Auto" {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <Button type="submit" className="w-full rounded-xl mt-4" disabled={createTx.isPending}>{createTx.isPending ? "Saving..." : "Save Transaction"}</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <CreditCard className="w-12 h-12 mb-4 opacity-20" />
              <p>No transactions found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50"><TableRow><TableHead>Date</TableHead><TableHead>Merchant</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-muted-foreground"><div className="flex items-center gap-2"><CalendarIcon className="w-3 h-3" />{new Date(tx.date).toLocaleDateString()}</div></TableCell>
                    <TableCell className="font-semibold text-foreground">{tx.merchant}</TableCell>
                    <TableCell>
                      <Select
                        defaultValue={tx.category}
                        onValueChange={(category) => updateCategory.mutate({ id: tx.id, category, merchant: tx.merchant })}
                      >
                        <SelectTrigger className="w-[180px] h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className={`text-right font-bold ${Number(tx.amount) < 0 ? "text-rose-500" : "text-emerald-500"}`}>${Math.abs(Number(tx.amount)).toFixed(2)}</TableCell>
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
