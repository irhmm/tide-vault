import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { formatCurrency, formatIndonesianDate } from "@/lib/utils";
import { Trash2, Edit, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MonthlyExpenseTarget {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  target_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ManualExpense {
  id: string;
  user_id: string;
  target_id: string;
  amount: number;
  description: string | null;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

export default function MonthlyExpenseTarget() {
  const { user } = useAuth();
  const [activeTarget, setActiveTarget] = useState<MonthlyExpenseTarget | null>(null);
  const [manualExpenses, setManualExpenses] = useState<ManualExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);

  // Form states
  const [targetAmount, setTargetAmount] = useState("");
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().split('T')[0]);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Calculate period end (30 days from start)
  const calculatePeriodEnd = (startDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 30);
    const year = end.getFullYear();
    const month = String(end.getMonth() + 1).padStart(2, '0');
    const day = String(end.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch active target and manual expenses
  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch active target
      const { data: targetData, error: targetError } = await supabase
        .from("monthly_expense_targets")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (targetError && targetError.code !== 'PGRST116') {
        throw targetError;
      }

      setActiveTarget(targetData);

      if (targetData) {
        // Fetch manual expenses for this target
        const { data: expensesData, error: expensesError } = await supabase
          .from("manual_expenses")
          .select("*")
          .eq("target_id", targetData.id)
          .order("expense_date", { ascending: false });

        if (expensesError) throw expensesError;
        setManualExpenses(expensesData || []);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to real-time updates
    const targetChannel = supabase
      .channel('monthly-expense-targets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monthly_expense_targets',
          filter: `user_id=eq.${user?.id}`
        },
        () => fetchData()
      )
      .subscribe();

    const expensesChannel = supabase
      .channel('manual-expenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'manual_expenses',
          filter: `user_id=eq.${user?.id}`
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(targetChannel);
      supabase.removeChannel(expensesChannel);
    };
  }, [user]);

  // Handle save/update target
  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const amount = parseFloat(targetAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Nominal target harus lebih dari 0");
      return;
    }

    try {
      if (activeTarget) {
        // Update existing target
        const { error } = await supabase
          .from("monthly_expense_targets")
          .update({
            target_amount: amount,
            period_start: periodStart,
            period_end: calculatePeriodEnd(periodStart),
          })
          .eq("id", activeTarget.id);

        if (error) throw error;
        toast.success("Target berhasil diperbarui");
      } else {
        // Create new target
        const { error } = await supabase
          .from("monthly_expense_targets")
          .insert({
            user_id: user.id,
            target_amount: amount,
            period_start: periodStart,
            period_end: calculatePeriodEnd(periodStart),
            is_active: true,
          });

        if (error) throw error;
        toast.success("Target berhasil disimpan");
      }

      setTargetAmount("");
    } catch (error: any) {
      console.error("Error saving target:", error);
      toast.error("Gagal menyimpan target");
    }
  };

  // Handle add expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeTarget) return;

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Nominal pengeluaran harus lebih dari 0");
      return;
    }

    try {
      if (editingExpense) {
        // Update existing expense
        const { error } = await supabase
          .from("manual_expenses")
          .update({
            amount,
            description: expenseDescription,
            expense_date: expenseDate,
          })
          .eq("id", editingExpense);

        if (error) throw error;
        toast.success("Pengeluaran berhasil diperbarui");
        setEditingExpense(null);
      } else {
        // Add new expense
        const { error } = await supabase
          .from("manual_expenses")
          .insert({
            user_id: user.id,
            target_id: activeTarget.id,
            amount,
            description: expenseDescription,
            expense_date: expenseDate,
          });

        if (error) throw error;
        toast.success("Pengeluaran berhasil ditambahkan");
      }

      // Reset form
      setExpenseAmount("");
      setExpenseDescription("");
      setExpenseDate(new Date().toISOString().split('T')[0]);
    } catch (error: any) {
      console.error("Error adding expense:", error);
      toast.error("Gagal menambahkan pengeluaran");
    }
  };

  // Handle delete expense
  const handleDeleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from("manual_expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Pengeluaran berhasil dihapus");
    } catch (error: any) {
      console.error("Error deleting expense:", error);
      toast.error("Gagal menghapus pengeluaran");
    }
  };

  // Handle edit expense
  const handleEditExpense = (expense: ManualExpense) => {
    setEditingExpense(expense.id);
    setExpenseAmount(expense.amount.toString());
    setExpenseDescription(expense.description || "");
    setExpenseDate(expense.expense_date);
  };

  // Calculate statistics
  const totalExpenses = manualExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const remaining = activeTarget ? Number(activeTarget.target_amount) - totalExpenses : 0;
  const percentage = activeTarget ? (totalExpenses / Number(activeTarget.target_amount)) * 100 : 0;
  const isOverBudget = remaining < 0;

  // Progress bar color
  const getProgressColor = () => {
    if (percentage >= 100) return "bg-destructive";
    if (percentage >= 80) return "bg-yellow-500";
    return "bg-primary";
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Target Pengeluaran Bulanan</h1>
        <p className="text-muted-foreground mt-2">Kelola target pengeluaran dan pantau pengeluaran manual Anda</p>
      </div>

      {/* Over Budget Alert */}
      {isOverBudget && activeTarget && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>⚠️ Pengeluaran Melebihi Target!</AlertTitle>
          <AlertDescription>
            Anda telah melampaui target sebesar <strong>{formatCurrency(Math.abs(remaining))}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Card */}
      {activeTarget && (
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Target</CardTitle>
            <CardDescription>
              Periode: {formatIndonesianDate(activeTarget.period_start)} - {formatIndonesianDate(activeTarget.period_end)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Target Pengeluaran</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(Number(activeTarget.target_amount))}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {isOverBudget ? "Melebihi Target" : "Sisa Budget"}
                </p>
                <p className={`text-2xl font-bold flex items-center gap-2 ${isOverBudget ? "text-destructive" : "text-green-600"}`}>
                  {isOverBudget ? <TrendingDown className="h-6 w-6" /> : <TrendingUp className="h-6 w-6" />}
                  {isOverBudget ? "-" : ""}{formatCurrency(Math.abs(remaining))}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-foreground">{percentage.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(percentage, 100)} className="h-3" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Set/Edit Target Form */}
      <Card>
        <CardHeader>
          <CardTitle>{activeTarget ? "Edit Target" : "Set Target Pengeluaran"}</CardTitle>
          <CardDescription>
            {activeTarget ? "Perbarui target pengeluaran Anda" : "Tetapkan target pengeluaran untuk periode 30 hari"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveTarget} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetAmount">Nominal Target (Rp)</Label>
                <Input
                  id="targetAmount"
                  type="number"
                  placeholder="5000000"
                  value={targetAmount || (activeTarget ? activeTarget.target_amount : "")}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodStart">Tanggal Mulai Periode</Label>
                <Input
                  id="periodStart"
                  type="date"
                  value={periodStart || (activeTarget ? activeTarget.period_start : "")}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tanggal Akhir Periode (Otomatis +30 hari)</Label>
              <Input
                type="text"
                value={formatIndonesianDate(calculatePeriodEnd(periodStart || (activeTarget?.period_start || "")))}
                disabled
                className="bg-muted"
              />
            </div>
            <Button type="submit" className="w-full md:w-auto">
              {activeTarget ? "Perbarui Target" : "Simpan Target"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Add Expense Form */}
      {activeTarget && (
        <Card>
          <CardHeader>
            <CardTitle>{editingExpense ? "Edit Pengeluaran" : "Tambah Pengeluaran"}</CardTitle>
            <CardDescription>Input pengeluaran manual Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expenseAmount">Nominal (Rp)</Label>
                  <Input
                    id="expenseAmount"
                    type="number"
                    placeholder="100000"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expenseDate">Tanggal</Label>
                  <Input
                    id="expenseDate"
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="expenseDescription">Keterangan</Label>
                  <Input
                    id="expenseDescription"
                    type="text"
                    placeholder="Belanja bulanan"
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="w-full md:w-auto">
                  {editingExpense ? "Perbarui Pengeluaran" : "Tambah Pengeluaran"}
                </Button>
                {editingExpense && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingExpense(null);
                      setExpenseAmount("");
                      setExpenseDescription("");
                      setExpenseDate(new Date().toISOString().split('T')[0]);
                    }}
                  >
                    Batal
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Expenses Table */}
      {activeTarget && manualExpenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Pengeluaran</CardTitle>
            <CardDescription>Riwayat pengeluaran manual Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manualExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatIndonesianDate(expense.expense_date)}</TableCell>
                    <TableCell>{expense.description || "-"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(expense.amount))}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditExpense(expense)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={2} className="font-bold">Total Pengeluaran</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totalExpenses)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!activeTarget && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Belum ada target pengeluaran aktif. Buat target baru untuk memulai.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
