-- Add Google Calendar integration columns to reminders table
ALTER TABLE public.reminders 
ADD COLUMN google_calendar_event_id TEXT,
ADD COLUMN sync_to_google_calendar BOOLEAN NOT NULL DEFAULT false;

-- Add Google Calendar tokens to profiles table
ALTER TABLE public.profiles 
ADD COLUMN google_access_token TEXT,
ADD COLUMN google_refresh_token TEXT,
ADD COLUMN google_token_expires_at TIMESTAMP WITH TIME ZONE;