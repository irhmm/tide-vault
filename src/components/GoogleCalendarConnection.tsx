import { Calendar, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';

interface GoogleCalendarConnectionProps {
  className?: string;
}

export function GoogleCalendarConnection({ className }: GoogleCalendarConnectionProps) {
  const {
    isConnected,
    loading,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    syncAllReminders
  } = useGoogleCalendar();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Integration
        </CardTitle>
        <CardDescription>
          Sync your reminders with Google Calendar for better organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Connection Status:</span>
            {isConnected ? (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Not Connected
              </Badge>
            )}
          </div>
          
          {isConnected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={disconnectGoogleCalendar}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Disconnect
            </Button>
          ) : (
            <Button
              onClick={connectGoogleCalendar}
              disabled={loading}
              size="sm"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Connect Google Calendar
            </Button>
          )}
        </div>

        {isConnected && (
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={syncAllReminders}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sync All Existing Reminders
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}