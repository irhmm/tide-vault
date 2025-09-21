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
import { PiggyBank, Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
import ExportButton from '@/components/ExportButton';

interface Saving {
  id: string;
  account_name: string;
  bank?: string;
  balance: number;
  account_type: 'savings' | 'checking' | 'investment' | 'other';
  description: string | null;
  created_at: string;
}

const Savings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savings, setSavings] = useState<Saving[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSaving, setEditingSaving] = useState<Saving | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    account_name: '',
    bank: '',
    balance: '',
    account_type: 'savings' as 'savings' | 'checking' | 'investment' | 'other',
    description: '',
  });

  const accountTypes = [
    { value: 'savings', label: 'Tabungan' },
    { value: 'checking', label: 'Giro' },
    { value: 'investment', label: 'Investasi' },
    { value: 'other', label: 'Lainnya' }
  ];

  useEffect(() => {
    if (user) {
      fetchSavings();
    }
  }, [user]);

  const fetchSavings = async () => {
    try {
      const { data, error } = await supabase
        .from('savings')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavings((data as Saving[]) || []);
    } catch (error) {
      console.error('Error fetching savings:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data tabungan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.account_name || !formData.balance) {
      toast({
        title: "Error",
        description: "Nama akun dan saldo wajib diisi",
        variant: "destructive"
      });
      return;
    }

    try {
      const savingData = {
        account_name: formData.account_name,
        bank: formData.bank || null,
        balance: parseFloat(formData.balance),
        account_type: formData.account_type,
        description: formData.description || null,
        user_id: user?.id,
      };

      if (editingSaving) {
        const { error } = await supabase
          .from('savings')
          .update(savingData)
          .eq('id', editingSaving.id);

        if (error) throw error;
        
        toast({
          title: "Berhasil",
          description: "Data tabungan berhasil diperbarui",
        });
      } else {
        const { error } = await supabase
          .from('savings')
          .insert([savingData]);

        if (error) throw error;
        
        toast({
          title: "Berhasil",
          description: "Data tabungan berhasil ditambahkan",
        });
      }

      setDialogOpen(false);
      setEditingSaving(null);
      resetForm();
      fetchSavings();
    } catch (error) {
      console.error('Error saving saving:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data tabungan",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (saving: Saving) => {
    setEditingSaving(saving);
    setFormData({
      account_name: saving.account_name,
      bank: saving.bank || '',
      balance: saving.balance.toString(),
      account_type: saving.account_type,
      description: saving.description || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data tabungan ini?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('savings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Berhasil",
        description: "Data tabungan berhasil dihapus",
      });
      
      fetchSavings();
    } catch (error) {
      console.error('Error deleting saving:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus data tabungan",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      account_name: '',
      bank: '',
      balance: '',
      account_type: 'savings',
      description: '',
    });
  };

  const openAddDialog = () => {
    resetForm();
    setEditingSaving(null);
    setDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeBadge = (type: string) => {
    const typeMap = {
      savings: { label: 'Tabungan', variant: 'default' as const },
      checking: { label: 'Giro', variant: 'secondary' as const },
      investment: { label: 'Investasi', variant: 'outline' as const },
      other: { label: 'Lainnya', variant: 'outline' as const }
    };
    
    const typeInfo = typeMap[type as keyof typeof typeMap] || typeMap.other;
    return <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>;
  };

  const filteredSavings = savings.filter(saving => {
    const matchesSearch = saving.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         saving.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || saving.account_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalBalance = filteredSavings.reduce((sum, saving) => sum + saving.balance, 0);

  const exportData = filteredSavings.map(saving => ({
    'Nama Akun': saving.account_name,
    'Bank': saving.bank || '-',
    'Jenis': accountTypes.find(t => t.value === saving.account_type)?.label || saving.account_type,
    'Saldo': saving.balance,
    'Keterangan': saving.description || '-',
    'Tanggal Dibuat': new Date(saving.created_at).toLocaleDateString('id-ID'),
  }));

  if (loading) {
    return (
      <div className="fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Tabungan</h1>
          <p className="text-muted-foreground">Kelola data tabungan Anda</p>
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
        <h1 className="text-3xl font-bold mb-2">Tabungan</h1>
        <p className="text-muted-foreground">Kelola dan pantau tabungan serta investasi Anda</p>
      </div>

      {/* Summary Card */}
      <Card className="summary-card mb-6 group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <CardHeader className="relative z-10 pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="icon-container mr-4">
                <PiggyBank className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Total Saldo Tabungan</h3>
                <p className="text-sm text-muted-foreground">Simpanan dan investasi Anda</p>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 pt-0">
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <p className="financial-amount gradient-text-primary">
                {formatCurrency(totalBalance)}
              </p>
              <div className="live-indicator">
                <div className="live-dot"></div>
                <span className="text-sm font-medium">Live</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary/20 rounded-full"></div>
                <span className="text-sm font-medium text-muted-foreground">
                  {filteredSavings.length} akun terdaftar
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Terakhir diperbarui</p>
                <p className="text-xs font-medium text-foreground">
                  {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cari nama akun atau keterangan..."
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
              {accountTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            data={exportData} 
            filename="data_tabungan"
            disabled={filteredSavings.length === 0}
          />
          <Button onClick={openAddDialog} className="btn-hover-scale">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Tabungan
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
                  <TableHead>Nama Akun</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSavings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm || typeFilter !== 'all' 
                        ? 'Tidak ada data yang sesuai dengan filter' 
                        : 'Belum ada data tabungan. Tambah data pertama Anda!'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSavings.map((saving) => (
                    <TableRow key={saving.id} className="table-row-hover">
                      <TableCell className="font-medium">{saving.account_name}</TableCell>
                      <TableCell className="font-medium">
                        {saving.bank || '-'}
                      </TableCell>
                      <TableCell>{getTypeBadge(saving.account_type)}</TableCell>
                      <TableCell>{formatCurrency(saving.balance)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {saving.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(saving)}
                            className="btn-hover-scale"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(saving.id)}
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

            <div className="space-y-2">
              <Label htmlFor="bank">Bank</Label>
              <Input
                id="bank"
                placeholder="Contoh: BCA, Mandiri, BNI, BRI"
                value={formData.bank}
                onChange={(e) => setFormData({...formData, bank: e.target.value})}
              />
            </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSaving ? 'Edit Tabungan' : 'Tambah Tabungan Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingSaving 
                ? 'Perbarui informasi tabungan Anda'
                : 'Masukkan detail tabungan yang akan dicatat'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account_name">Nama Akun*</Label>
              <Input
                id="account_name"
                placeholder="Contoh: BCA Tabungan, Mandiri Deposito, dll"
                value={formData.account_name}
                onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_type">Jenis Akun</Label>
              <Select value={formData.account_type} onValueChange={(value: any) => setFormData({...formData, account_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance">Saldo*</Label>
              <Input
                id="balance"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={formData.balance}
                onChange={(e) => setFormData({...formData, balance: e.target.value})}
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
                {editingSaving ? 'Perbarui' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Savings;