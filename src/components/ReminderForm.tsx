import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Reminder {
  id: string;
  title: string;
  description?: string;
  reminder_date: string;
  reminder_time: string;
  is_active: boolean;
  is_completed: boolean;
}

interface ReminderFormProps {
  reminder?: Reminder | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const ReminderForm: React.FC<ReminderFormProps> = ({ reminder, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_date: '',
    reminder_time: '',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (reminder) {
      setFormData({
        title: reminder.title,
        description: reminder.description || '',
        reminder_date: reminder.reminder_date,
        reminder_time: reminder.reminder_time,
      });
    }
  }, [reminder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const reminderData = {
        user_id: user.id,
        title: formData.title,
        description: formData.description || null,
        reminder_date: formData.reminder_date,
        reminder_time: formData.reminder_time,
        is_active: true,
        is_completed: false,
      };

      let error;

      if (reminder) {
        // Update existing reminder
        const { error: updateError } = await supabase
          .from('reminders')
          .update(reminderData)
          .eq('id', reminder.id);
        error = updateError;
      } else {
        // Create new reminder
        const { error: insertError } = await supabase
          .from('reminders')
          .insert([reminderData]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: `Reminder ${reminder ? 'updated' : 'created'} successfully`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error saving reminder:', error);
      toast({
        title: "Error",
        description: `Failed to ${reminder ? 'update' : 'create'} reminder`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={onCancel} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {reminder ? 'Edit Reminder' : 'New Reminder'}
          </h1>
          <p className="text-muted-foreground">
            {reminder ? 'Update your reminder details' : 'Create a new custom reminder'}
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reminder Details
          </CardTitle>
          <CardDescription>
            Set up your custom reminder with all the necessary details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Servis Mobil, Meeting dengan Tim, dll"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Optional: Add more details about this reminder..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reminder_date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date *
                </Label>
                <Input
                  id="reminder_date"
                  type="date"
                  value={formData.reminder_date}
                  onChange={(e) => handleChange('reminder_date', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder_time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time *
                </Label>
                <Input
                  id="reminder_time"
                  type="time"
                  value={formData.reminder_time}
                  onChange={(e) => handleChange('reminder_time', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="gap-2">
                <Save className="h-4 w-4" />
                {loading ? 'Saving...' : (reminder ? 'Update Reminder' : 'Create Reminder')}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReminderForm;