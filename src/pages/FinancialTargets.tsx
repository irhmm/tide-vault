import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { id as dateLocale } from 'date-fns/locale';
import {
  Plus,
  Banknote,
  Calendar,
  CheckCircle2,
  Circle,
  Edit,
  Trash2,
  TrendingUp,
  Home,
  Car,
  Heart,
  GraduationCap,
  Plane,
  Users
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface FinancialTarget {
  id: string;
  name: string;
  estimated_cost: number;
  deadline?: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface FinancialSummary {
  totalAssets: number;
  totalSavings: number;
  totalDebts: number;
  netWorth: number;
}

const FinancialTargets = () => {
  const [targets, setTargets] = useState<FinancialTarget[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalAssets: 0,
    totalSavings: 0,
    totalDebts: 0,
    netWorth: 0
  });
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<FinancialTarget | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    estimated_cost: '',
    deadline: '',
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchTargets();
      fetchFinancialSummary();
    }
  }, [user]);

  const fetchTargets = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_targets')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTargets(data || []);
    } catch (error) {
      console.error('Error fetching targets:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data target finansial",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialSummary = async () => {
    try {
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

      // Fetch debts
      const { data: debts } = await supabase
        .from('debts')
        .select('amount')
        .eq('user_id', user?.id)
        .eq('status', 'unpaid');

      const totalAssets = assets?.reduce((sum, asset) => sum + Number(asset.value), 0) || 0;
      const totalSavings = savings?.reduce((sum, saving) => sum + Number(saving.balance), 0) || 0;
      const totalDebts = debts?.reduce((sum, debt) => sum + Number(debt.amount), 0) || 0;
      const netWorth = totalAssets + totalSavings - totalDebts;

      setSummary({
        totalAssets,
        totalSavings,
        totalDebts,
        netWorth
      });
    } catch (error) {
      console.error('Error fetching financial summary:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.estimated_cost) {
      toast({
        title: "Error",
        description: "Nama target dan estimasi biaya wajib diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      const targetData = {
        name: formData.name,
        estimated_cost: Number(formData.estimated_cost),
        deadline: formData.deadline || null,
        user_id: user?.id,
      };

      if (editingTarget) {
        const { error } = await supabase
          .from('financial_targets')
          .update(targetData)
          .eq('id', editingTarget.id);
        
        if (error) throw error;
        
        toast({
          title: "Berhasil",
          description: "Target finansial berhasil diperbarui",
        });
      } else {
        const { error } = await supabase
          .from('financial_targets')
          .insert([targetData]);
        
        if (error) throw error;
        
        toast({
          title: "Berhasil",
          description: "Target finansial baru berhasil ditambahkan",
        });
      }

      setFormData({ name: '', estimated_cost: '', deadline: '' });
      setEditingTarget(null);
      setIsDialogOpen(false);
      fetchTargets();
    } catch (error) {
      console.error('Error saving target:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan target finansial",
        variant: "destructive",
      });
    }
  };

  const toggleTargetStatus = async (targetId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      
      const { error } = await supabase
        .from('financial_targets')
        .update({ status: newStatus })
        .eq('id', targetId);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: newStatus === 'completed' 
          ? "Selamat! Target finansial tercapai 🎉" 
          : "Target dikembalikan ke status pending",
      });

      fetchTargets();
    } catch (error) {
      console.error('Error updating target status:', error);
      toast({
        title: "Error",
        description: "Gagal memperbarui status target",
        variant: "destructive",
      });
    }
  };

  const deleteTarget = async (targetId: string) => {
    try {
      const { error } = await supabase
        .from('financial_targets')
        .delete()
        .eq('id', targetId);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Target finansial berhasil dihapus",
      });

      fetchTargets();
    } catch (error) {
      console.error('Error deleting target:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus target finansial",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (target: FinancialTarget) => {
    setEditingTarget(target);
    setFormData({
      name: target.name,
      estimated_cost: target.estimated_cost.toString(),
      deadline: target.deadline || '',
    });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingTarget(null);
    setFormData({ name: '', estimated_cost: '', deadline: '' });
    setIsDialogOpen(true);
  };

  const getTargetIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('rumah') || lowerName.includes('house')) return <Home className="w-5 h-5 text-primary" />;
    if (lowerName.includes('mobil') || lowerName.includes('motor') || lowerName.includes('car')) return <Car className="w-5 h-5 text-primary" />;
    if (lowerName.includes('menikah') || lowerName.includes('wedding') || lowerName.includes('nikah')) return <Heart className="w-5 h-5 text-primary" />;
    if (lowerName.includes('pendidikan') || lowerName.includes('kuliah') || lowerName.includes('sekolah')) return <GraduationCap className="w-5 h-5 text-primary" />;
    if (lowerName.includes('liburan') || lowerName.includes('travel') || lowerName.includes('vacation')) return <Plane className="w-5 h-5 text-primary" />;
    if (lowerName.includes('keluarga') || lowerName.includes('family')) return <Users className="w-5 h-5 text-primary" />;
    return <Banknote className="w-5 h-5 text-primary" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTotalTargetsCost = () => {
    return targets.filter(t => t.status === 'pending').reduce((sum, target) => sum + Number(target.estimated_cost), 0);
  };

  const getFundingGap = () => {
    const totalCost = getTotalTargetsCost();
    return Math.max(0, totalCost - summary.netWorth);
  };

  const getProgressPercentage = () => {
    const totalCost = getTotalTargetsCost();
    if (totalCost === 0) return 100;
    return Math.min(100, (summary.netWorth / totalCost) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            Target Finansial
          </h1>
          <p className="text-muted-foreground mt-1">
            Rencanakan dan pantau pencapaian target finansial Anda
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="btn-hover-scale">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Target Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTarget ? 'Edit Target Finansial' : 'Tambah Target Finansial Baru'}
              </DialogTitle>
              <DialogDescription>
                {editingTarget ? 'Perbarui informasi target finansial Anda' : 'Buat target finansial baru yang ingin Anda capai'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Target *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Beli Rumah, Mobil Baru, Menikah"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="estimated_cost">Estimasi Biaya (IDR) *</Label>
                <Input
                  id="estimated_cost"
                  type="number"
                  value={formData.estimated_cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_cost: e.target.value }))}
                  placeholder="500000000"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="deadline">Target Deadline (Opsional)</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  {editingTarget ? 'Perbarui Target' : 'Tambah Target'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Batal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Financial Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        <Card className="animate-fade-in border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{formatCurrency(getTotalTargetsCost())}</div>
            <p className="text-xs text-blue-600 mt-1">{targets.filter(t => t.status === 'pending').length} target aktif</p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Kekayaan Bersih</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(summary.netWorth)}</div>
            <p className="text-xs text-green-600 mt-1">Aset + Tabungan - Hutang</p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Dana Kurang</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{formatCurrency(getFundingGap())}</div>
            <p className="text-xs text-orange-600 mt-1">Masih perlu dikumpulkan</p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{Math.round(getProgressPercentage())}%</div>
            <Progress value={getProgressPercentage()} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Targets Grid */}
      {targets.length === 0 ? (
        <Card className="animate-fade-in">
          <CardContent className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Belum Ada Target Finansial
            </h3>
            <p className="text-muted-foreground mb-6">
              Mulai dengan membuat target finansial pertama Anda
            </p>
            <Button onClick={openAddDialog} className="btn-hover-scale">
              <Plus className="w-4 h-4 mr-2" />
              Buat Target Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {targets.map((target, index) => (
            <Card 
              key={target.id} 
              className={`relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-500 animate-fade-in hover:-translate-y-1 bg-gradient-to-br ${
                target.status === 'completed' 
                  ? 'from-green-50 via-emerald-50 to-green-100 ring-2 ring-green-200/50' 
                  : 'from-white via-blue-50/20 to-slate-50 hover:from-blue-50/30 hover:via-indigo-50/20 hover:to-slate-50'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Decorative top border */}
              <div className={`h-1 w-full ${
                target.status === 'completed' ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'
              }`} />
              
              {/* Header Section */}
              <CardHeader className="pb-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    target.status === 'completed' ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    {getTargetIcon(target.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-bold leading-tight text-foreground line-clamp-2 mb-2">
                      {target.name}
                    </CardTitle>
                    <Badge className={target.status === 'completed' ? "bg-green-100 text-green-800 border-green-200" : "bg-blue-100 text-blue-800 border-blue-200"}>
                      {target.status === 'completed' ? '✅ Tercapai' : '⏳ Berlangsung'}
                    </Badge>
                  </div>
                </div>
                
                {/* Cost Display */}
                <div className="mt-3 p-3 bg-muted/20 rounded-lg">
                  <div className="text-sm text-muted-foreground">Estimasi Biaya</div>
                  <div className="text-xl font-bold text-foreground">{formatCurrency(Number(target.estimated_cost))}</div>
                </div>
                
                {/* Deadline */}
                {target.deadline && (
                  <div className="flex items-center text-sm text-muted-foreground mt-3 bg-muted/20 rounded-lg p-2">
                    <Calendar className="w-4 h-4 mr-2 text-primary" />
                    <span className="font-medium">
                      Target: {format(new Date(target.deadline), 'dd MMM yyyy', { locale: dateLocale })}
                    </span>
                  </div>
                )}
              </CardHeader>
              
              {/* Action Buttons */}
              <CardContent className="pt-0 pb-4">
                <div className="flex gap-2">
                  <Button
                    variant={target.status === 'completed' ? 'secondary' : 'default'}
                    size="sm"
                    onClick={() => toggleTargetStatus(target.id, target.status)}
                    className="flex-1 btn-hover-scale font-medium"
                  >
                    {target.status === 'completed' ? (
                      <>
                        <Circle className="w-4 h-4 mr-2" />
                        Reset
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Tercapai
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(target)}
                    className="px-3 hover:bg-blue-50 btn-hover-scale"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-3 hover:bg-red-50 text-destructive hover:text-destructive btn-hover-scale"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Target Finansial?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Aksi ini tidak dapat dibatalkan. Target "{target.name}" akan dihapus permanen.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteTarget(target.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FinancialTargets;