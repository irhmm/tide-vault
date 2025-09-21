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
import { formatIndonesianDate } from '@/lib/utils';

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
      const { data: transactions } = await supabase
        .from('financial_transactions')
        .select('type, amount')
        .eq('user_id', user?.id)
        .gte('transaction_date', `${currentMonth}-01`)
        .lt('transaction_date', `${currentMonth}-32`);

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
        transaction.type === 'income' ? sum + Number(transaction.amount) : sum, 0) || 0;
      
      const monthlyExpenses = transactions?.reduce((sum, transaction) => 
        transaction.type === 'expense' ? sum + Number(transaction.amount) : sum, 0) || 0;

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
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

      <div className="stats-grid mb-8">
        {/* Net Worth */}
        <Card className="summary-card col-span-1 md:col-span-2 group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="icon-container mr-4">
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Total Kekayaan Bersih</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats.netWorth >= 0 ? 'Posisi keuangan positif' : 'Perlu perhatian lebih'}
                  </p>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 pt-0">
            <p className={`financial-amount ${stats.netWorth >= 0 ? 'gradient-text-success' : 'gradient-text-destructive'}`}>
              {formatCurrency(stats.netWorth)}
            </p>
          </CardContent>
        </Card>

        {/* Total Assets */}
        <Card className="financial-card">
          <CardHeader className="financial-card-header">
            <CardTitle className="financial-label">Total Aset</CardTitle>
            <Wallet className="w-6 h-6 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="financial-amount text-primary">
              {formatCurrency(stats.totalAssets)}
            </p>
          </CardContent>
        </Card>

        {/* Total Savings */}
        <Card className="financial-card">
          <CardHeader className="financial-card-header">
            <CardTitle className="financial-label">Total Tabungan</CardTitle>
            <PiggyBank className="w-6 h-6 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="financial-amount text-primary">
              {formatCurrency(stats.totalSavings)}
            </p>
          </CardContent>
        </Card>

        {/* Total Debts */}
        <Card className="financial-card">
          <CardHeader className="financial-card-header">
            <CardTitle className="financial-label">Total Hutang</CardTitle>
            <CreditCard className="w-6 h-6 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="financial-amount text-destructive">
              {formatCurrency(stats.totalDebts)}
            </p>
          </CardContent>
        </Card>

        {/* Total Receivables */}
        <Card className="financial-card">
          <CardHeader className="financial-card-header">
            <CardTitle className="financial-label">Total Piutang</CardTitle>
            <CreditCard className="w-6 h-6 text-success" />
          </CardHeader>
          <CardContent>
            <p className="financial-amount text-success">
              {formatCurrency(stats.totalReceivables)}
            </p>
          </CardContent>
        </Card>

        {/* Monthly Income */}
        <Card className="financial-card">
          <CardHeader className="financial-card-header">
            <CardTitle className="financial-label">Pemasukan Bulan Ini</CardTitle>
            <TrendingUp className="w-6 h-6 text-success" />
          </CardHeader>
          <CardContent>
            <p className="financial-amount text-success">
              {formatCurrency(stats.monthlyIncome)}
            </p>
          </CardContent>
        </Card>

        {/* Monthly Expenses */}
        <Card className="financial-card">
          <CardHeader className="financial-card-header">
            <CardTitle className="financial-label">Pengeluaran Bulan Ini</CardTitle>
            <TrendingDown className="w-6 h-6 text-warning" />
          </CardHeader>
          <CardContent>
            <p className="financial-amount text-warning">
              {formatCurrency(stats.monthlyExpenses)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="table-container">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-primary" />
              Cashflow Bulan Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pemasukan:</span>
                <span className="font-medium text-success">
                  {formatCurrency(stats.monthlyIncome)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pengeluaran:</span>
                <span className="font-medium text-warning">
                  {formatCurrency(stats.monthlyExpenses)}
                </span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="font-medium">Sisa:</span>
                  <span className={`font-bold ${
                    (stats.monthlyIncome - stats.monthlyExpenses) >= 0 
                      ? 'text-success' 
                      : 'text-destructive'
                  }`}>
                    {formatCurrency(stats.monthlyIncome - stats.monthlyExpenses)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="table-container">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-primary" />
              Tips Keuangan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {stats.netWorth < 0 && (
                <p className="text-destructive">
                  💡 Fokus melunasi hutang untuk meningkatkan kekayaan bersih
                </p>
              )}
              {stats.monthlyExpenses > stats.monthlyIncome && (
                <p className="text-warning">
                  ⚠️ Pengeluaran melebihi pemasukan bulan ini
                </p>
              )}
              {stats.totalSavings < stats.monthlyExpenses * 3 && (
                <p className="text-primary">
                  💰 Pertimbangkan menabung untuk dana darurat 3-6 bulan
                </p>
              )}
              {stats.netWorth >= 0 && stats.monthlyIncome > stats.monthlyExpenses && (
                <p className="text-success">
                  ✅ Keuangan Anda dalam kondisi baik!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;