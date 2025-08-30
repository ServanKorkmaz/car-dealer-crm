import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Settings,
  User,
  Shield,
  Bell,
  Building2,
  Users,
  ChevronRight,
  ArrowLeft,
  UserPlus,
} from 'lucide-react';
// Simple settings components without MainLayout
const ProfileSettings = () => (
  <div className="space-y-6">
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
        <div className="space-y-4">
          <div>
            <Label>Fullt navn</Label>
            <Input placeholder="Skriv inn ditt fulle navn" />
          </div>
          <div>
            <Label>E-post</Label>
            <Input type="email" placeholder="din@epost.no" />
          </div>
          <div>
            <Label>Telefon</Label>
            <Input placeholder="+47 123 45 678" />
          </div>
          <Button>Lagre endringer</Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

const SecuritySettings = () => (
  <div className="space-y-6">
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
        <div className="space-y-4">
          <div>
            <Label>Nåværende passord</Label>
            <Input type="password" placeholder="Skriv inn nåværende passord" />
          </div>
          <div>
            <Label>Nytt passord</Label>
            <Input type="password" placeholder="Skriv inn nytt passord" />
          </div>
          <div>
            <Label>Bekreft nytt passord</Label>
            <Input type="password" placeholder="Bekreft nytt passord" />
          </div>
          <Button>Endre passord</Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

const NotificationSettings = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="mr-2 h-5 w-5" />
          Varslingsinnstillinger
        </CardTitle>
        <CardDescription>
          Administrer hvordan du mottar varsler
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>E-postvarsler</Label>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <Label>SMS-varsler</Label>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <Label>Systemvarsler</Label>
            <Switch />
          </div>
          <Button>Lagre innstillinger</Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

const CompanySettings = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Building2 className="mr-2 h-5 w-5" />
          Firmainformasjon
        </CardTitle>
        <CardDescription>
          Administrer firmainformasjon og organisasjonsdetaljer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Firmanavn</Label>
            <Input placeholder="Firma AS" />
          </div>
          <div>
            <Label>Organisasjonsnummer</Label>
            <Input placeholder="123456789" />
          </div>
          <div>
            <Label>Adresse</Label>
            <Input placeholder="Firmaadresse 123, 0123 Oslo" />
          </div>
          <Button>Lagre endringer</Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

const TeamSettings = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="mr-2 h-5 w-5" />
          Teamadministrasjon
        </CardTitle>
        <CardDescription>
          Administrer brukere og tilganger
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Inviter ny bruker
          </Button>
          <div className="text-sm text-muted-foreground">
            Teamfunksjonalitet kommer snart...
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Settings items definition
const settingsItems = [
  {
    id: 'profile',
    title: 'Profil',
    titleKey: 'Profil',
    description: 'Administrer personlig informasjon og kontaktdetaljer',
    descriptionKey: 'profile_description',
    icon: User,
  },
  {
    id: 'security', 
    title: 'Sikkerhet',
    titleKey: 'Sikkerhet',
    description: 'Passord, autentisering og sikkerhet',
    descriptionKey: 'security_description',
    icon: Shield,
  },
  {
    id: 'notifications',
    title: 'Varsler',
    titleKey: 'Varsler', 
    description: 'E-post, SMS og systemvarsler, språk og tidssone',
    descriptionKey: 'notifications_description',
    icon: Bell,
  },
  {
    id: 'company',
    title: 'Firma',
    titleKey: 'Firma',
    description: 'Firmainformasjon og organisasjonsdetaljer',
    descriptionKey: 'company_description', 
    icon: Building2,
  },
  {
    id: 'team',
    title: 'Team',
    titleKey: 'Team',
    description: 'Administrer brukere og tilganger',
    descriptionKey: 'team_description',
    icon: Users,
  }
];

export default function SettingsOverviewPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<string | null>(null);

  // Overview component
  const SettingsOverview = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
          <Settings className="mr-3 h-8 w-8" />
          {t('Innstillinger')}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Administrer profil, firma og systeminnstillinger
        </p>
      </div>

      <div className="space-y-2">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card 
              key={item.id}
              className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              onClick={() => setCurrentView(item.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {t(item.titleKey)}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderDetailView = () => {
    // Show specific settings content without the MainLayout wrapper
    switch (currentView) {
      case 'profile':
        return <ProfileSettings />;
      case 'security':
        return <SecuritySettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'company':
        return <CompanySettings />;
      case 'team':
        return <TeamSettings />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Laster innstillinger...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400">Du må være innlogget for å se innstillinger.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show overview if no specific view is selected
  if (!currentView) {
    return (
      <MainLayout>
        <SettingsOverview />
      </MainLayout>
    );
  }

  // Show detail view with back navigation
  const currentItem = settingsItems.find(item => item.id === currentView);
  
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView(null)}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Tilbake til innstillinger</span>
          </Button>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
            {currentItem && <currentItem.icon className="mr-3 h-8 w-8" />}
            {currentItem ? t(currentItem.titleKey) : 'Innstillinger'}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {currentItem?.description || 'Administrer innstillinger'}
          </p>
        </div>
        {renderDetailView()}
      </div>
    </MainLayout>
  );
}