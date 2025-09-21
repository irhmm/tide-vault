import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, Edit, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ReminderForm from '@/components/ReminderForm';
import { formatIndonesianDate } from '@/lib/utils';

interface Reminder {
  id: string;
  title: string;
  description?: string;
  reminder_date: string;
  reminder_time: string;
  is_active: boolean;
  is_completed: boolean;
  created_at: string;
}

const Reminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

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
      console.error('Error fetching reminders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch reminders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ is_completed: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setReminders(reminders.map(reminder => 
        reminder.id === id 
          ? { ...reminder, is_completed: !currentStatus }
          : reminder
      ));

      toast({
        title: "Success",
        description: `Reminder ${!currentStatus ? 'completed' : 'marked as incomplete'}`,
      });
    } catch (error) {
      console.error('Error updating reminder:', error);
      toast({
        title: "Error",
        description: "Failed to update reminder",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setReminders(reminders.filter(reminder => reminder.id !== id));
      toast({
        title: "Success",
        description: "Reminder deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast({
        title: "Error",
        description: "Failed to delete reminder",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingReminder(null);
    fetchReminders();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingReminder(null);
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const activeReminders = reminders.filter(r => r.is_active && !r.is_completed);
  const completedReminders = reminders.filter(r => r.is_completed);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading reminders...</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <ReminderForm
        reminder={editingReminder}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Custom Reminders</h1>
          <p className="text-muted-foreground">
            Manage your personal reminders and events
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Reminder
        </Button>
      </div>

      {activeReminders.length === 0 && completedReminders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No reminders yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first custom reminder to get started
            </p>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Reminder
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Reminders */}
          {activeReminders.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Active Reminders ({activeReminders.length})
              </h2>
              <div className="grid gap-4">
                {activeReminders.map((reminder) => (
                  <Card key={reminder.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{reminder.title}</CardTitle>
                          {reminder.description && (
                            <CardDescription className="mt-1">
                              {reminder.description}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleComplete(reminder.id, reminder.is_completed)}
                            className="gap-1"
                          >
                            <Check className="h-3 w-3" />
                            Complete
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(reminder)}
                            className="gap-1"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(reminder.id)}
                            className="gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatIndonesianDate(reminder.reminder_date)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(reminder.reminder_time)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Completed Reminders */}
          {completedReminders.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Completed ({completedReminders.length})
              </h2>
              <div className="grid gap-4">
                {completedReminders.map((reminder) => (
                  <Card key={reminder.id} className="opacity-75">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-through">{reminder.title}</CardTitle>
                          {reminder.description && (
                            <CardDescription className="mt-1 line-through">
                              {reminder.description}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Badge variant="secondary">Completed</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleComplete(reminder.id, reminder.is_completed)}
                            className="gap-1"
                          >
                            Undo
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(reminder.id)}
                            className="gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatIndonesianDate(reminder.reminder_date)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(reminder.reminder_time)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reminders;