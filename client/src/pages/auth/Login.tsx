import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Car, Loader2, AlertCircle, TrendingUp, Shield } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Ugyldig e-postadresse'),
  password: z.string().min(1, 'Passord er påkrevd'),
  remember: z.boolean().default(false)
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false
    }
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await signIn(data.email, data.password, data.remember);
      if (success) {
        toast({
          title: 'Velkommen tilbake!',
          description: 'Du er nå logget inn.',
        });
        // Force a short delay to ensure auth state is updated
        setTimeout(() => {
          setLocation('/');
          window.location.reload(); // Ensure auth state is properly loaded
        }, 500);
      } else {
        setError('Ugyldig e-post eller passord');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError('En feil oppstod. Vennligst prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick login helpers for demo - set form values and submit
  const quickLogin = (email: string, password: string) => {
    form.setValue('email', email);
    form.setValue('password', password);
    form.setValue('remember', true);
    form.handleSubmit(onSubmit)();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login form */}
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Car className="text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Logg inn til ForhandlerPRO
          </CardTitle>
          <CardDescription className="text-center">
            Skriv inn din e-post og passord for å fortsette
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                {...form.register('email')}
                disabled={isLoading}
                className={form.formState.errors.email ? 'border-red-500' : ''}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passord</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...form.register('password')}
                disabled={isLoading}
                className={form.formState.errors.password ? 'border-red-500' : ''}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  {...form.register('remember')}
                  disabled={isLoading}
                />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                  Husk meg
                </Label>
              </div>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Glemt passord?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logger inn...
                </>
              ) : (
                'Logg inn'
              )}
            </Button>
          </form>

          {/* Demo credentials */}
          <Card className="mt-6 bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Test innlogging</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span>
                  <span className="font-medium">Admin:</span> admin@forhandlerpro.no
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => quickLogin('admin@forhandlerpro.no', 'ForhandlerPRO2025!')}
                >
                  Bruk
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span>
                  <span className="font-medium">Bruker:</span> ole@hansenbil.no
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => quickLogin('ole@hansenbil.no', 'test123')}
                >
                  Bruk
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Har du ikke en konto?{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Opprett konto
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Right side - Feature highlights */}
      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-8">
        <div className="max-w-md space-y-8">
          <h2 className="text-3xl font-bold">Alt du trenger for din bilforhandler</h2>
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <Car className="h-8 w-8 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Komplett bilhåndtering</h3>
                <p className="text-sm text-muted-foreground">
                  Administrer hele ditt lager med bilder, priser og dokumentasjon
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <TrendingUp className="h-8 w-8 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Avanserte analyser</h3>
                <p className="text-sm text-muted-foreground">
                  Få innsikt i salg, lønnsomhet og kundeadferd
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <Shield className="h-8 w-8 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Sikker og pålitelig</h3>
                <p className="text-sm text-muted-foreground">
                  GDPR-kompatibel med automatisk backup og høy oppetid
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}