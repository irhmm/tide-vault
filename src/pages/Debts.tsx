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
import { CreditCard, Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
import ExportButton from '@/components/ExportButton';

interface Debt {
  id: string;
  creditor_name: string;
  amount: number;
  description: string | null;
  due_date: string | null;
  status: 'paid' | 'unpaid' | 'partial';
  created_at: string;
}

const Debts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    creditor_name: '',
    amount: '',
    description: '',
    due_date: '',
    status: 'unpaid' as 'paid' | 'unpaid' | 'partial',
  });

  useEffect(() => {
    if (user) {
      fetchDebts();
    }
  }, [user]);

  const fetchDebts = async () => {
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDebts((data as Debt[]) || []);
    } catch (error) {
      console.error('Error fetching debts:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data hutang",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.creditor_name || !formData.amount) {
      toast({
        title: "Error",
        description: "Nama kreditor dan jumlah wajib diisi",
        variant: "destructive"
      });
      return;
    }

    try {
      const debtData = {
        creditor_name: formData.creditor_name,
        amount: parseFloat(formData.amount),
        description: formData.description || null,
        due_date: formData.due_date || null,
        status: formData.status,
        user_id: user?.id,
      };

      if (editingDebt) {
        const { error } = await supabase
          .from('debts')
          .update(debtData)
          .eq('id', editingDebt.id);

        if (error) throw error;
        
        toast({
          title: "Berhasil",
          description: "Data hutang berhasil diperbarui",
        });
      } else {
        const { error } = await supabase
          .from('debts')
          .insert([debtData]);

        if (error) throw error;
        
        toast({
          title: "Berhasil",
          description: "Data hutang berhasil ditambahkan",
        });
      }

      setDialogOpen(false);
      setEditingDebt(null);
      resetForm();
      fetchDebts();
    } catch (error) {
      console.error('Error saving debt:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data hutang",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setFormData({
      creditor_name: debt.creditor_name,
      amount: debt.amount.toString(),
      description: debt.description || '',
      due_date: debt.due_date || '',
      status: debt.status,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data hutang ini?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Berhasil",
        description: "Data hutang berhasil dihapus",
      });
      
      fetchDebts();
    } catch (error) {
      console.error('Error deleting debt:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus data hutang",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      creditor_name: '',
      amount: '',
      description: '',
      due_date: '',
      status: 'unpaid' as 'paid' | 'unpaid' | 'partial',
    });
  };

  const openAddDialog = () => {
    resetForm();
    setEditingDebt(null);
    setDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success text-success-foreground">Lunas</Badge>;
      case 'partial':
        return <Badge className="bg-warning text-warning-foreground">Sebagian</Badge>;
      default:
        return <Badge variant="destructive">Belum Lunas</Badge>;
    }
  };

  const filteredDebts = debts.filter(debt => {
    const matchesSearch = debt.creditor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         debt.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || debt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = filteredDebts.reduce((sum, debt) => 
    debt.status !== 'paid' ? sum + debt.amount : sum, 0);

  const exportData = filteredDebts.map(debt => ({
    'Nama Kreditor': debt.creditor_name,
    'Jumlah': debt.amount,
    'Status': debt.status === 'paid' ? 'Lunas' : debt.status === 'partial' ? 'Sebagian' : 'Belum Lunas',
    'Jatuh Tempo': debt.due_date || '-',
    'Keterangan': debt.description || '-',
    'Tanggal Dibuat': new Date(debt.created_at).toLocaleDateString('id-ID'),
  }));

  if (loading) {
    return (
      <div className="fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Catatan Hutang</h1>
          <p className="text-muted-foreground">Kelola catatan hutang Anda</p>
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
        <h1 className="text-3xl font-bold mb-2">Catatan Hutang</h1>
        <p className="text-muted-foreground">Kelola dan pantau hutang Anda</p>
      </div>

      {/* Summary Card */}
      <Card className="financial-card mb-6">
        <CardHeader className="financial-card-header">
          <CardTitle className="flex items-center">
            <CreditCard className="w-6 h-6 mr-2 text-destructive" />
            Total Hutang Belum Lunas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="financial-amount text-destructive">
            {formatCurrency(totalAmount)}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {filteredDebts.filter(d => d.status !== 'paid').length} hutang aktif
          </p>
        </CardContent>
      </Card>

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cari kreditor atau keterangan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="unpaid">Belum Lunas</SelectItem>
              <SelectItem value="partial">Sebagian</SelectItem>
              <SelectItem value="paid">Lunas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            data={exportData} 
            filename="catatan_hutang"
            disabled={filteredDebts.length === 0}
          />
          <Button onClick={openAddDialog} className="btn-hover-scale">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Hutang
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="financial-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kreditor</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDebts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Tidak ada data yang sesuai dengan filter' 
                        : 'Belum ada data hutang. Tambah data pertama Anda!'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDebts.map((debt) => (
                    <TableRow key={debt.id} className="table-row-hover">
                      <TableCell className="font-medium">{debt.creditor_name}</TableCell>
                      <TableCell>{formatCurrency(debt.amount)}</TableCell>
                      <TableCell>{getStatusBadge(debt.status)}</TableCell>
                      <TableCell>
                        {debt.due_date 
                          ? new Date(debt.due_date).toLocaleDateString('id-ID')
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {debt.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(debt)}
                            className="btn-hover-scale"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(debt.id)}
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
              {editingDebt ? 'Edit Hutang' : 'Tambah Hutang Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingDebt 
                ? 'Perbarui informasi hutang Anda'
                : 'Masukkan detail hutang yang akan dicatat'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="creditor_name">Nama Kreditor*</Label>
              <Input
                id="creditor_name"
                placeholder="Contoh: Bank ABC, Teman, dll"
                value={formData.creditor_name}
                onChange={(e) => setFormData({...formData, creditor_name: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Jumlah Hutang*</Label>
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
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Belum Lunas</SelectItem>
                  <SelectItem value="partial">Sebagian</SelectItem>
                  <SelectItem value="paid">Lunas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Jatuh Tempo</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
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
                {editingDebt ? 'Perbarui' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Debts;