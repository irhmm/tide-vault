import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

async function refreshGoogleToken(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      grant_type: 'refresh_token',
    }),
  });

  return await response.json();
}

async function getValidAccessToken(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expires_at')
    .eq('user_id', userId)
    .single();

  if (!profile?.google_access_token) {
    throw new Error('No Google Calendar connection found');
  }

  // Check if token needs refresh
  const tokenExpired = profile.google_token_expires_at ? 
    new Date(profile.google_token_expires_at) < new Date() : true;

  if (tokenExpired && profile.google_refresh_token) {
    const refreshData = await refreshGoogleToken(profile.google_refresh_token);
    
    if (refreshData.access_token) {
      const expiresAt = new Date(Date.now() + (refreshData.expires_in * 1000));
      
      await supabase
        .from('profiles')
        .update({
          google_access_token: refreshData.access_token,
          google_token_expires_at: expiresAt.toISOString(),
        })
        .eq('user_id', userId);

      return refreshData.access_token;
    }
  }

  return profile.google_access_token;
}

async function createCalendarEvent(accessToken: string, reminder: any) {
  const event = {
    summary: reminder.title,
    description: reminder.description || '',
    start: {
      dateTime: `${reminder.reminder_date}T${reminder.reminder_time}:00`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: new Date(new Date(`${reminder.reminder_date}T${reminder.reminder_time}:00`).getTime() + 30 * 60000).toISOString().slice(0, -5),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 15 },
        { method: 'email', minutes: 30 }
      ]
    }
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to create calendar event:', error);
    throw new Error('Failed to create calendar event');
  }

  return await response.json();
}

async function updateCalendarEvent(accessToken: string, eventId: string, reminder: any) {
  const event = {
    summary: reminder.title,
    description: reminder.description || '',
    start: {
      dateTime: `${reminder.reminder_date}T${reminder.reminder_time}:00`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: new Date(new Date(`${reminder.reminder_date}T${reminder.reminder_time}:00`).getTime() + 30 * 60000).toISOString().slice(0, -5),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to update calendar event:', error);
    throw new Error('Failed to update calendar event');
  }

  return await response.json();
}

async function deleteCalendarEvent(accessToken: string, eventId: string) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    console.error('Failed to delete calendar event:', error);
    throw new Error('Failed to delete calendar event');
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, reminderId, reminderData, billId, billData } = await req.json();

    const accessToken = await getValidAccessToken(supabase, user.id);

    switch (action) {
      case 'create': {
        const calendarEvent = await createCalendarEvent(accessToken, reminderData);
        
        // Update reminder with Google Calendar event ID
        const { error } = await supabase
          .from('reminders')
          .update({ google_calendar_event_id: calendarEvent.id })
          .eq('id', reminderId);

        if (error) {
          console.error('Error updating reminder with event ID:', error);
          throw new Error('Failed to update reminder');
        }

        return new Response(JSON.stringify({ success: true, eventId: calendarEvent.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update': {
        const { data: reminder } = await supabase
          .from('reminders')
          .select('google_calendar_event_id')
          .eq('id', reminderId)
          .single();

        if (reminder?.google_calendar_event_id) {
          await updateCalendarEvent(accessToken, reminder.google_calendar_event_id, reminderData);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        const { data: reminder } = await supabase
          .from('reminders')
          .select('google_calendar_event_id')
          .eq('id', reminderId)
          .single();

        if (reminder?.google_calendar_event_id) {
          await deleteCalendarEvent(accessToken, reminder.google_calendar_event_id);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create_bill': {
        const billEvent = {
          title: `Pembayaran ${billData.bill_name}`,
          description: `${billData.description || ''}\nJumlah: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(billData.amount)}\nJatuh Tempo: ${billData.due_date}${billData.destination_account ? `\nRekening: ${billData.destination_account}` : ''}`,
          reminder_date: billData.due_date,
          reminder_time: '09:00:00',
        };
        
        const calendarEvent = await createCalendarEvent(accessToken, billEvent);
        
        await supabase
          .from('bills')
          .update({ google_calendar_event_id: calendarEvent.id })
          .eq('id', billId);

        return new Response(JSON.stringify({ success: true, eventId: calendarEvent.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_bill': {
        const billEvent = {
          title: `Pembayaran ${billData.bill_name}`,
          description: `${billData.description || ''}\nJumlah: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(billData.amount)}\nJatuh Tempo: ${billData.due_date}${billData.destination_account ? `\nRekening: ${billData.destination_account}` : ''}`,
          reminder_date: billData.due_date,
          reminder_time: '09:00:00',
        };
        
        await updateCalendarEvent(accessToken, billData.google_calendar_event_id, billEvent);
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete_bill': {
        const { data: bill } = await supabase
          .from('bills')
          .select('google_calendar_event_id')
          .eq('id', billId)
          .single();

        if (bill?.google_calendar_event_id) {
          await deleteCalendarEvent(accessToken, bill.google_calendar_event_id);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'sync_all': {
        // Sync all reminders that have sync_to_google_calendar enabled but no event ID
        const { data: reminders } = await supabase
          .from('reminders')
          .select('*')
          .eq('sync_to_google_calendar', true)
          .is('google_calendar_event_id', null)
          .eq('user_id', user.id);

        const results = [];
        for (const reminder of reminders || []) {
          try {
            const calendarEvent = await createCalendarEvent(accessToken, reminder);
            
            await supabase
              .from('reminders')
              .update({ google_calendar_event_id: calendarEvent.id })
              .eq('id', reminder.id);

            results.push({ id: reminder.id, success: true });
          } catch (error) {
            console.error(`Failed to sync reminder ${reminder.id}:`, error);
            results.push({ id: reminder.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }

        return new Response(JSON.stringify({ success: true, results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'sync_all_bills': {
        // Sync all bills that have sync_to_google_calendar enabled but no event ID
        const { data: bills } = await supabase
          .from('bills')
          .select('*')
          .eq('sync_to_google_calendar', true)
          .is('google_calendar_event_id', null)
          .eq('user_id', user.id)
          .eq('status', 'active');

        const results = [];
        for (const bill of bills || []) {
          try {
            const billEvent = {
              title: `Pembayaran ${bill.bill_name}`,
              description: `${bill.description || ''}\nJumlah: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(bill.amount)}\nJatuh Tempo: ${bill.due_date}${bill.destination_account ? `\nRekening: ${bill.destination_account}` : ''}`,
              reminder_date: bill.due_date,
              reminder_time: '09:00:00',
            };

            const calendarEvent = await createCalendarEvent(accessToken, billEvent);
            
            await supabase
              .from('bills')
              .update({ google_calendar_event_id: calendarEvent.id })
              .eq('id', bill.id);

            results.push({ id: bill.id, success: true });
          } catch (error) {
            console.error(`Failed to sync bill ${bill.id}:`, error);
            results.push({ id: bill.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }

        return new Response(JSON.stringify({ success: true, results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Error in calendar-sync function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});