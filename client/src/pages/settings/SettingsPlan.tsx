import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  Check, 
  X,
  AlertCircle,
  Loader2,
  Zap,
  TrendingUp,
  Building2,
  Calendar,
  Users,
  FileText,
  HardDrive,
  Headphones
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { PLAN_PRICING, type PlanType } from '@shared/auth-types';

export function SettingsPlan() {
  const { currentOrg } = useAuth();
  const { isOwner } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  // Fetch subscription
  const { data: subscription, isLoading } = useQuery({
    queryKey: [`/api/auth/subscription/${currentOrg?.id}`],
    enabled: !!currentOrg,
  });

  // Change plan mutation
  const changePlanMutation = useMutation({
    mutationFn: async (plan: PlanType) => {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`/api/auth/subscription/${currentOrg?.id}/change-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change plan');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/auth/subscription/${currentOrg?.id}`] });
      toast({
        title: 'Plan endret',
        description: `Din plan er nå oppdatert til ${selectedPlan}`,
      });
      setUpgradeDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Feil',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (!currentOrg || !isOwner()) {
    return (
      <MainLayout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Kun eiere kan administrere abonnement og fakturering
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  const currentPlan = subscription?.plan || 'basic';
  const isTrialing = subscription?.status === 'trialing';
  const trialDaysLeft = isTrialing && subscription?.trial_end
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'users':
        return Users;
      case 'storage':
        return HardDrive;
      case 'contracts':
        return FileText;
      case 'support':
        return Headphones;
      default:
        return Check;
    }
  };

  const handleChangePlan = (plan: PlanType) => {
    setSelectedPlan(plan);
    setUpgradeDialogOpen(true);
  };

  const confirmChangePlan = () => {
    if (selectedPlan) {
      changePlanMutation.mutate(selectedPlan);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Plan & Fakturering</h1>
          <p className="text-muted-foreground">
            Administrer ditt abonnement og betalingsmetoder
          </p>
        </div>

        {/* Current plan status */}
        {isTrialing && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Gratis prøveperiode</p>
                  <p className="text-sm">
                    {trialDaysLeft} dager igjen av prøveperioden. Oppgrader nå for å fortsette uten avbrudd.
                  </p>
                </div>
                <Progress value={(14 - trialDaysLeft) / 14 * 100} className="w-32" />
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Subscription details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Nåværende abonnement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-2xl font-bold capitalize">{currentPlan}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={isTrialing ? 'secondary' : 'success'}>
                  {isTrialing ? 'Prøveperiode' : 'Aktiv'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Seter</p>
                <p className="text-lg">
                  {subscription?.seats_used || 0} av {subscription?.seats || 0} brukt
                </p>
              </div>
            </div>

            {!isTrialing && subscription?.current_period_end && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Neste fakturering: {new Date(subscription.current_period_end).toLocaleDateString('nb-NO')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {Object.entries(PLAN_PRICING).map(([key, plan]) => {
            const planKey = key as PlanType;
            const isCurrent = currentPlan === planKey;
            
            return (
              <Card
                key={key}
                className={`relative ${isCurrent ? 'ring-2 ring-primary' : ''}`}
              >
                {isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    Nåværende plan
                  </Badge>
                )}
                
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    {planKey === 'basic' && <Zap className="h-5 w-5" />}
                    {planKey === 'pro' && <TrendingUp className="h-5 w-5" />}
                    {planKey === 'enterprise' && <Building2 className="h-5 w-5" />}
                  </div>
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="mt-4">
                    {plan.price > 0 ? (
                      <div className="text-3xl font-bold">
                        {plan.price} {plan.currency}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{plan.interval}
                        </span>
                      </div>
                    ) : (
                      <div className="text-3xl font-bold">Kontakt oss</div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      <span className="text-sm">
                        {plan.features.max_cars === -1 ? 'Ubegrenset' : plan.features.max_cars} biler
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      <span className="text-sm">
                        {plan.features.max_users === -1 ? 'Ubegrenset' : plan.features.max_users} brukere
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      <span className="text-sm">
                        {plan.features.max_contracts === -1 ? 'Ubegrenset' : plan.features.max_contracts} kontrakter
                      </span>
                    </li>
                    
                    <li className="flex items-start gap-2">
                      {plan.features.e_sign ? (
                        <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : (
                        <X className="h-5 w-5 text-gray-400 mt-0.5" />
                      )}
                      <span className={`text-sm ${!plan.features.e_sign ? 'text-gray-400' : ''}`}>
                        E-signering
                      </span>
                    </li>
                    
                    <li className="flex items-start gap-2">
                      {plan.features.poweroffice_integration ? (
                        <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : (
                        <X className="h-5 w-5 text-gray-400 mt-0.5" />
                      )}
                      <span className={`text-sm ${!plan.features.poweroffice_integration ? 'text-gray-400' : ''}`}>
                        PowerOffice Go
                      </span>
                    </li>
                    
                    <li className="flex items-start gap-2">
                      {plan.features.advanced_reports ? (
                        <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : (
                        <X className="h-5 w-5 text-gray-400 mt-0.5" />
                      )}
                      <span className={`text-sm ${!plan.features.advanced_reports ? 'text-gray-400' : ''}`}>
                        Avanserte rapporter
                      </span>
                    </li>
                    
                    <li className="flex items-start gap-2">
                      {plan.features.priority_support ? (
                        <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : (
                        <X className="h-5 w-5 text-gray-400 mt-0.5" />
                      )}
                      <span className={`text-sm ${!plan.features.priority_support ? 'text-gray-400' : ''}`}>
                        Prioritert support
                      </span>
                    </li>
                  </ul>
                  
                  {!isCurrent && (
                    <Button
                      className="w-full"
                      variant={planKey === 'enterprise' ? 'default' : 'outline'}
                      onClick={() => handleChangePlan(planKey)}
                      disabled={changePlanMutation.isPending}
                    >
                      {planKey === 'enterprise' ? 'Kontakt salg' : 
                       currentPlan === 'enterprise' || 
                       (currentPlan === 'pro' && planKey === 'basic') ? 'Nedgrader' : 'Oppgrader'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Billing section */}
        <Card>
          <CardHeader>
            <CardTitle>Fakturering</CardTitle>
            <CardDescription>
              Administrer betalingsmetoder og fakturaadresse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertDescription>
                Fakturering via Stripe kommer snart. I mellomtiden sender vi faktura på e-post.
              </AlertDescription>
            </Alert>
            
            <div className="mt-4 space-y-2">
              <Button variant="outline" disabled>
                <CreditCard className="mr-2 h-4 w-4" />
                Legg til betalingsmetode
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Change plan dialog */}
        <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedPlan === 'enterprise' ? 'Kontakt salg' : 'Bekreft planendring'}
              </DialogTitle>
              <DialogDescription>
                {selectedPlan === 'enterprise' ? (
                  'For Enterprise-planen, kontakt vårt salgsteam for en skreddersydd løsning.'
                ) : (
                  `Er du sikker på at du vil endre til ${selectedPlan}-planen?`
                )}
              </DialogDescription>
            </DialogHeader>
            
            {selectedPlan !== 'enterprise' && (
              <div className="py-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Endringen trer i kraft umiddelbart. Du vil bli fakturert proporsjonalt
                    for gjenstående periode.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            <DialogFooter>
              {selectedPlan === 'enterprise' ? (
                <Button onClick={() => window.open('mailto:salg@forhandlerpro.no', '_blank')}>
                  Kontakt salg
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>
                    Avbryt
                  </Button>
                  <Button 
                    onClick={confirmChangePlan}
                    disabled={changePlanMutation.isPending}
                  >
                    {changePlanMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Endrer...
                      </>
                    ) : (
                      'Bekreft endring'
                    )}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}