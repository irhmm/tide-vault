import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  CreditCard, 
  Wallet, 
  PiggyBank, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar
} from 'lucide-react';
import { formatIndonesianDate, formatCurrency } from '@/lib/utils';

interface DashboardStats {
  totalDebts: number;
  totalReceivables: number;
  totalAssets: number;
  totalSavings: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netWorth: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalDebts: 0,
    totalReceivables: 0,
    totalAssets: 0,
    totalSavings: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    netWorth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

      // Fetch debts and receivables
      const { data: debts } = await supabase
        .from('debts')
        .select('amount, status, debt_type')
        .eq('user_id', user?.id);

      // Fetch assets
      const { data: assets } = await supabase
        .from('assets')
        .select('value')
        .eq('user_id', user?.id);

      // Fetch savings
      const { data: savings } = await supabase
        .from('savings')
        .select('balance')
        .eq('user_id', user?.id);

      // Fetch transactions for current month
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      
      const { data: transactions } = await supabase
        .from('financial_transactions')
        .select('jenis, jumlah')
        .eq('user_id', user?.id)
        .gte('tanggal', startDate.toISOString())
        .lt('tanggal', endDate.toISOString());

      // Calculate totals
      const totalDebts = debts?.reduce((sum, debt) => 
        debt.debt_type === 'debt' && debt.status !== 'paid' ? sum + Number(debt.amount) : sum, 0) || 0;
      
      const totalReceivables = debts?.reduce((sum, debt) => 
        debt.debt_type === 'receivable' && debt.status !== 'paid' ? sum + Number(debt.amount) : sum, 0) || 0;
      
      const totalAssets = assets?.reduce((sum, asset) => 
        sum + Number(asset.value), 0) || 0;
      
      const totalSavings = savings?.reduce((sum, saving) => 
        sum + Number(saving.balance), 0) || 0;

      const monthlyIncome = transactions?.reduce((sum, transaction) => 
        transaction.jenis === 'pemasukan' ? sum + Number(transaction.jumlah) : sum, 0) || 0;
      
      const monthlyExpenses = transactions?.reduce((sum, transaction) => 
        transaction.jenis === 'pengeluaran' ? sum + Number(transaction.jumlah) : sum, 0) || 0;

      const netWorth = totalAssets + totalSavings + totalReceivables - totalDebts;

      setStats({
        totalDebts,
        totalReceivables,
        totalAssets,
        totalSavings,
        monthlyIncome,
        monthlyExpenses,
        netWorth,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Ringkasan keuangan Anda</p>
        </div>
        <div className="stats-grid">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="financial-card">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const currentMonth = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className="fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Selamat datang, {user?.user_metadata?.full_name || user?.email}! 👋
        </h1>
        <p className="text-muted-foreground">
          Berikut adalah ringkasan keuangan Anda untuk {currentMonth}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Net Worth - Simplified */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-4 bg-gradient-to-r from-background to-muted/20 border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Kekayaan Bersih</p>
                <p className={`text-3xl font-bold ${stats.netWorth >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(stats.netWorth)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Assets */}
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Aset</p>
              <p className="text-2xl font-semibold text-blue-500">
                {formatCurrency(stats.totalAssets)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Savings */}
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-green-500" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Tabungan</p>
              <p className="text-2xl font-semibold text-green-500">
                {formatCurrency(stats.totalSavings)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Debts */}
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-red-500" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Hutang</p>
              <p className="text-2xl font-semibold text-red-500">
                {formatCurrency(stats.totalDebts)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Receivables */}
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Piutang</p>
              <p className="text-2xl font-semibold text-emerald-500">
                {formatCurrency(stats.totalReceivables)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Income */}
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-teal-500" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Pemasukan Bulan Ini</p>
              <p className="text-2xl font-semibold text-teal-500">
                {formatCurrency(stats.monthlyIncome)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Expenses */}
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-orange-500" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Pengeluaran Bulan Ini</p>
              <p className="text-2xl font-semibold text-orange-500">
                {formatCurrency(stats.monthlyExpenses)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Insights - Simplified */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-semibold">Cashflow Bulan Ini</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pemasukan</span>
                <span className="font-medium text-teal-500">
                  {formatCurrency(stats.monthlyIncome)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pengeluaran</span>
                <span className="font-medium text-orange-500">
                  {formatCurrency(stats.monthlyExpenses)}
                </span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Sisa</span>
                  <span className={`font-bold ${
                    (stats.monthlyIncome - stats.monthlyExpenses) >= 0 
                      ? 'text-teal-500' 
                      : 'text-red-500'
                  }`}>
                    {formatCurrency(stats.monthlyIncome - stats.monthlyExpenses)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mr-3">
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <h3 className="font-semibold">Tips Keuangan</h3>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              {stats.netWorth < 0 && (
                <p>• Fokus untuk mengurangi hutang dan meningkatkan aset</p>
              )}
              {stats.monthlyExpenses > stats.monthlyIncome && (
                <p>• Pengeluaran melebihi pemasukan, perlu dikontrol</p>
              )}
              {stats.totalSavings < stats.monthlyIncome * 3 && (
                <p>• Disarankan memiliki tabungan setara 3-6 bulan pengeluaran</p>
              )}
              {stats.monthlyIncome > stats.monthlyExpenses && stats.netWorth > 0 && (
                <p>• Kondisi keuangan baik, pertimbangkan investasi jangka panjang</p>
              )}
              {stats.totalSavings >= stats.monthlyIncome * 6 && (
                <p>• Tabungan sudah cukup, saatnya diversifikasi ke investasi</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;