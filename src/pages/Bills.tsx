import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { formatIndonesianDate, formatCurrency } from '@/lib/utils';
import {
  Receipt,
  Plus,
  Filter,
  Calendar,
  CreditCard,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
} from 'lucide-react';

interface Bill {
  id: string;
  bill_name: string;
  payer_name: string;
  destination_account: string | null;
  amount: number;
  due_date: string;
  category: 'my_bills' | 'others_bills_to_me';
  status: 'active' | 'inactive';
  created_at: string;
}

const Bills = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    period: 'all',
  });

  // Form state
  const [formData, setFormData] = useState({
    bill_name: '',
    payer_name: '',
    destination_account: '',
    amount: '',
    due_date: '',
    category: 'my_bills' as 'my_bills' | 'others_bills_to_me',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    if (user) {
      fetchBills();
    }
  }, [user]);

  const fetchBills = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setBills((data as Bill[]) || []);
    } catch (error) {
      console.error('Error fetching bills:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data tagihan',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const billData = {
        ...formData,
        amount: parseFloat(formData.amount),
        user_id: user.id,
      };

      if (editingBill) {
        const { error } = await supabase
          .from('bills')
          .update(billData)
          .eq('id', editingBill.id);

        if (error) throw error;
        toast({
          title: 'Berhasil',
          description: 'Tagihan berhasil diperbarui',
        });
      } else {
        const { error } = await supabase
          .from('bills')
          .insert([billData]);

        if (error) throw error;
        toast({
          title: 'Berhasil',
          description: 'Tagihan berhasil ditambahkan',
        });
      }

      setIsDialogOpen(false);
      setEditingBill(null);
      resetForm();
      fetchBills();
    } catch (error) {
      console.error('Error saving bill:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyimpan tagihan',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tagihan ini?')) return;

    try {
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: 'Berhasil',
        description: 'Tagihan berhasil dihapus',
      });
      fetchBills();
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast({
        title: 'Error',
        description: 'Gagal menghapus tagihan',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      bill_name: '',
      payer_name: '',
      destination_account: '',
      amount: '',
      due_date: '',
      category: 'my_bills',
      status: 'active',
    });
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      const billions = amount / 1000000000;
      return `Rp ${billions % 1 === 0 ? billions.toFixed(0) : billions.toFixed(1)} M`;
    } else if (amount >= 1000000) {
      const millions = amount / 1000000;
      return `Rp ${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)} Jt`;
    } else {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }
  };

  const getDueDateStatus = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays <= 7) return 'due-soon';
    return 'safe';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'text-red-600 bg-red-50';
      case 'due-soon': return 'text-yellow-600 bg-yellow-50';
      case 'safe': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue': return <AlertCircle className="h-4 w-4" />;
      case 'due-soon': return <Clock className="h-4 w-4" />;
      case 'safe': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredBills = bills.filter((bill) => {
    if (filters.category !== 'all' && bill.category !== filters.category) return false;
    if (filters.status !== 'all' && bill.status !== filters.status) return false;
    
    if (filters.period !== 'all') {
      const today = new Date();
      const dueDate = new Date(bill.due_date);
      
      switch (filters.period) {
        case 'this-week':
          const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          return dueDate >= today && dueDate <= weekFromNow;
        case 'this-month':
          return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
        case 'this-year':
          return dueDate.getFullYear() === today.getFullYear();
        default:
          return true;
      }
    }
    
    return true;
  });

  const getFilteredTotal = () => {
    return filteredBills.reduce((sum, bill) => sum + bill.amount, 0);
  };

  const getSummaryData = () => {
    const activeBills = bills.filter(bill => bill.status === 'active');
    const myBills = activeBills.filter(bill => bill.category === 'my_bills');
    const othersBills = activeBills.filter(bill => bill.category === 'others_bills_to_me');
    
    const today = new Date();
    const thisWeekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueSoon = activeBills.filter(bill => {
      const dueDate = new Date(bill.due_date);
      return dueDate >= today && dueDate <= thisWeekEnd;
    });

    return {
      totalActive: activeBills.length,
      totalMyBills: myBills.reduce((sum, bill) => sum + bill.amount, 0),
      totalOthersBills: othersBills.reduce((sum, bill) => sum + bill.amount, 0),
      dueSoonCount: dueSoon.length,
    };
  };

  const summaryData = getSummaryData();

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Silakan login untuk mengakses halaman tagihan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Receipt className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Catatan Tagihan</h1>
            <p className="text-muted-foreground">Kelola semua tagihan dan pembayaran Anda</p>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingBill(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Tagihan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingBill ? 'Edit Tagihan' : 'Tambah Tagihan Baru'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bill_name">Nama Tagihan</Label>
                  <Input
                    id="bill_name"
                    value={formData.bill_name}
                    onChange={(e) => setFormData({ ...formData, bill_name: e.target.value })}
                    placeholder="Listrik PLN"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payer_name">Nama Pembayar</Label>
                  <Input
                    id="payer_name"
                    value={formData.payer_name}
                    onChange={(e) => setFormData({ ...formData, payer_name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="destination_account">Rekening Tujuan</Label>
                <Input
                  id="destination_account"
                  value={formData.destination_account}
                  onChange={(e) => setFormData({ ...formData, destination_account: e.target.value })}
                  placeholder="Bank BCA - 1234567890"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Nominal</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="100000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Jatuh Tempo</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: 'my_bills' | 'others_bills_to_me') => 
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="my_bills">Tagihan Saya</SelectItem>
                      <SelectItem value="others_bills_to_me">Tagihan Orang Lain ke Saya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'active' | 'inactive') => 
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="inactive">Non Aktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit">
                  {editingBill ? 'Perbarui' : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Tagihan Aktif</p>
                <p className="text-2xl font-bold text-blue-900">{summaryData.totalActive}</p>
              </div>
              <Receipt className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Tagihan Orang Lain</p>
                <p className="text-lg font-bold text-green-900">{formatCurrency(summaryData.totalOthersBills)}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Tagihan Saya</p>
                <p className="text-lg font-bold text-purple-900">{formatCurrency(summaryData.totalMyBills)}</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Jatuh Tempo Minggu Ini</p>
                <p className="text-2xl font-bold text-orange-900">{summaryData.dueSoonCount}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    <SelectItem value="my_bills">Tagihan Saya</SelectItem>
                    <SelectItem value="others_bills_to_me">Tagihan Orang Lain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Non Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Periode</Label>
                <Select value={filters.period} onValueChange={(value) => setFilters({ ...filters, period: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Periode</SelectItem>
                    <SelectItem value="this-week">Minggu Ini</SelectItem>
                    <SelectItem value="this-month">Bulan Ini</SelectItem>
                    <SelectItem value="this-year">Tahun Ini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Berdasarkan Filter</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(getFilteredTotal())}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Tagihan</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Memuat data...</p>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada tagihan yang sesuai dengan filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Tagihan</TableHead>
                    <TableHead>Pembayar</TableHead>
                    <TableHead>Rekening Tujuan</TableHead>
                    <TableHead>Nominal</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.map((bill) => {
                    const dueDateStatus = getDueDateStatus(bill.due_date);
                    return (
                      <TableRow 
                        key={bill.id} 
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="font-medium">{bill.bill_name}</TableCell>
                        <TableCell>{bill.payer_name}</TableCell>
                        <TableCell>{bill.destination_account || '-'}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(bill.amount)}</TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dueDateStatus)}`}>
                            {getStatusIcon(dueDateStatus)}
                            {formatIndonesianDate(bill.due_date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={bill.category === 'my_bills' ? 'default' : 'secondary'}>
                            {bill.category === 'my_bills' ? 'Tagihan Saya' : 'Tagihan Orang Lain'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={bill.status === 'active' ? 'default' : 'outline'}>
                            {bill.status === 'active' ? 'Aktif' : 'Non Aktif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingBill(bill);
                                setFormData({
                                  bill_name: bill.bill_name,
                                  payer_name: bill.payer_name,
                                  destination_account: bill.destination_account || '',
                                  amount: bill.amount.toString(),
                                  due_date: bill.due_date,
                                  category: bill.category,
                                  status: bill.status,
                                });
                                setIsDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(bill.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Bills;