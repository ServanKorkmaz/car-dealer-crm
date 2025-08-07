import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Car, 
  UserPlus, 
  FileText, 
  CheckCircle, 
  TrendingUp, 
  Download, 
  Clock,
  User,
  Calendar,
  DollarSign,
  Import
} from "lucide-react";
import type { ActivityLog } from "@shared/schema";

// Helper function to get relative time
function getRelativeTime(date: string): string {
  const now = new Date();
  const activityDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - activityDate.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "akkurat nå";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min siden`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} timer siden`;
  if (diffInSeconds < 172800) return "i går";
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} dager siden`;
  
  // For older activities, show actual date
  return activityDate.toLocaleDateString('no-NO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Get icon and color for activity type
function getActivityStyle(type: string): { icon: React.ElementType; color: string; bgColor: string } {
  switch (type) {
    case 'car_created':
      return { icon: Car, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/20' };
    case 'car_updated':
      return { icon: Car, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/20' };
    case 'car_sold':
      return { icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/20' };
    case 'car_imported':
      return { icon: Import, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/20' };
    case 'customer_created':
      return { icon: UserPlus, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/20' };
    case 'customer_updated':
      return { icon: User, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/20' };
    case 'contract_created':
      return { icon: FileText, color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/20' };
    case 'contract_signed':
      return { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/20' };
    case 'user_login':
      return { icon: User, color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-800' };
    default:
      return { icon: Calendar, color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-800' };
  }
}

export default function ActivityFeed({ limit = 10 }: { limit?: number }) {
  const { data: activities = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: [`/api/dashboard/activities?limit=${limit}`],
    refetchInterval: 30000, // Refetch every 30 seconds for near real-time updates
  });

  if (isLoading) {
    return (
      <Card data-testid="activity-feed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Siste aktivitet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card data-testid="activity-feed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Siste aktivitet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              Ingen aktivitet ennå
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
              Aktivitet vil vises her når du begynner å bruke systemet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="activity-feed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Siste aktivitet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const { icon: Icon, color, bgColor } = getActivityStyle(activity.type);
            
            return (
              <div 
                key={activity.id} 
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                data-testid={`activity-${activity.type}-${activity.id}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${bgColor}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 dark:text-white font-medium leading-relaxed">
                    {activity.message}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {getRelativeTime(activity.createdAt!)}
                    </span>
                    
                    {/* Show additional metadata for certain activity types */}
                    {activity.type === 'car_sold' && activity.metadata && (
                      <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                        {parseInt(activity.metadata.soldPrice as string || '0').toLocaleString('no-NO')} kr
                      </Badge>
                    )}
                    
                    {activity.type === 'car_imported' && activity.metadata && (
                      <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">
                        {activity.metadata.source as string}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {activities.length >= limit && (
          <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Viser de {limit} siste aktivitetene
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}