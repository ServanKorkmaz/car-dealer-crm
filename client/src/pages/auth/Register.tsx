import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Car, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email('Ugyldig e-postadresse'),
  password: z.string().min(6, 'Passord må være minst 6 tegn'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passordene må være like',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    token: string;
    email: string;
    role: string;
    companyName: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Handle invite parameters from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('invite');
    const inviteEmail = urlParams.get('email');
    const inviteRole = urlParams.get('role');

    if (inviteToken && inviteEmail && inviteRole) {
      setInviteInfo({
        token: inviteToken,
        email: inviteEmail,
        role: inviteRole,
        companyName: 'Forhandleren' // This would come from the invite data
      });
      // Pre-fill email field
      setValue('email', inviteEmail);
    }
  }, [setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { isSupabaseConfigured } = await import('@/lib/supabase');
      
      await signUp(data.email, data.password);
      
      // If this is an invited user, automatically add them to the organization
      if (inviteInfo) {
        try {
          // TODO: Add user to organization with the invite role
          console.log('User registered via invite:', inviteInfo);
          // This would be implemented to automatically join the organization
        } catch (orgError) {
          console.error('Failed to add user to organization:', orgError);
        }
      }
      
      setSuccess(true);
      
      if (isSupabaseConfigured) {
        toast({
          title: 'Konto opprettet!',
          description: inviteInfo 
            ? `Velkommen til ${inviteInfo.companyName}! Sjekk e-posten din for å bekrefte kontoen.`
            : 'Sjekk e-posten din for å bekrefte kontoen.',
        });
      } else {
        // In development mode, skip email verification
        toast({
          title: 'Konto opprettet!',
          description: inviteInfo 
            ? `Velkommen til ${inviteInfo.companyName}! Du kan nå logge inn.`
            : 'Du kan nå logge inn.',
        });
      }

      // Redirect to login or onboarding
      setTimeout(() => {
        if (isSupabaseConfigured) {
          setLocation('/login');
        } else {
          setLocation(inviteInfo ? '/dashboard' : '/onboarding');
        }
      }, 2000);
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Kunne ikke opprette konto. Prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Car className="text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            {inviteInfo ? 'Fullfør registrering' : 'Opprett ForhandlerPRO-konto'}
          </CardTitle>
          <CardDescription className="text-center">
            {inviteInfo 
              ? `Du er invitert til ${inviteInfo.companyName} som ${inviteInfo.role}`
              : 'Start din 14-dagers gratis prøveperiode'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Konto opprettet! Du blir videresendt...
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {inviteInfo && (
                <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    <strong>Invitasjon godtatt!</strong><br />
                    Du registrerer deg som <strong>{inviteInfo.role}</strong> hos <strong>{inviteInfo.companyName}</strong>.
                    Du vil automatisk få tilgang til organisasjonen når kontoen er opprettet.
                  </AlertDescription>
                </Alert>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="din@epost.no"
                  {...register('email')}
                  disabled={isLoading || !!inviteInfo}
                  className={errors.email ? 'border-red-500' : ''}
                  data-testid="input-email"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Passord</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minst 6 tegn"
                  {...register('password')}
                  disabled={isLoading}
                  className={errors.password ? 'border-red-500' : ''}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Bekreft passord</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Skriv passord på nytt"
                  {...register('confirmPassword')}
                  disabled={isLoading}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Oppretter konto...
                  </>
                ) : (
                  'Opprett konto'
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Ved å opprette en konto godtar du våre{' '}
                <a href="/terms" className="underline">vilkår</a> og{' '}
                <a href="/privacy" className="underline">personvernerklæring</a>.
              </p>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Har du allerede en konto?{' '}
              <Link href="/login">
                <a className="text-primary hover:underline font-medium">
                  Logg inn
                </a>
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}