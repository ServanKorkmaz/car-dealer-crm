import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, Mail, MapPin, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { Customer, Car, Contract, Followup, Activity } from '@shared/schema';
import { CreateFollowupModal } from './CreateFollowupModal';

interface CustomerProfileData {
  customer: Customer;
  cars: Car[];
  contracts: Contract[];
  followups: Followup[];
  activities: Activity[];
}

export function CustomerProfile({ customerId }: { customerId: string }) {
  const [, setLocation] = useLocation();
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery<CustomerProfileData>({
    queryKey: ['/api/customers', customerId, 'profile'],
    queryFn: () => apiRequest(`/api/customers/${customerId}/profile`),
  });

  const updateFollowupMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'DONE' | 'SKIPPED' }) => {
      return apiRequest(`/api/followups/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/followups'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Kunde ikke funnet</h2>
        <Button onClick={() => setLocation('/customers')}>Tilbake til kundeliste</Button>
      </div>
    );
  }

  const { customer, cars, contracts, followups, activities } = profile;

  // Calculate customer metrics
  const totalPurchases = contracts.filter(c => c.status === 'completed').length;
  const totalSpent = contracts
    .filter(c => c.status === 'completed')
    .reduce((sum, c) => sum + Number(c.salePrice || 0), 0);

  const openFollowups = followups.filter(f => f.status === 'OPEN');
  const overdueFollowups = openFollowups.filter(f => new Date(f.dueDate) < new Date());

  // Determine customer temperature (Hot/Warm/Cold)
  const lastActivityDate = activities[0]?.createdAt ? new Date(activities[0].createdAt) : null;
  const daysSinceLastActivity = lastActivityDate 
    ? Math.floor((new Date().getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  let customerTemp = 'Cold';
  let tempColor = 'bg-blue-100 text-blue-800';
  
  if (daysSinceLastActivity !== null) {
    if (daysSinceLastActivity <= 7) {
      customerTemp = 'Hot';
      tempColor = 'bg-red-100 text-red-800';
    } else if (daysSinceLastActivity <= 30) {
      customerTemp = 'Warm';
      tempColor = 'bg-yellow-100 text-yellow-800';
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'CUSTOMER_CREATED': return '👤';
      case 'CAR_SOLD': return '🚗';
      case 'CONTRACT_SIGNED': return '📄';
      case 'FOLLOWUP_CREATED': return '📝';
      case 'ALERT': return '🔔';
      default: return '📋';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/customers')}
            data-testid="button-back"
          >
            ← Tilbake
          </Button>
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-2xl font-bold">
              {customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold" data-testid="text-customer-name">
                {customer.name}
              </h1>
              <Badge variant={customer.type === 'BEDRIFT' ? 'default' : 'secondary'}>
                {customer.type === 'BEDRIFT' ? 'Bedrift' : 'Privat'}
              </Badge>
              <Badge className={tempColor}>
                {customerTemp}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Kunde siden {new Date(customer.createdAt!).toLocaleDateString('no-NO')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {customer.phone && (
            <Button size="sm" variant="outline" data-testid="button-call">
              <Phone className="h-4 w-4 mr-2" />
              Ring
            </Button>
          )}
          {customer.email && (
            <Button size="sm" variant="outline" data-testid="button-email">
              <Mail className="h-4 w-4 mr-2" />
              E-post
            </Button>
          )}
          {customer.address && (
            <Button size="sm" variant="outline" data-testid="button-maps">
              <MapPin className="h-4 w-4 mr-2" />
              Kart
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale kjøp</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-purchases">
              {totalPurchases}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total verdi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-spent">
              {totalSpent.toLocaleString('no-NO')} kr
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive oppfølginger</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-active-followups">
              {openFollowups.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forfalt oppfølging</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-overdue-followups">
              {overdueFollowups.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="timeline" data-testid="tab-timeline">Tidslinje</TabsTrigger>
              <TabsTrigger value="cars" data-testid="tab-cars">Biler</TabsTrigger>
              <TabsTrigger value="contracts" data-testid="tab-contracts">Kontrakter</TabsTrigger>
              <TabsTrigger value="notes" data-testid="tab-notes">Notater</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Aktivitetstidslinje</CardTitle>
                  <CardDescription>Alle hendelser knyttet til denne kunden</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {activities.map((activity, index) => (
                      <div key={activity.id} className="flex items-start space-x-4 border-l-2 border-muted pl-4 pb-4">
                        <div className="text-2xl">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium" data-testid={`activity-description-${index}`}>
                            {activity.description}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(activity.createdAt!).toLocaleString('no-NO')}
                          </p>
                          {activity.priority === 'HIGH' && (
                            <Badge variant="destructive" className="mt-1">Høy prioritet</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {activities.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Ingen aktiviteter registrert
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cars" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Biler ({cars.length})</CardTitle>
                  <CardDescription>Biler kjøpt, solgt eller innbyttet av denne kunden</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cars.map((car) => (
                      <div key={car.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-medium" data-testid={`car-make-model-${car.id}`}>
                              {car.make} {car.model}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {car.year} • {car.mileage?.toLocaleString('no-NO')} km
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Reg: {car.registrationNumber}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            {car.soldPrice ? `${Number(car.soldPrice).toLocaleString('no-NO')} kr` : 'Ikke solgt'}
                          </p>
                          <Badge variant={car.status === 'sold' ? 'default' : 'secondary'}>
                            {car.status === 'sold' ? 'Solgt' : car.status === 'available' ? 'Tilgjengelig' : 'Reservert'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {cars.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Ingen biler registrert
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contracts" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Kontrakter ({contracts.length})</CardTitle>
                  <CardDescription>Salgskontrakter og avtaler</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {contracts.map((contract) => (
                      <div key={contract.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium" data-testid={`contract-number-${contract.id}`}>
                            Kontrakt #{contract.contractNumber}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(contract.saleDate).toLocaleDateString('no-NO')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            {Number(contract.salePrice).toLocaleString('no-NO')} kr
                          </p>
                          <Badge 
                            variant={
                              contract.status === 'completed' ? 'default' : 
                              contract.status === 'signed' ? 'secondary' : 'outline'
                            }
                          >
                            {contract.status === 'completed' ? 'Fullført' : 
                             contract.status === 'signed' ? 'Signert' : 
                             contract.status === 'pending_signature' ? 'Venter signatur' : 'Utkast'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {contracts.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Ingen kontrakter registrert
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notater</CardTitle>
                  <CardDescription>Interne notater og kommentarer</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground py-8">
                    Notatfunksjon kommer snart
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Follow-ups Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Oppfølginger</CardTitle>
                <CardDescription>Påminnelser og oppgaver</CardDescription>
              </div>
              <Button
                onClick={() => setShowFollowupModal(true)}
                size="sm"
                data-testid="button-new-followup"
              >
                Ny oppfølging
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {followups.map((followup) => {
                  const isOverdue = new Date(followup.dueDate) < new Date() && followup.status === 'OPEN';
                  const isDueToday = new Date(followup.dueDate).toDateString() === new Date().toDateString();

                  return (
                    <div 
                      key={followup.id} 
                      className={`p-3 rounded-lg border ${
                        isOverdue ? 'border-red-200 bg-red-50' : 
                        isDueToday ? 'border-yellow-200 bg-yellow-50' : 
                        'border-muted bg-muted/50'
                      }`}
                      data-testid={`followup-${followup.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              {new Date(followup.dueDate).toLocaleDateString('no-NO')}
                            </span>
                            {isOverdue && <AlertCircle className="h-4 w-4 text-red-500" />}
                            {isDueToday && <Clock className="h-4 w-4 text-yellow-500" />}
                          </div>
                          {followup.note && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {followup.note}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <Badge 
                              variant={
                                followup.status === 'DONE' ? 'default' : 
                                followup.status === 'SKIPPED' ? 'secondary' : 'outline'
                              }
                            >
                              {followup.status === 'DONE' ? 'Fullført' : 
                               followup.status === 'SKIPPED' ? 'Hoppet over' : 'Åpen'}
                            </Badge>
                            {followup.status === 'OPEN' && (
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateFollowupMutation.mutate({ id: followup.id, status: 'DONE' })}
                                  disabled={updateFollowupMutation.isPending}
                                  data-testid={`button-complete-${followup.id}`}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateFollowupMutation.mutate({ id: followup.id, status: 'SKIPPED' })}
                                  disabled={updateFollowupMutation.isPending}
                                  data-testid={`button-skip-${followup.id}`}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {followups.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Ingen oppfølginger registrert
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Kontaktinformasjon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span data-testid="text-customer-phone">{customer.phone}</span>
                </div>
              )}
              
              {customer.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span data-testid="text-customer-email">{customer.email}</span>
                </div>
              )}
              
              {customer.address && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span data-testid="text-customer-address" className="text-sm">
                    {customer.address}
                  </span>
                </div>
              )}

              {customer.organizationNumber && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Org.nr:</p>
                  <p className="font-mono" data-testid="text-customer-org-number">
                    {customer.organizationNumber}
                  </p>
                </div>
              )}

              {customer.gdprConsent && (
                <div className="pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">GDPR-samtykke gitt</span>
                  </div>
                  {customer.gdprConsentAt && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(customer.gdprConsentAt).toLocaleDateString('no-NO')}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Follow-up Creation Modal */}
      {showFollowupModal && (
        <CreateFollowupModal
          customerId={customerId}
          customerName={customer.name}
          onClose={() => setShowFollowupModal(false)}
          onSuccess={() => {
            setShowFollowupModal(false);
            queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'profile'] });
            queryClient.invalidateQueries({ queryKey: ['/api/followups'] });
          }}
        />
      )}
    </div>
  );
}