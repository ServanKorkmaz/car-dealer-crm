import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Building, 
  Save, 
  Loader2, 
  AlertCircle,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

const orgSchema = z.object({
  name: z.string().min(2, 'Navn må være minst 2 tegn'),
  orgnr: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

type OrgFormData = z.infer<typeof orgSchema>;

export function SettingsOrganization() {
  const { currentOrg, refreshUser } = useAuth();
  const { isOwnerOrAdmin, isOwner } = usePermissions();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(currentOrg?.logo_url || '');

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<OrgFormData>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: currentOrg?.name || '',
      orgnr: currentOrg?.orgnr || '',
      address: currentOrg?.address || '',
      phone: currentOrg?.phone || '',
    },
  });

  const onSubmit = async (data: OrgFormData) => {
    if (!currentOrg || !isOwnerOrAdmin()) return;

    setIsLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase
        .from('organizations')
        .update({
          ...data,
          logo_url: logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentOrg.id);

      if (error) throw error;

      await refreshUser();
      toast({
        title: 'Lagret',
        description: 'Organisasjonsinnstillinger ble oppdatert',
      });
    } catch (error) {
      console.error('Update org error:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke oppdatere organisasjon',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOrg = async () => {
    if (!currentOrg || !isOwner()) return;

    setIsLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', currentOrg.id);

      if (error) throw error;

      toast({
        title: 'Organisasjon slettet',
        description: 'Organisasjonen og all tilknyttet data er slettet',
      });

      // Redirect to onboarding
      window.location.href = '/onboarding';
    } catch (error) {
      console.error('Delete org error:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette organisasjon',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // TODO: Implement actual file upload
    // For now, just show a placeholder
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (!currentOrg) {
    return (
      <MainLayout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Ingen organisasjon valgt
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  if (!isOwnerOrAdmin()) {
    return (
      <MainLayout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Du har ikke tilgang til disse innstillingene
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Organisasjon</h1>
          <p className="text-muted-foreground">
            Administrer organisasjonsinnstillinger og informasjon
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Organisasjonsinformasjon</CardTitle>
            <CardDescription>
              Oppdater grunnleggende informasjon om din forhandler
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Logo */}
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <div className="relative">
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="w-24 h-24 rounded-lg object-cover border"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setLogoUrl('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <Building className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      <Button type="button" variant="outline" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          Last opp logo
                        </span>
                      </Button>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG eller SVG. Maks 2MB.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Organization details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Navn *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgnr">Organisasjonsnummer</Label>
                  <Input
                    id="orgnr"
                    {...register('orgnr')}
                    placeholder="123 456 789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    placeholder="+47 123 45 678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">URL-slug</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      forhandlerpro.no/
                    </span>
                    <Input
                      id="slug"
                      value={currentOrg.slug}
                      disabled
                      className="rounded-l-none bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Textarea
                  id="address"
                  {...register('address')}
                  placeholder="Gateadresse 123, 0123 Oslo"
                  rows={3}
                />
              </div>

              <div className="flex justify-between">
                <Button
                  type="submit"
                  disabled={!isDirty || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Lagrer...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Lagre endringer
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Danger zone */}
        {isOwner() && (
          <Card className="mt-6 border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="text-red-600">Faresone</CardTitle>
              <CardDescription>
                Irreversible handlinger. Vær forsiktig.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Slett organisasjon
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Er du helt sikker?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Dette vil permanent slette {currentOrg.name} og all tilknyttet data
                      inkludert biler, kunder, kontrakter og brukere. Denne handlingen kan
                      ikke angres.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteOrg}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Ja, slett alt
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}