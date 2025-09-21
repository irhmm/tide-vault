-- Add Google Calendar sync columns to bills table
ALTER TABLE public.bills 
ADD COLUMN sync_to_google_calendar boolean NOT NULL DEFAULT false,
ADD COLUMN google_calendar_event_id text;