import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Bell,
  Car,
  Users,
  FileText,
  Import,
  TrendingUp,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface Activity {
  id: string;
  companyId: string;
  userId?: string;
  type: string;
  entityId?: string;
  message: string;
  priority: 'low' | 'normal' | 'high';
  resolved: boolean;
  createdAt: string;
}

const ActivityTypeIcons = {
  IMPORT: Import,
  CAR_UPDATE: Car,
  CONTRACT_CREATED: FileText,
  CONTRACT_SIGNED: CheckCircle2,
  SALE: TrendingUp,
  PRICE_CHANGE: TrendingUp,
  FOLLOW_UP: Users,
  ALERT: AlertTriangle,
};

const ActivityTypeLabels = {
  IMPORT: "Import",
  CAR_UPDATE: "Biloppdatering",
  CONTRACT_CREATED: "Kontrakt opprettet",
  CONTRACT_SIGNED: "Kontrakt signert",
  SALE: "Salg",
  PRICE_CHANGE: "Prisendring",
  FOLLOW_UP: "Oppfølging",
  ALERT: "Varsel",
};

const PriorityColors = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  normal: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const ActivityFilters = [
  { key: 'all', label: 'Alle', type: undefined },
  { key: 'sales', label: 'Salg', type: 'SALE' },
  { key: 'import', label: 'Import', type: 'IMPORT' },
  { key: 'inventory', label: 'Lagerstyring', type: 'CAR_UPDATE' },
  { key: 'contracts', label: 'Kontrakter', type: 'CONTRACT_CREATED' },
  { key: 'alerts', label: 'Varsler', type: 'ALERT' },
];

