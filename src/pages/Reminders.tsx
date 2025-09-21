import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatIndonesianDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { CalendarIcon, Plus, Edit2, Trash2, Check, X, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  reminder_date: string;
  reminder_time: string;
  is_active: boolean;
  is_completed: boolean;
  created_at: string;
}

const Reminders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_date: new Date(),
    reminder_time: ''
  });

  useEffect(() => {
    if (user) {
      fetchReminders();
    }
  }, [user]);

  const fetchReminders = async () => {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .order('reminder_date', { ascending: true })
        .order('reminder_time', { ascending: true });

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat data reminder',
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
      const reminderData = {
        user_id: user.id,
        title: formData.title,
        description: formData.description || null,
        reminder_date: format(formData.reminder_date, 'yyyy-MM-dd'),
        reminder_time: formData.reminder_time,
      };

      if (editingId) {
        const { error } = await supabase
          .from('reminders')
          .update(reminderData)
          .eq('id', editingId);
        
        if (error) throw error;
        
        toast({
          title: 'Berhasil',
          description: 'Reminder berhasil diperbarui',
        });
      } else {
        const { error } = await supabase
          .from('reminders')
          .insert([reminderData]);
        
        if (error) throw error;
        
        toast({
          title: 'Berhasil',
          description: 'Reminder berhasil ditambahkan',
        });
      }

      resetForm();
      fetchReminders();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal menyimpan reminder',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      reminder_date: new Date(),
      reminder_time: ''
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (reminder: Reminder) => {
    setFormData({
      title: reminder.title,
      description: reminder.description || '',
      reminder_date: new Date(reminder.reminder_date),
      reminder_time: reminder.reminder_time
    });
    setEditingId(reminder.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Reminder berhasil dihapus',
      });
      fetchReminders();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal menghapus reminder',
        variant: 'destructive',
      });
    }
  };

  const toggleComplete = async (id: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ is_completed: !isCompleted })
        .eq('id', id);

      if (error) throw error;

      fetchReminders();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal mengubah status reminder',
        variant: 'destructive',
      });
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      fetchReminders();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal mengubah status aktif reminder',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Reminders</h1>
          <p className="text-muted-foreground">Kelola reminder pribadi Anda</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Tambah Reminder
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Reminder' : 'Tambah Reminder Baru'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Judul</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Masukkan judul reminder"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Masukkan deskripsi (opsional)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tanggal</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.reminder_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.reminder_date ? format(formData.reminder_date, "PPP") : <span>Pilih tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.reminder_date}
                        onSelect={(date) => date && setFormData({ ...formData, reminder_date: date })}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="time">Waktu</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.reminder_time}
                    onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingId ? 'Perbarui' : 'Simpan'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {reminders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada reminder yang dibuat</p>
            </CardContent>
          </Card>
        ) : (
          reminders.map((reminder) => (
            <Card key={reminder.id} className={`${reminder.is_completed ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={`font-semibold ${reminder.is_completed ? 'line-through' : ''}`}>
                        {reminder.title}
                      </h3>
                      <div className="flex gap-1">
                        {reminder.is_completed && (
                          <Badge variant="secondary">Selesai</Badge>
                        )}
                        {!reminder.is_active && (
                          <Badge variant="outline">Nonaktif</Badge>
                        )}
                      </div>
                    </div>
                    
                    {reminder.description && (
                      <p className="text-muted-foreground mb-2">{reminder.description}</p>
                    )}
                    
                    <div className="text-sm text-muted-foreground">
                      {formatIndonesianDate(reminder.reminder_date)} • {reminder.reminder_time}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={reminder.is_completed ? "outline" : "default"}
                      onClick={() => toggleComplete(reminder.id, reminder.is_completed)}
                    >
                      {reminder.is_completed ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(reminder)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(reminder.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Reminders;