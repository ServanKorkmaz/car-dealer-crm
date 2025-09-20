import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function InviteAccept() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('Behandler invitasjon...');
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    const acceptInvite = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
          setStatus('error');
          setMessage('Ugyldig invitasjonslenke. Token mangler.');
          return;
        }

        // Try to accept the invitation
        const response = await apiRequest('/api/admin/invite/accept', {
          method: 'POST',
          body: JSON.stringify({ token }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.success) {
          setStatus('success');
          setMessage('Invitasjon godtatt! Du blir omdirigert til dashbordet...');
          setOrgName(response.companyName);
          
          // Redirect to login if not authenticated, otherwise to dashboard
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else {
          setStatus('error');
          setMessage(response.message || 'Kunne ikke godta invitasjon.');
        }
      } catch (error: any) {
        console.error('Invite acceptance error:', error);
        
        if (error.message?.includes('expired')) {
          setStatus('expired');
          setMessage('Invitasjonen har utløpt. Be om en ny invitasjon.');
        } else if (error.message?.includes('already')) {
          setStatus('error');
          setMessage('Du er allerede medlem av denne organisasjonen.');
        } else {
          setStatus('error');
          setMessage('Kunne ikke godta invitasjon. Prøv igjen senere.');
        }
      }
    };

    acceptInvite();
  }, []);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Clock className="h-8 w-8 text-blue-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'expired':
        return <Clock className="h-8 w-8 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-500" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Behandler invitasjon...';
      case 'success':
        return 'Invitasjon godtatt!';
      case 'expired':
        return 'Invitasjon utløpt';
      case 'error':
        return 'Kunne ikke godta invitasjon';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-xl">
            {getTitle()}
          </CardTitle>
          <CardDescription>
            ForhandlerPRO
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            {message}
          </p>
          
          {orgName && (
            <p className="text-sm font-medium">
              Velkommen til <span className="text-primary">{orgName}</span>!
            </p>
          )}

          <div className="flex flex-col gap-2 mt-6">
            {status === 'success' && (
              <Button 
                onClick={() => window.location.href = '/login'}
                className="w-full"
                data-testid="button-login"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Gå til pålogging
              </Button>
            )}
            
            {(status === 'error' || status === 'expired') && (
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="w-full"
                data-testid="button-home"
              >
                Gå til forsiden
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}