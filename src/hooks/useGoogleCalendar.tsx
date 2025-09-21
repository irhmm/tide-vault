import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useGoogleCalendar() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      checkConnectionStatus();
    }
  }, [user]);

  const checkConnectionStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-auth', {
        method: 'GET'
      });

      if (error) throw error;
      setIsConnected(data.isConnected);
    } catch (error) {
      console.error('Error checking Google Calendar connection:', error);
    }
  };

  const connectGoogleCalendar = async () => {
    setLoading(true);
    try {
      const clientId = 'YOUR_GOOGLE_CLIENT_ID'; // This will be replaced with actual client ID
      const redirectUri = `${window.location.origin}/reminders`;
      const scope = 'https://www.googleapis.com/auth/calendar';
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `access_type=offline&` +
        `prompt=consent`;

      // Store current state and redirect to Google OAuth
      localStorage.setItem('google_oauth_redirect', redirectUri);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating Google Calendar connection:', error);
      toast.error('Failed to connect Google Calendar');
    }
    setLoading(false);
  };

  const handleOAuthCallback = async (code: string) => {
    setLoading(true);
    try {
      const redirectUri = localStorage.getItem('google_oauth_redirect') || `${window.location.origin}/reminders`;
      
      const { data, error } = await supabase.functions.invoke('google-auth', {
        body: { code, redirectUri }
      });

      if (error) throw error;

      setIsConnected(true);
      toast.success('Google Calendar connected successfully!');
      
      // Clean up
      localStorage.removeItem('google_oauth_redirect');
      
      // Remove code from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      url.searchParams.delete('scope');
      window.history.replaceState({}, document.title, url.toString());
      
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      toast.error('Failed to connect Google Calendar');
    }
    setLoading(false);
  };

  const disconnectGoogleCalendar = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('google-auth', {
        method: 'DELETE'
      });

      if (error) throw error;

      setIsConnected(false);
      toast.success('Google Calendar disconnected');
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      toast.error('Failed to disconnect Google Calendar');
    }
    setLoading(false);
  };

  const syncReminder = async (action: 'create' | 'update' | 'delete', reminderId: string, reminderData?: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('calendar-sync', {
        body: { action, reminderId, reminderData }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error syncing reminder:', error);
      throw error;
    }
  };

  const syncAllReminders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calendar-sync', {
        body: { action: 'sync_all' }
      });

      if (error) throw error;

      const successCount = data.results?.filter((r: any) => r.success).length || 0;
      toast.success(`Synced ${successCount} reminders to Google Calendar`);
      
      return data;
    } catch (error) {
      console.error('Error syncing all reminders:', error);
      toast.error('Failed to sync reminders');
      throw error;
    }
    setLoading(false);
  };

  return {
    isConnected,
    loading,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    handleOAuthCallback,
    syncReminder,
    syncAllReminders,
    checkConnectionStatus
  };
}