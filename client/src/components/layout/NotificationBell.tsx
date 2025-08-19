import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import type { Activity } from '@shared/schema';

export function NotificationBell() {
  const [, setLocation] = useLocation();

  const { data: alerts = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities', { type: 'ALERT', resolved: false, limit: 10 }],
    queryFn: () => apiRequest('/api/activities?type=ALERT&resolved=false&limit=10'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCount = alerts.filter(alert => !alert.resolved).length;

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'HIGH': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'MEDIUM': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m siden`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}t siden`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d siden`;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          data-testid="notification-bell"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-600"
              data-testid="notification-count"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80" align="end" data-testid="notification-dropdown">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Varsler</span>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} nye</Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {alerts.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Ingen varsler</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {alerts.map((alert, index) => (
              <DropdownMenuItem
                key={alert.id}
                className="flex items-start p-3 cursor-pointer"
                onClick={() => setLocation('/activities')}
                data-testid={`alert-item-${index}`}
              >
                <div className="flex items-start space-x-3 w-full">
                  <div className="flex-shrink-0 mt-0.5">
                    {getPriorityIcon(alert.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {alert.message}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <Badge 
                        className={`text-xs ${getPriorityColor(alert.priority)}`}
                        variant="secondary"
                      >
                        {alert.priority === 'HIGH' ? 'Høy' : 
                         alert.priority === 'MEDIUM' ? 'Normal' : 'Lav'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(alert.createdAt!)}
                      </span>
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        
        {alerts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-center text-primary cursor-pointer"
              onClick={() => setLocation('/activities')}
              data-testid="view-all-alerts"
            >
              Se alle varsler
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}