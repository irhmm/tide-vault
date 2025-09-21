import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, isAfter, isBefore } from 'date-fns';
import { id as dateLocale } from 'date-fns/locale';
import {
  Plus,
  Target,
  Calendar,
  CheckCircle2,
  Circle,
  Edit,
  Trash2,
  Star,
  Rocket,
  Trophy
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Goal {
  id: string;
  name: string;
  description?: string;
  target_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const Goals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_date: '',
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data goals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.target_date) {
      toast({
        title: "Error",
        description: "Nama goal dan target tanggal wajib diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      const goalData = {
        name: formData.name,
        description: formData.description || null,
        target_date: formData.target_date,
        user_id: user?.id,
      };

      if (editingGoal) {
        const { error } = await supabase
          .from('goals')
          .update(goalData)
          .eq('id', editingGoal.id);
        
        if (error) throw error;
        
        toast({
          title: "Berhasil",
          description: "Goal berhasil diperbarui",
        });
      } else {
        const { error } = await supabase
          .from('goals')
          .insert([goalData]);
        
        if (error) throw error;
        
        toast({
          title: "Berhasil",
          description: "Goal baru berhasil ditambahkan",
        });
      }

      setFormData({ name: '', description: '', target_date: '' });
      setEditingGoal(null);
      setIsDialogOpen(false);
      fetchGoals();
    } catch (error) {
      console.error('Error saving goal:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan goal",
        variant: "destructive",
      });
    }
  };

  const toggleGoalStatus = async (goalId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      
      const { error } = await supabase
        .from('goals')
        .update({ status: newStatus })
        .eq('id', goalId);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: newStatus === 'completed' 
          ? "Selamat! Goal berhasil diselesaikan 🎉" 
          : "Goal dikembalikan ke status pending",
      });

      fetchGoals();
    } catch (error) {
      console.error('Error updating goal status:', error);
      toast({
        title: "Error",
        description: "Gagal memperbarui status goal",
        variant: "destructive",
      });
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Goal berhasil dihapus",
      });

      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus goal",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      description: goal.description || '',
      target_date: goal.target_date,
    });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingGoal(null);
    setFormData({ name: '', description: '', target_date: '' });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string, targetDate: string) => {
    const isOverdue = isBefore(new Date(targetDate), new Date()) && status === 'pending';
    
    if (status === 'completed') {
      return <Badge className="bg-green-100 text-green-800 border-green-200">✅ Selesai</Badge>;
    }
    
    if (isOverdue) {
      return <Badge variant="destructive">⏰ Terlambat</Badge>;
    }
    
    return <Badge variant="secondary">⏳ Berlangsung</Badge>;
  };

  const getProgressValue = () => {
    const completed = goals.filter(goal => goal.status === 'completed').length;
    return goals.length > 0 ? (completed / goals.length) * 100 : 0;
  };

  const getMotivationIcon = (index: number) => {
    const icons = [Star, Rocket, Trophy, Target];
    const IconComponent = icons[index % icons.length];
    return <IconComponent className="w-5 h-5 text-primary" />;
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
            <Target className="w-8 h-8 text-primary" />
            Goals & Target
          </h1>
          <p className="text-muted-foreground mt-1">
            Atur dan pantau pencapaian tujuan Anda
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="btn-hover-scale">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Goal Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingGoal ? 'Edit Goal' : 'Tambah Goal Baru'}
              </DialogTitle>
              <DialogDescription>
                {editingGoal ? 'Perbarui informasi goal Anda' : 'Buat target baru yang ingin Anda capai'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Goal *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Belajar React selama 6 bulan"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Deskripsi (Opsional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Jelaskan detail tentang goal ini..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="target_date">Target Tanggal *</Label>
                <Input
                  id="target_date"
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  {editingGoal ? 'Perbarui Goal' : 'Tambah Goal'}
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

      {/* Progress Overview */}
      {goals.length > 0 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Progress Keseluruhan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Goals Selesai</span>
                <span className="font-medium">
                  {goals.filter(g => g.status === 'completed').length} dari {goals.length}
                </span>
              </div>
              <Progress value={getProgressValue()} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {Math.round(getProgressValue())}% goals telah diselesaikan
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <Card className="animate-fade-in">
          <CardContent className="text-center py-12">
            <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Belum Ada Goal
            </h3>
            <p className="text-muted-foreground mb-6">
              Mulai dengan membuat goal pertama Anda untuk mencapai target impian
            </p>
            <Button onClick={openAddDialog} className="btn-hover-scale">
              <Plus className="w-4 h-4 mr-2" />
              Buat Goal Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal, index) => (
            <Card 
              key={goal.id} 
              className={`hover:shadow-lg transition-all duration-300 animate-fade-in hover-scale ${
                goal.status === 'completed' ? 'ring-2 ring-green-200 bg-green-50/50' : ''
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getMotivationIcon(index)}
                    <CardTitle className="text-lg leading-tight">
                      {goal.name}
                    </CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(goal)}
                      className="h-8 w-8 p-0 hover-scale"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover-scale text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Goal?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Aksi ini tidak dapat dibatalkan. Goal "{goal.name}" akan dihapus permanen.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteGoal(goal.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {getStatusBadge(goal.status, goal.target_date)}
                  
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-1" />
                    Target: {format(new Date(goal.target_date), 'dd MMMM yyyy', { locale: dateLocale })}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center text-sm font-medium">
                    <Calendar className="w-4 h-4 mr-2 text-primary" />
                    {(() => {
                      const today = new Date();
                      const targetDate = new Date(goal.target_date);
                      const diffTime = targetDate.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      if (diffDays > 0) {
                        return <span className="text-blue-700">Sisa Waktu: {diffDays} Hari</span>;
                      } else if (diffDays === 0) {
                        return <span className="text-orange-600">Hari Ini!</span>;
                      } else {
                        return <span className="text-red-600">Terlewat {Math.abs(diffDays)} Hari</span>;
                      }
                    })()}
                  </div>
                </div>
                
                <Button
                  variant={goal.status === 'completed' ? 'secondary' : 'default'}
                  size="sm"
                  onClick={() => toggleGoalStatus(goal.id, goal.status)}
                  className="w-full btn-hover-scale"
                >
                  {goal.status === 'completed' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Selesai
                    </>
                  ) : (
                    <>
                      <Circle className="w-4 h-4 mr-2" />
                      Tandai Selesai
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Goals;