export default function Activities() {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current filter type
  const currentFilter = ActivityFilters.find(f => f.key === selectedFilter);

  // Fetch activities
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['/api/activities', currentFilter?.type, showResolved],
    queryFn: () => apiRequest("GET", `/api/activities?${new URLSearchParams({
      ...(currentFilter?.type && { type: currentFilter.type }),
      resolved: showResolved.toString(),
      limit: '100'
    }).toString()}`),
  });

  // Resolve activity mutation
  const resolveActivityMutation = useMutation({
    mutationFn: (activityId: string) => 
      apiRequest("POST", `/api/activities/${activityId}/resolve`),
    onSuccess: () => {
      toast({
        title: "Aktivitet løst",
        description: "Aktiviteten er markert som løst",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
    },
    onError: () => {
      toast({
        title: "Feil",
        description: "Kunne ikke løse aktivitet",
        variant: "destructive",
      });
    },
  });

  // Manual alert check mutation
  const checkAlertsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/alerts/check"),
    onSuccess: () => {
      toast({
        title: "Varsler oppdatert",
        description: "Alle automatiske varsler er oppdatert",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
    },
    onError: () => {
      toast({
        title: "Feil",
        description: "Kunne ikke oppdatere varsler",
        variant: "destructive",
      });
    },
  });

  // Filter activities based on search
  const filteredActivities = activities.filter((activity: Activity) =>
    activity.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group activities by priority for better organization
  const groupedActivities = {
    high: filteredActivities.filter((a: Activity) => a.priority === 'high' && !a.resolved),
    normal: filteredActivities.filter((a: Activity) => a.priority === 'normal' && !a.resolved),
    low: filteredActivities.filter((a: Activity) => a.priority === 'low' && !a.resolved),
    resolved: filteredActivities.filter((a: Activity) => a.resolved),
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Aktiviteter</h1>
          <p className="text-muted-foreground">
            Oversikt over alle aktiviteter og varsler i systemet
          </p>
        </div>
        <Button
          onClick={() => checkAlertsMutation.mutate()}
          disabled={checkAlertsMutation.isPending}
          variant="outline"
          data-testid="button-check-alerts"
        >
          {checkAlertsMutation.isPending ? (
            <Clock className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Bell className="w-4 h-4 mr-2" />
          )}
          Oppdater varsler
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="space-y-4">
        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          {ActivityFilters.map((filter) => (
            <Button
              key={filter.key}
              variant={selectedFilter === filter.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter(filter.key)}
              data-testid={`filter-${filter.key}`}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Search and toggles */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Søk i aktiviteter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-activities"
            />
          </div>
          <Button
            variant={showResolved ? "default" : "outline"}
            size="sm"
            onClick={() => setShowResolved(!showResolved)}
            data-testid="toggle-show-resolved"
          >
            {showResolved ? "Skjul løste" : "Vis løste"}
          </Button>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="space-y-6">
        {/* High Priority Alerts */}
        {groupedActivities.high.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Høy prioritet ({groupedActivities.high.length})
            </h2>
            <div className="space-y-3">
              {groupedActivities.high.map((activity: Activity) => (
                <ActivityCard 
                  key={activity.id} 
                  activity={activity} 
                  onResolve={resolveActivityMutation.mutate}
                  isResolving={resolveActivityMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {/* Normal Priority */}
        {groupedActivities.normal.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Normal prioritet ({groupedActivities.normal.length})
            </h2>
            <div className="space-y-3">
              {groupedActivities.normal.map((activity: Activity) => (
                <ActivityCard 
                  key={activity.id} 
                  activity={activity} 
                  onResolve={resolveActivityMutation.mutate}
                  isResolving={resolveActivityMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {/* Low Priority */}
        {groupedActivities.low.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
              <Settings className="w-5 h-5" />
              Lav prioritet ({groupedActivities.low.length})
            </h2>
            <div className="space-y-3">
              {groupedActivities.low.map((activity: Activity) => (
                <ActivityCard 
                  key={activity.id} 
                  activity={activity} 
                  onResolve={resolveActivityMutation.mutate}
                  isResolving={resolveActivityMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {/* Resolved Activities */}
        {showResolved && groupedActivities.resolved.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-5 h-5" />
              Løste aktiviteter ({groupedActivities.resolved.length})
            </h2>
            <div className="space-y-3">
              {groupedActivities.resolved.map((activity: Activity) => (
                <ActivityCard 
                  key={activity.id} 
                  activity={activity} 
                  onResolve={() => {}}
                  isResolving={false}
                  isResolved
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredActivities.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-16 text-center">
              <Bell className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Ingen aktiviteter</h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "Ingen aktiviteter matcher søket ditt"
                  : currentFilter?.key === 'all'
                  ? "Det er ingen aktiviteter å vise"
                  : `Ingen ${currentFilter?.label.toLowerCase()} aktiviteter funnet`
                }
              </p>
              {searchQuery && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setSearchQuery('')}
                >
                  Fjern søkefilter
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

interface ActivityCardProps {
  activity: Activity;
  onResolve: (id: string) => void;
  isResolving: boolean;
  isResolved?: boolean;
}

function ActivityCard({ activity, onResolve, isResolving, isResolved }: ActivityCardProps) {
  const IconComponent = ActivityTypeIcons[activity.type as keyof typeof ActivityTypeIcons] || Bell;
  const typeLabel = ActivityTypeLabels[activity.type as keyof typeof ActivityTypeLabels] || activity.type;

  return (
    <Card className={`${isResolved ? 'opacity-60' : ''}`} data-testid={`activity-card-${activity.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-full bg-muted">
              <IconComponent className="w-4 h-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {typeLabel}
                </Badge>
                <Badge 
                  className={`text-xs ${PriorityColors[activity.priority]}`}
                  data-testid={`priority-badge-${activity.priority}`}
                >
                  {activity.priority === 'high' ? 'Høy' : 
                   activity.priority === 'normal' ? 'Normal' : 'Lav'}
                </Badge>
                {isResolved && (
                  <Badge variant="outline" className="text-xs text-green-600">
                    Løst
                  </Badge>
                )}
              </div>
              
              <p className="text-sm font-medium mb-1">{activity.message}</p>
              
              <p className="text-xs text-muted-foreground">
                {format(new Date(activity.createdAt), "dd. MMM yyyy 'kl.' HH:mm", { locale: nb })}
              </p>
            </div>
          </div>

          {!isResolved && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onResolve(activity.id)}
              disabled={isResolving}
              data-testid={`button-resolve-${activity.id}`}
            >
              {isResolving ? (
                <Clock className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1" />
              )}
              Løs
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}