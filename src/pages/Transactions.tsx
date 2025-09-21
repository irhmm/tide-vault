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
import { formatIndonesianDateTime, formatCurrency } from '@/lib/utils';
import ExportButton from '@/components/ExportButton';

interface Transaction {
  id: string;
  jenis: 'pemasukan' | 'pengeluaran';
  keterangan: string | null;
  jumlah: number;
  tanggal: string;
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
    jenis: 'pemasukan' as 'pemasukan' | 'pengeluaran',
    keterangan: '',
    jumlah: '',
  });

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, monthFilter]);

  const fetchTransactions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('financial_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('tanggal', { ascending: false });

      if (monthFilter) {
        // Create proper date range for the selected month
        const year = parseInt(monthFilter.split('-')[0]);
        const month = parseInt(monthFilter.split('-')[1]);
        
        // Start of month
        const startDate = new Date(year, month - 1, 1);
        // Start of next month (end of current month)
        const endDate = new Date(year, month, 1);
        
        query = query
          .gte('tanggal', startDate.toISOString())
          .lt('tanggal', endDate.toISOString());
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
    
    if (!formData.jenis || !formData.jumlah) {
      toast({
        title: "Error",
        description: "Jenis dan jumlah transaksi wajib diisi",
        variant: "destructive"
      });
      return;
    }

    try {
      const transactionData = {
        jenis: formData.jenis,
        keterangan: formData.keterangan || null,
        jumlah: parseFloat(formData.jumlah),
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
      jenis: transaction.jenis,
      keterangan: transaction.keterangan || '',
      jumlah: transaction.jumlah.toString(),
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
      jenis: 'pemasukan',
      keterangan: '',
      jumlah: '',
    });
  };

  const openAddDialog = () => {
    resetForm();
    setEditingTransaction(null);
    setDialogOpen(true);
  };

  const getTypeBadge = (jenis: string) => {
    return jenis === 'pemasukan' 
      ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">Pemasukan</Badge>
      : <Badge className="bg-red-100 text-red-700 border-red-300">Pengeluaran</Badge>;
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.keterangan?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || transaction.jenis === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalIncome = filteredTransactions
    .filter(t => t.jenis === 'pemasukan')
    .reduce((sum, t) => sum + t.jumlah, 0);
  
  const totalExpense = filteredTransactions
    .filter(t => t.jenis === 'pengeluaran')
    .reduce((sum, t) => sum + t.jumlah, 0);

  const exportData = filteredTransactions.map(transaction => ({
    'Tanggal': formatIndonesianDateTime(transaction.tanggal),
    'Jenis': transaction.jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
    'Keterangan': transaction.keterangan || '-',
    'Jumlah': transaction.jumlah,
  }));

  const currentMonthName = new Date(monthFilter + '-01').toLocaleDateString('id-ID', { 
    month: 'long', 
    year: 'numeric' 
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Keuangan</h1>
            <p className="text-gray-600">Kelola pemasukan dan pengeluaran Anda</p>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Keuangan</h1>
          <p className="text-gray-600">Catat dan pantau pemasukan serta pengeluaran Anda</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white shadow-lg border-0 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-1">
              <div className="bg-white rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Pemasukan</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(totalIncome)}
                    </p>
                    <p className="text-xs text-gray-500">{currentMonthName}</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white shadow-lg border-0 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-1">
              <div className="bg-white rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Pengeluaran</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(totalExpense)}
                    </p>
                    <p className="text-xs text-gray-500">{currentMonthName}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white shadow-lg border-0 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-1">
              <div className="bg-white rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Saldo Bersih</p>
                    <p className={`text-2xl font-bold ${
                      (totalIncome - totalExpense) >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(totalIncome - totalExpense)}
                    </p>
                    <p className="text-xs text-gray-500">{currentMonthName}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Cari keterangan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40 border-gray-300 shadow-sm">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="pemasukan">Pemasukan</SelectItem>
                <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-40 border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <ExportButton 
              data={exportData} 
              filename="transaksi_keuangan"
              disabled={filteredTransactions.length === 0}
            />
            <Button 
              onClick={openAddDialog} 
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Transaksi
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card className="bg-white shadow-lg border-0 rounded-xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700">Tanggal</TableHead>
                    <TableHead className="font-semibold text-gray-700">Jenis</TableHead>
                    <TableHead className="font-semibold text-gray-700">Keterangan</TableHead>
                    <TableHead className="font-semibold text-gray-700">Jumlah</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        {searchTerm || typeFilter !== 'all' 
                          ? 'Tidak ada data yang sesuai dengan filter' 
                          : 'Belum ada data transaksi. Tambah data pertama Anda!'
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id} className="hover:bg-gray-50">
                        <TableCell className="text-gray-900">
                          {formatIndonesianDateTime(transaction.tanggal)}
                        </TableCell>
                        <TableCell>{getTypeBadge(transaction.jenis)}</TableCell>
                        <TableCell className="font-medium text-gray-900 max-w-xs truncate">
                          {transaction.keterangan || '-'}
                        </TableCell>
                        <TableCell className={`font-semibold ${
                          transaction.jenis === 'pemasukan' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(transaction.jumlah)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(transaction)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(transaction.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
          <DialogContent className="sm:max-w-md bg-white shadow-xl border-0 rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {editingTransaction 
                  ? 'Perbarui informasi transaksi Anda'
                  : 'Masukkan detail transaksi yang akan dicatat'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jenis" className="text-sm font-medium text-gray-700">
                  Jenis Transaksi *
                </Label>
                <Select value={formData.jenis} onValueChange={(value: any) => setFormData({...formData, jenis: value})}>
                  <SelectTrigger className="border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pemasukan">Pemasukan</SelectItem>
                    <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keterangan" className="text-sm font-medium text-gray-700">
                  Keterangan
                </Label>
                <Textarea
                  id="keterangan"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                  placeholder="Masukkan keterangan transaksi..."
                  className="border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jumlah" className="text-sm font-medium text-gray-700">
                  Jumlah *
                </Label>
                <Input
                  id="jumlah"
                  type="number"
                  value={formData.jumlah}
                  onChange={(e) => setFormData({...formData, jumlah: e.target.value})}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                  className="border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </Button>
                <Button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  {editingTransaction ? 'Perbarui' : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Transactions;