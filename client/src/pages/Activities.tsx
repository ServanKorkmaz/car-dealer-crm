import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Car, 
  UserPlus, 
  FileText, 
  CheckCircle, 
  DollarSign,
  Import,
  User,
  Calendar,
  Clock,
  Filter,
  Search,
  RefreshCw,
  Activity,
  TrendingUp
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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Get detailed date for activity
function getDetailedDate(date: string): string {
  const activityDate = new Date(date);
  return activityDate.toLocaleString('no-NO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Get icon and color for activity type
function getActivityStyle(type: string): { 
  icon: React.ElementType; 
  color: string; 
  bgColor: string; 
  category: string;
  priority: 'high' | 'medium' | 'low';
} {
  switch (type) {
    case 'car_created':
      return { 
        icon: Car, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-100 dark:bg-blue-900/20', 
        category: 'Lagerstyring',
        priority: 'medium'
      };
    case 'car_updated':
      return { 
        icon: Car, 
        color: 'text-amber-600', 
        bgColor: 'bg-amber-100 dark:bg-amber-900/20', 
        category: 'Lagerstyring',
        priority: 'low'
      };
    case 'car_sold':
      return { 
        icon: DollarSign, 
        color: 'text-green-600', 
        bgColor: 'bg-green-100 dark:bg-green-900/20', 
        category: 'Salg',
        priority: 'high'
      };
    case 'car_imported':
      return { 
        icon: Import, 
        color: 'text-purple-600', 
        bgColor: 'bg-purple-100 dark:bg-purple-900/20', 
        category: 'Import',
        priority: 'medium'
      };
    case 'customer_created':
      return { 
        icon: UserPlus, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-100 dark:bg-blue-900/20', 
        category: 'Kunder',
        priority: 'medium'
      };
    case 'customer_updated':
      return { 
        icon: User, 
        color: 'text-amber-600', 
        bgColor: 'bg-amber-100 dark:bg-amber-900/20', 
        category: 'Kunder',
        priority: 'low'
      };
    case 'contract_created':
      return { 
        icon: FileText, 
        color: 'text-indigo-600', 
        bgColor: 'bg-indigo-100 dark:bg-indigo-900/20', 
        category: 'Kontrakter',
        priority: 'high'
      };
    case 'contract_signed':
      return { 
        icon: CheckCircle, 
        color: 'text-green-600', 
        bgColor: 'bg-green-100 dark:bg-green-900/20', 
        category: 'Kontrakter',
        priority: 'high'
      };
    case 'user_login':
      return { 
        icon: User, 
        color: 'text-slate-600', 
        bgColor: 'bg-slate-100 dark:bg-slate-800', 
        category: 'System',
        priority: 'low'
      };
    default:
      return { 
        icon: Calendar, 
        color: 'text-slate-600', 
        bgColor: 'bg-slate-100 dark:bg-slate-800', 
        category: 'System',
        priority: 'low'
      };
  }
}

export default function Activities() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [limitActivities, setLimitActivities] = useState(50);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorisert",
        description: "Du er ikke logget inn. Logger inn på nytt...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: activities = [], isLoading: activitiesLoading, refetch } = useQuery<ActivityLog[]>({
    queryKey: [`/api/dashboard/activities?limit=${limitActivities}`],
    enabled: isAuthenticated,
    refetchInterval: 15000, // Refetch every 15 seconds for real-time updates
  });

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900" />;
  }

  // Filter activities based on search and category
  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = activity.message.toLowerCase().includes(searchTerm.toLowerCase());
    const activityStyle = getActivityStyle(activity.type);
    const matchesCategory = filterCategory === "all" || activityStyle.category.toLowerCase() === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((groups: { [key: string]: ActivityLog[] }, activity) => {
    const date = new Date(activity.createdAt!).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {});

  // Get activity statistics
  const stats = {
    total: activities.length,
    today: activities.filter(a => new Date(a.createdAt!).toDateString() === new Date().toDateString()).length,
    thisWeek: activities.filter(a => {
      const activityDate = new Date(a.createdAt!);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return activityDate.getTime() >= weekAgo.getTime();
    }).length,
    highPriority: activities.filter(a => getActivityStyle(a.type).priority === 'high').length
  };

  return (
    <MainLayout>
      <div className="space-y-8" data-testid="activities-page">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Activity className="w-8 h-8" />
                Aktivitetslogg
              </h1>
              <p className="text-blue-100 mt-2">
                Fullstendig oversikt over alle systemaktiviteter og hendelser
              </p>
            </div>
            
            <div className="flex items-center gap-6 text-center">
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-blue-200 text-sm">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-300">{stats.today}</div>
                <div className="text-blue-200 text-sm">I dag</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-300">{stats.highPriority}</div>
                <div className="text-blue-200 text-sm">Prioritet</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Søk i aktiviteter..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-activities"
                  />
                </div>

                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-48" data-testid="select-filter-category">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrer kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle kategorier</SelectItem>
                    <SelectItem value="salg">Salg</SelectItem>
                    <SelectItem value="lagerstyring">Lagerstyring</SelectItem>
                    <SelectItem value="kunder">Kunder</SelectItem>
                    <SelectItem value="kontrakter">Kontrakter</SelectItem>
                    <SelectItem value="import">Import</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={limitActivities.toString()} onValueChange={(value) => setLimitActivities(parseInt(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh-activities">
                <RefreshCw className="w-4 h-4 mr-2" />
                Oppdater
              </Button>
            </div>

            <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              Viser {filteredActivities.length} av {activities.length} aktiviteter
            </div>
          </CardContent>
        </Card>

        {/* Activities List */}
        {activitiesLoading ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-slate-600 dark:text-slate-400">Laster aktiviteter...</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredActivities.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Activity className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
                Ingen aktiviteter funnet
              </h3>
              <p className="text-slate-500 dark:text-slate-500 max-w-md mx-auto">
                {searchTerm || filterCategory !== "all" 
                  ? "Prøv å justere søkefilterne for å se flere aktiviteter."
                  : "Aktiviteter vil vises her når du begynner å bruke systemet."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedActivities)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([dateKey, dayActivities]) => (
                <Card key={dateKey} className="overflow-hidden">
                  <CardHeader className="bg-slate-50 dark:bg-slate-800 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {new Date(dateKey).toLocaleDateString('no-NO', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      <Badge variant="secondary" className="ml-2">
                        {dayActivities.length} aktiviteter
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-0">
                      {dayActivities
                        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
                        .map((activity, index) => {
                          const { icon: Icon, color, bgColor, category, priority } = getActivityStyle(activity.type);
                          
                          return (
                            <div 
                              key={activity.id} 
                              className={`flex items-start gap-4 p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                                index < dayActivities.length - 1 ? 'border-b border-slate-200 dark:border-slate-700' : ''
                              }`}
                              data-testid={`activity-${activity.type}-${activity.id}`}
                            >
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${bgColor}`}>
                                <Icon className={`w-6 h-6 ${color}`} />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="text-slate-900 dark:text-white font-medium leading-relaxed mb-1">
                                      {activity.message}
                                    </p>
                                    
                                    <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {getRelativeTime(activity.createdAt!)}
                                      </span>
                                      
                                      <Badge variant="outline" className="text-xs">
                                        {category}
                                      </Badge>
                                      
                                      {priority === 'high' && (
                                        <Badge variant="default" className="text-xs bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                                          <TrendingUp className="w-3 h-3 mr-1" />
                                          Høy prioritet
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="text-right flex-shrink-0">
                                    <div className="text-xs text-slate-400">
                                      {new Date(activity.createdAt!).toLocaleTimeString('no-NO', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </div>
                                    
                                    {/* Show additional metadata for certain activity types */}
                                    {activity.type === 'car_sold' && activity.metadata && (
                                      <Badge className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 mt-1">
                                        {parseInt((activity.metadata as any).soldPrice || '0').toLocaleString('no-NO')} kr
                                      </Badge>
                                    )}
                                    
                                    {activity.type === 'car_imported' && activity.metadata && (
                                      <Badge className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 mt-1">
                                        {(activity.metadata as any).source}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}