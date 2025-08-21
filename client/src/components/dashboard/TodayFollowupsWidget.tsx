import { useQuery } from '@tanstack/react-query';
import { Calendar, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import type { Followup } from '@shared/schema';

export function TodayFollowupsWidget() {
  const [, setLocation] = useLocation();

  const { data: todayFollowups = [], isLoading } = useQuery<Followup[]>({
    queryKey: ['/api/followups/today'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/followups/today');
        return await response.json();
      } catch (error) {
        // Gracefully handle missing API endpoint
        console.log('Followups API not yet implemented');
        return [];
      }
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const overdue = todayFollowups.filter(f => new Date(f.dueDate) < new Date());
  const dueToday = todayFollowups.filter(f => {
    const today = new Date().toDateString();
    return new Date(f.dueDate).toDateString() === today;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            Oppgaver i dag
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="today-followups-widget">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            Oppgaver i dag
          </div>
          {todayFollowups.length > 0 && (
            <Badge variant="outline">
              {todayFollowups.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Oppfølginger som forfaller i dag
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {todayFollowups.length === 0 ? (
          <div className="text-center py-8" data-testid="no-followups-today">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Ingen oppgaver i dag</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Du har ingen oppfølginger som forfaller i dag
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation('/customers')}
            >
              Se alle kunder
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Show overdue first */}
            {overdue.map((followup) => (
              <div 
                key={followup.id}
                className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                data-testid={`overdue-followup-${followup.id}`}
              >
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="font-medium text-sm">Forsinket oppfølging</p>
                    {followup.note && (
                      <p className="text-xs text-muted-foreground truncate max-w-48">
                        {followup.note}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-red-100 text-red-800">
                    Forsinket
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation(`/customers/${followup.customerId}/profile`)}
                  >
                    Vis
                  </Button>
                </div>
              </div>
            ))}

            {/* Then show today's */}
            {dueToday.map((followup) => (
              <div 
                key={followup.id}
                className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                data-testid={`today-followup-${followup.id}`}
              >
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="font-medium text-sm">Oppfølging i dag</p>
                    {followup.note && (
                      <p className="text-xs text-muted-foreground truncate max-w-48">
                        {followup.note}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-blue-100 text-blue-800">
                    I dag
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation(`/customers/${followup.customerId}/profile`)}
                  >
                    Vis
                  </Button>
                </div>
              </div>
            ))}

            {todayFollowups.length > 3 && (
              <div className="pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setLocation('/activities')}
                >
                  Se alle oppfølginger
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}