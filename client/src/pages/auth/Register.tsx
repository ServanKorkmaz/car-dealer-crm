import { useState } from 'react';
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
  firstName: z.string().min(1, 'Fornavn er påkrevd'),
  lastName: z.string().min(1, 'Etternavn er påkrevd'),
  companyName: z.string().min(1, 'Bedriftsnavn er påkrevd'),
  orgNumber: z.string().optional(),
  email: z.string().email('Ugyldig e-postadresse'),
  password: z.string().min(8, 'Passord må være minst 8 tegn')
    .regex(/[A-Z]/, 'Passord må inneholde minst én stor bokstav')
    .regex(/[a-z]/, 'Passord må inneholde minst én liten bokstav')
    .regex(/[0-9]/, 'Passord må inneholde minst ett tall'),
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { isSupabaseConfigured } = await import('@/lib/supabase');
      
      await signUp(data.email, data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
        companyName: data.companyName,
        orgNumber: data.orgNumber,
      });
      setSuccess(true);
      
      if (isSupabaseConfigured) {
        toast({
          title: 'Konto opprettet!',
          description: 'Sjekk e-posten din for å bekrefte kontoen.',
        });
      } else {
        // In development mode, skip email verification
        toast({
          title: 'Konto opprettet!',
          description: 'Du kan nå logge inn.',
        });
      }

      // Redirect to login or onboarding
      setTimeout(() => {
        if (isSupabaseConfigured) {
          setLocation('/login');
        } else {
          setLocation('/onboarding');
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
            Opprett ForhandlerPRO-konto
          </CardTitle>
          <CardDescription className="text-center">
            Start din 14-dagers gratis prøveperiode
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
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Fornavn</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Ola"
                    {...register('firstName')}
                    disabled={isLoading}
                    className={errors.firstName ? 'border-red-500' : ''}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-500">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Etternavn</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Hansen"
                    {...register('lastName')}
                    disabled={isLoading}
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-500">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Bedriftsnavn</Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Hansen Bil AS"
                  {...register('companyName')}
                  disabled={isLoading}
                  className={errors.companyName ? 'border-red-500' : ''}
                />
                {errors.companyName && (
                  <p className="text-sm text-red-500">{errors.companyName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgNumber">Organisasjonsnummer (valgfritt)</Label>
                <Input
                  id="orgNumber"
                  type="text"
                  placeholder="123 456 789"
                  {...register('orgNumber')}
                  disabled={isLoading}
                  className={errors.orgNumber ? 'border-red-500' : ''}
                />
                {errors.orgNumber && (
                  <p className="text-sm text-red-500">{errors.orgNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ola@hansenbil.no"
                  {...register('email')}
                  disabled={isLoading}
                  className={errors.email ? 'border-red-500' : ''}
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
                  placeholder="Minst 8 tegn"
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