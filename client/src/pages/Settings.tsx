import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  User, 
  Building2, 
  Bell, 
  Shield, 
  Users, 
  Mail, 
  Phone, 
  MapPin,
  Upload,
  Save,
  Loader2,
  UserPlus,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { z } from 'zod';
import TeamManagement from '@/components/settings/TeamManagement';

// Form schemas
const profileSchema = z.object({
  fullName: z.string().min(2, 'Navn må være minst 2 tegn'),
  email: z.string().email('Ugyldig e-postadresse'),
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Nåværende passord er påkrevd'),
  newPassword: z.string().min(6, 'Nytt passord må være minst 6 tegn'),
  confirmPassword: z.string().min(1, 'Bekreft nytt passord'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passordene matcher ikke",
  path: ["confirmPassword"],
});

const companySchema = z.object({
  name: z.string().min(2, 'Firmanavn må være minst 2 tegn'),
  organizationNumber: z.string()
    .regex(/^\d{9}$/, 'Organisasjonsnummer må være 9 siffer')
    .optional()
    .or(z.literal('')),
  address: z.string().optional(),
});

const notificationSchema = z.object({
  notificationsEmail: z.boolean(),
  notificationsSms: z.boolean(),
  notificationsSystem: z.boolean(),
  language: z.enum(['no', 'en']),
  timezone: z.string(),
  currency: z.string(),
});

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { data: roleData } = useUserRole();
  const role = roleData?.role;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Forms
  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const companyForm = useForm({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      organizationNumber: '',
      address: '',
    },
  });

  const notificationForm = useForm({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      notificationsEmail: true,
      notificationsSms: false,
      notificationsSystem: true,
      language: 'no' as const,
      timezone: 'Europe/Oslo',
      currency: 'NOK',
    },
  });

  // Load user settings
  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings/user'],
    enabled: !!user,
  });

  // Load company settings
  const { data: companySettings } = useQuery({
    queryKey: ['/api/settings/company'],
    enabled: !!user,
  });

  // Update forms when data loads
  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : '',
        email: user?.email || '',
        phone: '', // Will be loaded from userSettings
      });
    }
  }, [user, profileForm]);

  useEffect(() => {
    if (user) {
      companyForm.reset({
        name: '',
        organizationNumber: '',
        address: '',
      });
    }
  }, [user, companyForm]);

  useEffect(() => {
    if (userSettings) {
      notificationForm.reset({
        notificationsEmail: userSettings?.notificationsEmail ?? true,
        notificationsSms: userSettings?.notificationsSms ?? false,
        notificationsSystem: userSettings?.notificationsSystem ?? true,
        language: (userSettings?.language as 'no' | 'en') ?? 'no',
        timezone: userSettings?.timezone ?? 'Europe/Oslo',
        currency: userSettings?.currency ?? 'NOK',
      });
    }
  }, [userSettings, notificationForm]);

  useEffect(() => {
    if (companySettings) {
      companyForm.reset({
        name: companySettings.name || '',
        organizationNumber: companySettings.organizationNumber || '',
        address: companySettings.address || '',
      });
    }
  }, [companySettings, companyForm]);

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      const response = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Profil oppdatert',
        description: 'Profilinformasjonen din er lagret',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil ved oppdatering',
        description: error.message || 'Kunne ikke oppdatere profil',
        variant: 'destructive',
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordSchema>) => {
      const response = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update password');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Passord endret',
        description: 'Passordet ditt er oppdatert',
      });
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Feil ved passordendring',
        description: error.message || 'Kunne ikke endre passord',
        variant: 'destructive',
      });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: z.infer<typeof companySchema>) => {
      const response = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update company');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Firmainfo oppdatert',
        description: 'Firmainformasjonen er lagret',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/company'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil ved oppdatering',
        description: error.message || 'Kunne ikke oppdatere firmainfo',
        variant: 'destructive',
      });
    },
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof notificationSchema>) => {
      const response = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update notifications');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Innstillinger lagret',
        description: 'Varselinnstillingene dine er oppdatert',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/user'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil ved lagring',
        description: error.message || 'Kunne ikke lagre innstillinger',
        variant: 'destructive',
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900" />;
  }

  const getRoleLabel = (userRole: string) => {
    const labels: Record<string, string> = {
      'EIER': 'Eier',
      'ADMIN': 'Administrator', 
      'SELGER': 'Selger',
      'VERKSTED': 'Verksted',
      'REGNSKAP': 'Regnskap',
      'VIEWER': 'Visning',
    };
    return labels[userRole] || userRole;
  };

  const getRoleColor = (userRole: string) => {
    const colors: Record<string, string> = {
      'EIER': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'ADMIN': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'SELGER': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'VERKSTED': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'REGNSKAP': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'VIEWER': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return colors[userRole] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
            <Settings className="mr-3 h-8 w-8" />
            Innstillinger
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Administrer profil, firma og systeminnstillinger
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center" data-testid="tab-profile">
              <User className="mr-2 h-4 w-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center" data-testid="tab-company">
              <Building2 className="mr-2 h-4 w-4" />
              Firma
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center" data-testid="tab-notifications">
              <Bell className="mr-2 h-4 w-4" />
              Varsler
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center" data-testid="tab-team">
              <Users className="mr-2 h-4 w-4" />
              Team
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* User Profile */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Brukerprofil
                  </CardTitle>
                  <CardDescription>
                    Oppdater din personlige informasjon
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={profileForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fullt navn</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ditt fulle navn" 
                                {...field} 
                                data-testid="input-fullname"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-post</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="din@epost.no" 
                                {...field} 
                                data-testid="input-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefon</FormLabel>
                            <FormControl>
                              <Input 
                                type="tel" 
                                placeholder="+47 123 45 678" 
                                {...field} 
                                data-testid="input-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center space-x-2">
                        <Label>Din rolle:</Label>
                        <Badge className={getRoleColor(role || '')} data-testid="badge-role">
                          {getRoleLabel(role || '')}
                        </Badge>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                        className="w-full"
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Lagrer...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Lagre profil
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Password Change */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Endre passord
                  </CardTitle>
                  <CardDescription>
                    Oppdater passordet ditt for økt sikkerhet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit((data) => updatePasswordMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nåværende passord</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showCurrentPassword ? "text" : "password"}
                                  placeholder="Skriv inn nåværende passord" 
                                  {...field} 
                                  data-testid="input-current-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                  data-testid="toggle-current-password"
                                >
                                  {showCurrentPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nytt passord</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showNewPassword ? "text" : "password"}
                                  placeholder="Skriv inn nytt passord" 
                                  {...field} 
                                  data-testid="input-new-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                  data-testid="toggle-new-password"
                                >
                                  {showNewPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bekreft nytt passord</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Bekreft nytt passord" 
                                {...field} 
                                data-testid="input-confirm-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        disabled={updatePasswordMutation.isPending}
                        className="w-full"
                        data-testid="button-save-password"
                      >
                        {updatePasswordMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Endrer passord...
                          </>
                        ) : (
                          <>
                            <Shield className="mr-2 h-4 w-4" />
                            Endre passord
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Company Tab */}
          <TabsContent value="company" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="mr-2 h-5 w-5" />
                  Firmainformasjon
                </CardTitle>
                <CardDescription>
                  Administrer firmaopplysninger og logo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...companyForm}>
                  <form onSubmit={companyForm.handleSubmit((data) => updateCompanyMutation.mutate(data))} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={companyForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Firmanavn</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ditt firma AS" 
                                {...field} 
                                data-testid="input-company-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={companyForm.control}
                        name="organizationNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organisasjonsnummer</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="123456789" 
                                maxLength={9}
                                {...field} 
                                data-testid="input-org-number"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={companyForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adresse</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Gateadresse, postnummer, poststed" 
                              {...field} 
                              data-testid="input-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <div className="space-y-4">
                      <Label className="text-sm font-medium">Firmalogo</Label>
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
                          <Building2 className="h-8 w-8 text-slate-400" />
                        </div>
                        <div className="flex-1">
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="w-full"
                            data-testid="button-upload-logo"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Last opp logo
                          </Button>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG eller SVG. Maks 2MB.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={updateCompanyMutation.isPending}
                      className="w-full"
                      data-testid="button-save-company"
                    >
                      {updateCompanyMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Lagrer...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Lagre firmainformasjon
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="mr-2 h-5 w-5" />
                  Varsel & Preferanser
                </CardTitle>
                <CardDescription>
                  Konfigurer hvordan og når du mottar varsler
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit((data) => updateNotificationsMutation.mutate(data))} className="space-y-6">
                    
                    {/* Notification Settings */}
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Varselinnstillinger</Label>
                      
                      <div className="space-y-4">
                        <FormField
                          control={notificationForm.control}
                          name="notificationsEmail"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <div className="flex items-center">
                                  <Mail className="mr-2 h-4 w-4" />
                                  <FormLabel className="text-base">E-postvarsler</FormLabel>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Motta varsler på e-post
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-email-notifications"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationForm.control}
                          name="notificationsSms"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <div className="flex items-center">
                                  <Phone className="mr-2 h-4 w-4" />
                                  <FormLabel className="text-base">SMS-varsler</FormLabel>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Motta viktige varsler på SMS
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-sms-notifications"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationForm.control}
                          name="notificationsSystem"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <div className="flex items-center">
                                  <Bell className="mr-2 h-4 w-4" />
                                  <FormLabel className="text-base">Systemvarsler</FormLabel>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Vis varsler i systemet
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-system-notifications"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Language & Regional Settings */}
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Språk & Region</Label>
                      
                      <div className="grid gap-4 md:grid-cols-3">
                        <FormField
                          control={notificationForm.control}
                          name="language"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Språk</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-language">
                                    <SelectValue placeholder="Velg språk" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="no">Norsk</SelectItem>
                                  <SelectItem value="en">English</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationForm.control}
                          name="timezone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tidssone</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-timezone">
                                    <SelectValue placeholder="Velg tidssone" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Europe/Oslo">Europe/Oslo</SelectItem>
                                  <SelectItem value="Europe/Copenhagen">Europe/Copenhagen</SelectItem>
                                  <SelectItem value="Europe/Stockholm">Europe/Stockholm</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationForm.control}
                          name="currency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valuta</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-currency">
                                    <SelectValue placeholder="Velg valuta" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="NOK">NOK - Norske kroner</SelectItem>
                                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={updateNotificationsMutation.isPending}
                      className="w-full"
                      data-testid="button-save-notifications"
                    >
                      {updateNotificationsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Lagrer...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Lagre innstillinger
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab - Reuse existing component */}
          <TabsContent value="team">
            <TeamManagement />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}