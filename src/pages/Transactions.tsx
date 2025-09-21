import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Plus, Pencil, Trash2, Search, Filter, Calendar } from 'lucide-react';
import { formatIndonesianDate, formatCurrency } from '@/lib/utils';
import ExportButton from '@/components/ExportButton';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string | null;
  transaction_date: string;
  created_at: string;
}

const Transactions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    category: '',
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
  });

  const incomeCategories = [
    'Gaji',
    'Bonus',
    'Freelance',
    'Bisnis',
    'Investasi',
    'Hadiah',
    'Lainnya'
  ];

  const expenseCategories = [
    'Makanan',
    'Transportasi',
    'Belanja',
    'Tagihan',
    'Kesehatan',
    'Hiburan',
    'Pendidikan',
    'Investasi',
    'Lainnya'
  ];

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, monthFilter]);

  const fetchTransactions = async () => {
    try {
      let query = supabase
        .from('financial_transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('transaction_date', { ascending: false });

      if (monthFilter) {
        query = query
          .gte('transaction_date', `${monthFilter}-01`)
          .lt('transaction_date', `${monthFilter}-32`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions((data as Transaction[]) || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data transaksi",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.category || !formData.amount) {
      toast({
        title: "Error",
        description: "Jenis, kategori, dan jumlah transaksi wajib diisi",
        variant: "destructive"
      });
      return;
    }

    try {
      const transactionData = {
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description || null,
        transaction_date: formData.transaction_date,
        user_id: user?.id,
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from('financial_transactions')
          .update(transactionData)
          .eq('id', editingTransaction.id);

        if (error) throw error;
        
        toast({
          title: "Berhasil",
          description: "Data transaksi berhasil diperbarui",
        });
      } else {
        const { error } = await supabase
          .from('financial_transactions')
          .insert([transactionData]);

        if (error) throw error;
        
        toast({
          title: "Berhasil",
          description: "Data transaksi berhasil ditambahkan",
        });
      }

      setDialogOpen(false);
      setEditingTransaction(null);
      resetForm();
      fetchTransactions();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data transaksi",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount.toString(),
      description: transaction.description || '',
      transaction_date: transaction.transaction_date,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data transaksi ini?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Berhasil",
        description: "Data transaksi berhasil dihapus",
      });
      
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus data transaksi",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'income',
      category: '',
      amount: '',
      description: '',
      transaction_date: new Date().toISOString().split('T')[0],
    });
  };

  const openAddDialog = () => {
    resetForm();
    setEditingTransaction(null);
    setDialogOpen(true);
  };


  const getTypeBadge = (type: string) => {
    return type === 'income' 
      ? <Badge className="bg-success text-success-foreground">Pemasukan</Badge>
      : <Badge className="bg-warning text-warning-foreground">Pengeluaran</Badge>;
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const exportData = filteredTransactions.map(transaction => ({
    'Tanggal': formatIndonesianDate(transaction.transaction_date),
    'Jenis': transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    'Kategori': transaction.category,
    'Jumlah': transaction.amount,
    'Keterangan': transaction.description || '-',
  }));

  const currentMonthName = new Date(monthFilter + '-01').toLocaleDateString('id-ID', { 
    month: 'long', 
    year: 'numeric' 
  });

  if (loading) {
    return (
      <div className="fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Transaksi Keuangan</h1>
          <p className="text-muted-foreground">Kelola pemasukan dan pengeluaran Anda</p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Transaksi Keuangan</h1>
        <p className="text-muted-foreground">Catat dan pantau pemasukan serta pengeluaran Anda</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="summary-card group">
          <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="icon-container-success mr-3">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Total Pemasukan</h3>
                  <p className="text-xs text-muted-foreground">{currentMonthName}</p>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 pt-0">
            <p className="text-2xl font-black gradient-text-success">
              {formatCurrency(totalIncome)}
            </p>
          </CardContent>
        </Card>

        <Card className="summary-card group">
          <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="icon-container-warning mr-3">
                  <TrendingDown className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Total Pengeluaran</h3>
                  <p className="text-xs text-muted-foreground">{currentMonthName}</p>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 pt-0">
            <p className="text-2xl font-black bg-gradient-to-r from-warning to-warning/80 bg-clip-text text-transparent">
              {formatCurrency(totalExpense)}
            </p>
          </CardContent>
        </Card>

        <Card className="summary-card group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="icon-container mr-3">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Saldo Bersih</h3>
                  <p className="text-xs text-muted-foreground">{currentMonthName}</p>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 pt-0">
            <p className={`text-2xl font-black ${
              (totalIncome - totalExpense) >= 0 ? 'gradient-text-success' : 'gradient-text-destructive'
            }`}>
              {formatCurrency(totalIncome - totalExpense)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cari kategori atau keterangan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis</SelectItem>
              <SelectItem value="income">Pemasukan</SelectItem>
              <SelectItem value="expense">Pengeluaran</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex gap-2">
          <ExportButton 
            data={exportData} 
            filename="transaksi_keuangan"
            disabled={filteredTransactions.length === 0}
          />
          <Button onClick={openAddDialog} className="btn-hover-scale">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Transaksi
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="table-container">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm || typeFilter !== 'all' 
                        ? 'Tidak ada data yang sesuai dengan filter' 
                        : 'Belum ada data transaksi. Tambah data pertama Anda!'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="table-row-hover">
                      <TableCell>
                        {formatIndonesianDate(transaction.transaction_date)}
                      </TableCell>
                      <TableCell>{getTypeBadge(transaction.type)}</TableCell>
                      <TableCell className="font-medium">{transaction.category}</TableCell>
                      <TableCell className={
                        transaction.type === 'income' ? 'text-success' : 'text-warning'
                      }>
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {transaction.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(transaction)}
                            className="btn-hover-scale"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(transaction.id)}
                            className="btn-hover-scale text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingTransaction 
                ? 'Perbarui informasi transaksi Anda'
                : 'Masukkan detail transaksi yang akan dicatat'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Jenis Transaksi*</Label>
              <Select value={formData.type} onValueChange={(value: any) => setFormData({...formData, type: value, category: ''})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Pemasukan</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategori*</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {(formData.type === 'income' ? incomeCategories : expenseCategories).map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Jumlah*</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction_date">Tanggal Transaksi*</Label>
              <Input
                id="transaction_date"
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({...formData, transaction_date: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Keterangan</Label>
              <Textarea
                id="description"
                placeholder="Tambahkan keterangan atau catatan..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" className="btn-hover-scale">
                {editingTransaction ? 'Perbarui' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transactions;