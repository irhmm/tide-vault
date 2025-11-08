import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { formatIndonesianDate, formatCurrency } from '@/lib/utils';
import { GoogleCalendarConnection } from '@/components/GoogleCalendarConnection';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
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
  Repeat,
  Copy,
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
  recurrence_type: 'one_time' | 'monthly' | 'yearly' | 'custom';
  recurrence_day?: number;
  recurrence_month?: number;
  next_due_date?: string;
  is_template: boolean;
  sync_to_google_calendar?: boolean;
  google_calendar_event_id?: string;
}

const Bills = () => {
  const { user } = useAuth();
  const { isConnected, syncReminder } = useGoogleCalendar();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
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
    recurrence_type: 'one_time' as 'one_time' | 'monthly' | 'yearly' | 'custom',
    recurrence_day: '',
    recurrence_month: '',
    is_template: false,
    sync_to_google_calendar: false,
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

  const calculateNextDueDate = (dueDate: string, recurrenceType: string, recurrenceDay?: number, recurrenceMonth?: number): string | null => {
    if (recurrenceType === 'one_time') return null;
    
    const current = new Date(dueDate);
    if (recurrenceType === 'monthly' && recurrenceDay) {
      const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, recurrenceDay);
      return nextMonth.toISOString().split('T')[0];
    } else if (recurrenceType === 'yearly' && recurrenceDay && recurrenceMonth) {
      const nextYear = new Date(current.getFullYear() + 1, recurrenceMonth - 1, recurrenceDay);
      return nextYear.toISOString().split('T')[0];
    }
    return null;
  };

  const calculateInitialDueDate = (
    recurrenceType: string,
    day?: number,
    month?: number
  ): string => {
    const today = new Date();
    let initialDate: Date;

    if (recurrenceType === 'monthly' && day) {
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), day);
      if (thisMonth < today) {
        initialDate = new Date(today.getFullYear(), today.getMonth() + 1, day);
      } else {
        initialDate = thisMonth;
      }
    } else if (recurrenceType === 'yearly' && day && month) {
      const thisYear = new Date(today.getFullYear(), month - 1, day);
      if (thisYear < today) {
        initialDate = new Date(today.getFullYear() + 1, month - 1, day);
      } else {
        initialDate = thisYear;
      }
    } else {
      initialDate = today;
    }

    return initialDate.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const recurrenceDay = formData.recurrence_day ? parseInt(formData.recurrence_day) : null;
      const recurrenceMonth = formData.recurrence_month ? parseInt(formData.recurrence_month) : null;
      
      const billData = {
        bill_name: formData.bill_name,
        payer_name: formData.payer_name,
        destination_account: formData.destination_account,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        category: formData.category,
        status: formData.status,
        recurrence_type: formData.recurrence_type,
        recurrence_day: recurrenceDay,
        recurrence_month: recurrenceMonth,
        next_due_date: calculateNextDueDate(formData.due_date, formData.recurrence_type, recurrenceDay || undefined, recurrenceMonth || undefined),
        is_template: formData.is_template,
        user_id: user.id,
      };

      if (editingBill) {
        const { data: updatedBill, error } = await supabase
          .from('bills')
          .update(billData)
          .eq('id', editingBill.id)
          .select()
          .single();

        if (error) throw error;

        // Sync to Google Calendar if enabled
        if (formData.sync_to_google_calendar && isConnected) {
          try {
            await syncReminder('update', editingBill.id, undefined, updatedBill);
          } catch (syncError) {
            console.error('Failed to sync to Google Calendar:', syncError);
            toast({
              title: 'Berhasil diperbarui',
              description: 'Tagihan diperbarui, tapi gagal sync ke Google Calendar',
              variant: 'destructive',
            });
          }
        } else if (editingBill.google_calendar_event_id && !formData.sync_to_google_calendar) {
          // Remove from Google Calendar if sync was disabled
          try {
            await syncReminder('delete', editingBill.id, undefined, undefined);
          } catch (syncError) {
            console.error('Failed to remove from Google Calendar:', syncError);
          }
        }

        toast({
          title: 'Berhasil',
          description: 'Tagihan berhasil diperbarui',
        });
      } else {
        const { data: newBill, error } = await supabase
          .from('bills')
          .insert([billData])
          .select()
          .single();

        if (error) throw error;

        // Sync to Google Calendar if enabled
        if (formData.sync_to_google_calendar && isConnected) {
          try {
            await syncReminder('create', newBill.id, undefined, newBill);
          } catch (syncError) {
            console.error('Failed to sync to Google Calendar:', syncError);
            toast({
              title: 'Berhasil ditambahkan',
              description: 'Tagihan ditambahkan, tapi gagal sync ke Google Calendar',
              variant: 'destructive',
            });
          }
        }

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
      // Get bill data before deletion for Google Calendar sync
      const billToDelete = bills.find(bill => bill.id === id);

      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove from Google Calendar if it was synced
      if (billToDelete?.google_calendar_event_id && isConnected) {
        try {
          await syncReminder('delete', id, undefined, undefined);
        } catch (syncError) {
          console.error('Failed to remove from Google Calendar:', syncError);
        }
      }

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

  const handleMarkAsPaid = async (bill: Bill) => {
    if (!confirm(`Tandai "${bill.bill_name}" sebagai lunas?`)) return;

    try {
      if (bill.recurrence_type === 'one_time') {
        // TAGIHAN SEKALI BAYAR → HAPUS
        const { error } = await supabase
          .from('bills')
          .delete()
          .eq('id', bill.id);

        if (error) throw error;

        // Hapus dari Google Calendar jika di-sync
        if (bill.google_calendar_event_id && isConnected) {
          try {
            await syncReminder('delete', bill.id, undefined, undefined);
          } catch (syncError) {
            console.error('Failed to remove from Google Calendar:', syncError);
          }
        }

        toast({
          title: 'Berhasil',
          description: 'Tagihan telah ditandai lunas dan dihapus',
        });

      } else {
        // TAGIHAN BERULANG → BUAT ENTRI BARU DENGAN DUE DATE BERIKUTNYA
        
        // 1. Hapus tagihan lama
        const { error: deleteError } = await supabase
          .from('bills')
          .delete()
          .eq('id', bill.id);

        if (deleteError) throw deleteError;

        // 2. Hitung tanggal jatuh tempo berikutnya
        const nextDueDate = calculateNextDueDate(
          bill.due_date,
          bill.recurrence_type,
          bill.recurrence_day,
          bill.recurrence_month
        );

        if (!nextDueDate) {
          throw new Error('Gagal menghitung tanggal jatuh tempo berikutnya');
        }

        // 3. Buat tagihan baru dengan data yang sama tapi due_date baru
        const newBillData = {
          bill_name: bill.bill_name,
          payer_name: bill.payer_name,
          destination_account: bill.destination_account,
          amount: bill.amount,
          due_date: nextDueDate,
          category: bill.category,
          status: bill.status,
          recurrence_type: bill.recurrence_type,
          recurrence_day: bill.recurrence_day,
          recurrence_month: bill.recurrence_month,
          next_due_date: calculateNextDueDate(
            nextDueDate,
            bill.recurrence_type,
            bill.recurrence_day,
            bill.recurrence_month
          ),
          is_template: bill.is_template,
          sync_to_google_calendar: bill.sync_to_google_calendar,
          user_id: user!.id,
        };

        const { data: newBill, error: insertError } = await supabase
          .from('bills')
          .insert([newBillData])
          .select()
          .single();

        if (insertError) throw insertError;

        // 4. Sync ke Google Calendar jika diperlukan
        if (bill.sync_to_google_calendar && isConnected) {
          try {
            // Hapus event lama jika ada
            if (bill.google_calendar_event_id) {
              await syncReminder('delete', bill.id, undefined, undefined);
            }
            
            // Buat event baru
            await syncReminder('create', newBill.id, undefined, newBill);
          } catch (syncError) {
            console.error('Failed to sync to Google Calendar:', syncError);
          }
        }

        toast({
          title: 'Berhasil',
          description: `Tagihan lunas! Tagihan berikutnya: ${formatIndonesianDate(nextDueDate)}`,
        });
      }

      fetchBills();
    } catch (error) {
      console.error('Error marking bill as paid:', error);
      toast({
        title: 'Error',
        description: 'Gagal menandai tagihan sebagai lunas',
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
      recurrence_type: 'one_time',
      recurrence_day: '',
      recurrence_month: '',
      is_template: false,
      sync_to_google_calendar: false,
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
        {/* Google Calendar Integration */}
        <GoogleCalendarConnection className="mb-6" />
        
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

              {/* Recurring Settings */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-medium">Pengaturan Berulang</Label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="recurrence_type">Jenis Pengulangan</Label>
                  <Select
                    value={formData.recurrence_type}
                    onValueChange={(value: 'one_time' | 'monthly' | 'yearly' | 'custom') => 
                      setFormData({ ...formData, recurrence_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">Sekali Bayar</SelectItem>
                      <SelectItem value="monthly">Setiap Bulan</SelectItem>
                      <SelectItem value="yearly">Setiap Tahun</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Smart Date Input - adapts based on recurrence type */}
                {formData.recurrence_type === 'one_time' && (
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
                )}

                {formData.recurrence_type === 'monthly' && (
                  <div className="space-y-2">
                    <Label htmlFor="recurrence_day">Tanggal Pembayaran (setiap bulan)</Label>
                    <Input
                      id="recurrence_day"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.recurrence_day}
                      onChange={(e) => {
                        const day = e.target.value;
                        setFormData({ 
                          ...formData, 
                          recurrence_day: day,
                          due_date: day ? calculateInitialDueDate('monthly', parseInt(day)) : ''
                        });
                      }}
                      placeholder="Contoh: 15 (tanggal 15 setiap bulan)"
                      required
                    />
                    {formData.due_date && (
                      <p className="text-xs text-muted-foreground">
                        Jatuh tempo pertama: {formatIndonesianDate(formData.due_date)}
                      </p>
                    )}
                  </div>
                )}

                {formData.recurrence_type === 'yearly' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="recurrence_day">Tanggal</Label>
                        <Input
                          id="recurrence_day"
                          type="number"
                          min="1"
                          max="31"
                          value={formData.recurrence_day}
                          onChange={(e) => {
                            const day = e.target.value;
                            setFormData({ 
                              ...formData, 
                              recurrence_day: day,
                              due_date: day && formData.recurrence_month 
                                ? calculateInitialDueDate('yearly', parseInt(day), parseInt(formData.recurrence_month)) 
                                : formData.due_date
                            });
                          }}
                          placeholder="Tanggal"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recurrence_month">Bulan</Label>
                        <Select
                          value={formData.recurrence_month}
                          onValueChange={(value) => {
                            setFormData({ 
                              ...formData, 
                              recurrence_month: value,
                              due_date: formData.recurrence_day 
                                ? calculateInitialDueDate('yearly', parseInt(formData.recurrence_day), parseInt(value)) 
                                : formData.due_date
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih bulan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Januari</SelectItem>
                            <SelectItem value="2">Februari</SelectItem>
                            <SelectItem value="3">Maret</SelectItem>
                            <SelectItem value="4">April</SelectItem>
                            <SelectItem value="5">Mei</SelectItem>
                            <SelectItem value="6">Juni</SelectItem>
                            <SelectItem value="7">Juli</SelectItem>
                            <SelectItem value="8">Agustus</SelectItem>
                            <SelectItem value="9">September</SelectItem>
                            <SelectItem value="10">Oktober</SelectItem>
                            <SelectItem value="11">November</SelectItem>
                            <SelectItem value="12">Desember</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {formData.due_date && (
                      <p className="text-xs text-muted-foreground">
                        Jatuh tempo pertama: {formatIndonesianDate(formData.due_date)}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_template"
                    checked={formData.is_template}
                    onChange={(e) => setFormData({ ...formData, is_template: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="is_template" className="text-sm">
                    Jadikan sebagai template untuk auto-generate tagihan masa depan
                  </Label>
                </div>

                {/* Google Calendar Sync */}
                {isConnected && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sync_to_google_calendar"
                      checked={formData.sync_to_google_calendar}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, sync_to_google_calendar: !!checked })
                      }
                    />
                    <Label htmlFor="sync_to_google_calendar" className="text-sm">
                      Sync ke Google Calendar
                    </Label>
                  </div>
                )}
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
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.map((bill) => {
                    const dueDateStatus = getDueDateStatus(bill.due_date);
                    return (
                      <TableRow 
                        key={bill.id} 
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedBill(bill);
                          setIsDetailDialogOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">
                          {bill.bill_name}
                        </TableCell>
                        <TableCell>{bill.payer_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dueDateStatus)}`}>
                              {getStatusIcon(dueDateStatus)}
                              {formatIndonesianDate(bill.due_date)}
                            </div>
                            {bill.google_calendar_event_id && (
                              <Calendar className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={bill.category === 'my_bills' ? 'default' : 'secondary'}>
                            {bill.category === 'my_bills' ? 'Tagihan Saya' : 'Tagihan Orang Lain'}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleMarkAsPaid(bill)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Lunas
                            </Button>
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
                                  recurrence_type: bill.recurrence_type || 'one_time',
                                  recurrence_day: bill.recurrence_day?.toString() || '',
                                  recurrence_month: bill.recurrence_month?.toString() || '',
                                  is_template: bill.is_template || false,
                                  sync_to_google_calendar: bill.sync_to_google_calendar || false,
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

      {/* Detail View Sheet */}
      <Sheet open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="text-2xl">{selectedBill?.bill_name}</SheetTitle>
          </SheetHeader>
          
          {selectedBill && (
            <div className="space-y-6 py-6">
              {/* Informasi Pembayar */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informasi Pembayar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-muted-foreground">Nama Pembayar</span>
                    <span className="font-medium text-right">{selectedBill.payer_name}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-muted-foreground">Rekening Tujuan</span>
                    <span className="font-medium text-right">{selectedBill.destination_account || '-'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Informasi Nominal & Kategori */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informasi Nominal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Nominal</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(selectedBill.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Kategori</span>
                    <Badge variant={selectedBill.category === 'my_bills' ? 'default' : 'secondary'}>
                      {selectedBill.category === 'my_bills' ? 'Tagihan Saya' : 'Tagihan Orang Lain'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Informasi Jatuh Tempo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informasi Jatuh Tempo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-muted-foreground">Tanggal Jatuh Tempo</span>
                    <div className="text-right">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(getDueDateStatus(selectedBill.due_date))}`}>
                        {getStatusIcon(getDueDateStatus(selectedBill.due_date))}
                        {formatIndonesianDate(selectedBill.due_date)}
                      </div>
                    </div>
                  </div>
                  {selectedBill.next_due_date && (
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">Jatuh Tempo Berikutnya</span>
                      <span className="font-medium text-right">{formatIndonesianDate(selectedBill.next_due_date)}</span>
                    </div>
                  )}
                  {selectedBill.google_calendar_event_id && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Google Calendar</span>
                      <div className="flex items-center gap-1 text-green-600">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-medium">Tersinkronisasi</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Informasi Pengulangan */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Repeat className="h-5 w-5" />
                    Pengaturan Pengulangan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-muted-foreground">Jenis Pengulangan</span>
                    <span className="font-medium text-right">
                      {selectedBill.recurrence_type === 'one_time' ? 'Sekali Bayar' : 
                       selectedBill.recurrence_type === 'monthly' ? 'Setiap Bulan' :
                       selectedBill.recurrence_type === 'yearly' ? 'Setiap Tahun' : 'Custom'}
                    </span>
                  </div>
                  {selectedBill.recurrence_type === 'monthly' && selectedBill.recurrence_day && (
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">Tanggal</span>
                      <span className="font-medium text-right">Tanggal {selectedBill.recurrence_day} setiap bulan</span>
                    </div>
                  )}
                  {selectedBill.recurrence_type === 'yearly' && selectedBill.recurrence_day && selectedBill.recurrence_month && (
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">Tanggal & Bulan</span>
                      <span className="font-medium text-right">
                        {selectedBill.recurrence_day}/{selectedBill.recurrence_month} setiap tahun
                      </span>
                    </div>
                  )}
                  {selectedBill.is_template && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Template Auto-Generate</span>
                      <Badge variant="outline">
                        <Copy className="h-3 w-3 mr-1" />
                        Aktif
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status & Informasi Tambahan */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Status & Informasi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status Tagihan</span>
                    <Badge variant={selectedBill.status === 'active' ? 'default' : 'outline'}>
                      {selectedBill.status === 'active' ? 'Aktif' : 'Non Aktif'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-muted-foreground">Dibuat pada</span>
                    <span className="font-medium text-right text-sm">{formatIndonesianDate(selectedBill.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Bills;