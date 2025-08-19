import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Building, 
  Package, 
  Users, 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check
} from 'lucide-react';
import { PLAN_PRICING, type PlanType } from '@shared/auth-types';

// Form schemas for each step
const orgInfoSchema = z.object({
  name: z.string().min(2, 'Navn må være minst 2 tegn'),
  orgnr: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

const inviteSchema = z.object({
  invites: z.array(z.object({
    email: z.string().email().optional().or(z.literal('')),
    role: z.enum(['admin', 'sales', 'workshop', 'accountant', 'viewer']),
  })),
});

type OrgInfoData = z.infer<typeof orgInfoSchema>;
type InviteData = z.infer<typeof inviteSchema>;

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('basic');
  const [orgData, setOrgData] = useState<OrgInfoData | null>(null);

  const steps = [
    { number: 1, title: 'Om forhandleren', icon: Building },
    { number: 2, title: 'Velg pakke', icon: Package },
    { number: 3, title: 'Inviter teamet', icon: Users },
    { number: 4, title: 'Ferdig', icon: CheckCircle },
  ];

  const {
    register: registerOrgInfo,
    handleSubmit: handleOrgInfoSubmit,
    formState: { errors: orgInfoErrors },
  } = useForm<OrgInfoData>({
    resolver: zodResolver(orgInfoSchema),
    defaultValues: orgData || {},
  });

  const {
    register: registerInvites,
    handleSubmit: handleInvitesSubmit,
    formState: { errors: inviteErrors },
  } = useForm<InviteData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      invites: [
        { email: '', role: 'sales' },
        { email: '', role: 'sales' },
        { email: '', role: 'viewer' },
      ],
    },
  });

  const handleOrgInfoNext = (data: OrgInfoData) => {
    setOrgData(data);
    setCurrentStep(2);
  };

  const handlePlanNext = () => {
    setCurrentStep(3);
  };

  const handleInvitesNext = async (data: InviteData) => {
    setIsLoading(true);
    setError(null);

    try {
      // For development without Supabase
      const { isSupabaseConfigured } = await import('@/lib/supabase');
      
      if (!isSupabaseConfigured) {
        // Mock organization creation for development
        const mockOrg = {
          id: 'mock-org-123',
          name: orgData?.name || 'Test Organization',
          slug: orgData?.name?.toLowerCase().replace(/\s+/g, '-') || 'test-org',
          orgnr: orgData?.orgnr,
          address: orgData?.address,
          phone: orgData?.phone,
          created_at: new Date(),
          updated_at: new Date(),
        };
        
        localStorage.setItem('mockOrg', JSON.stringify(mockOrg));
        await refreshUser();
        setCurrentStep(4);
        return;
      }

      // Create organization with Supabase
      const response = await fetch('/api/auth/org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          ...orgData,
          plan: selectedPlan,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Kunne ikke opprette organisasjon');
      }

      const result = await response.json();
      const orgId = result.organization.id;

      // Send invites (if any valid emails)
      const validInvites = data.invites.filter(inv => inv.email && inv.email.length > 0);
      for (const invite of validInvites) {
        await fetch(`/api/auth/invites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAuthToken()}`,
          },
          body: JSON.stringify({
            orgId,
            email: invite.email,
            role: invite.role,
          }),
        });
      }

      // Refresh user data to get new org
      await refreshUser();
      
      setCurrentStep(4);
    } catch (error: any) {
      console.error('Onboarding error:', error);
      setError(error.message || 'Noe gikk galt. Prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    toast({
      title: 'Velkommen til ForhandlerPRO!',
      description: 'Din organisasjon er klar til bruk.',
    });
    setLocation('/');
  };

  const getAuthToken = async () => {
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress steps */}
        <div className="mb-8 mt-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.number === currentStep;
              const isCompleted = step.number < currentStep;
              
              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center
                        ${isActive ? 'bg-primary text-white' : ''}
                        ${isCompleted ? 'bg-green-500 text-white' : ''}
                        ${!isActive && !isCompleted ? 'bg-gray-200 dark:bg-gray-700 text-gray-500' : ''}
                      `}
                    >
                      {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`mt-2 text-sm ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`
                      flex-1 h-1 mx-4 mt-[-20px]
                      ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <Card className="mb-8">
          {currentStep === 1 && (
            <>
              <CardHeader>
                <CardTitle>Om forhandleren</CardTitle>
                <CardDescription>
                  Fortell oss litt om din bilforhandler
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleOrgInfoSubmit(handleOrgInfoNext)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Forhandlernavn *</Label>
                    <Input
                      id="name"
                      placeholder="F.eks. Oslo Bilsenter AS"
                      {...registerOrgInfo('name')}
                      className={orgInfoErrors.name ? 'border-red-500' : ''}
                    />
                    {orgInfoErrors.name && (
                      <p className="text-sm text-red-500">{orgInfoErrors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orgnr">Organisasjonsnummer</Label>
                    <Input
                      id="orgnr"
                      placeholder="123 456 789"
                      {...registerOrgInfo('orgnr')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Textarea
                      id="address"
                      placeholder="Gateadresse 123, 0123 Oslo"
                      {...registerOrgInfo('address')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      placeholder="+47 123 45 678"
                      {...registerOrgInfo('phone')}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit">
                      Neste
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </>
          )}

          {currentStep === 2 && (
            <>
              <CardHeader>
                <CardTitle>Velg pakke</CardTitle>
                <CardDescription>
                  Velg pakken som passer best for din forhandler
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {Object.entries(PLAN_PRICING).map(([key, plan]) => {
                    const isSelected = selectedPlan === key;
                    const planKey = key as PlanType;
                    
                    return (
                      <Card
                        key={key}
                        className={`cursor-pointer transition-all ${
                          isSelected ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedPlan(planKey)}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{plan.name}</CardTitle>
                            {isSelected && <CheckCircle className="w-5 h-5 text-primary" />}
                          </div>
                          <div className="mt-2">
                            {plan.price > 0 ? (
                              <div className="text-2xl font-bold">
                                {plan.price} {plan.currency}
                                <span className="text-sm font-normal text-muted-foreground">
                                  /{plan.interval}
                                </span>
                              </div>
                            ) : (
                              <div className="text-2xl font-bold">Kontakt oss</div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-center">
                              <Check className="w-4 h-4 mr-2 text-green-500" />
                              {plan.features.max_cars === -1 ? 'Ubegrenset' : plan.features.max_cars} biler
                            </li>
                            <li className="flex items-center">
                              <Check className="w-4 h-4 mr-2 text-green-500" />
                              {plan.features.max_users === -1 ? 'Ubegrenset' : plan.features.max_users} brukere
                            </li>
                            {plan.features.e_sign && (
                              <li className="flex items-center">
                                <Check className="w-4 h-4 mr-2 text-green-500" />
                                E-signering
                              </li>
                            )}
                            {plan.features.poweroffice_integration && (
                              <li className="flex items-center">
                                <Check className="w-4 h-4 mr-2 text-green-500" />
                                PowerOffice Go
                              </li>
                            )}
                            {plan.features.advanced_reports && (
                              <li className="flex items-center">
                                <Check className="w-4 h-4 mr-2 text-green-500" />
                                Avanserte rapporter
                              </li>
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    14 dagers gratis prøveperiode på alle pakker. Ingen kredittkort påkrevd.
                  </AlertDescription>
                </Alert>

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tilbake
                  </Button>
                  <Button onClick={handlePlanNext}>
                    Neste
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 3 && (
            <>
              <CardHeader>
                <CardTitle>Inviter teamet</CardTitle>
                <CardDescription>
                  Inviter medarbeidere til din organisasjon (valgfritt)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInvitesSubmit(handleInvitesNext)} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="epost@example.com"
                          {...registerInvites(`invites.${index}.email`)}
                          className="flex-1"
                        />
                        <select
                          {...registerInvites(`invites.${index}.role`)}
                          className="px-3 py-2 border rounded-md"
                        >
                          <option value="admin">Admin</option>
                          <option value="sales">Selger</option>
                          <option value="workshop">Verksted</option>
                          <option value="accountant">Regnskapsfører</option>
                          <option value="viewer">Leser</option>
                        </select>
                      </div>
                    ))}
                  </div>

                  <Alert>
                    <AlertDescription>
                      Du kan alltid invitere flere medarbeidere senere fra innstillinger.
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-between">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setCurrentStep(2)}
                      disabled={isLoading}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Tilbake
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Oppretter...
                        </>
                      ) : (
                        <>
                          Fullfør
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </>
          )}

          {currentStep === 4 && (
            <>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    Alt klart!
                  </div>
                </CardTitle>
                <CardDescription>
                  Din organisasjon er opprettet og klar til bruk
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Hva skjer nå?</h3>
                  <ul className="space-y-1 text-sm">
                    <li>✓ Din 14-dagers prøveperiode har startet</li>
                    <li>✓ Invitasjoner er sendt til teamet ditt</li>
                    <li>✓ Du kan begynne å legge til biler og kunder</li>
                  </ul>
                </div>

                <Button onClick={handleComplete} className="w-full">
                  Gå til dashboard
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}