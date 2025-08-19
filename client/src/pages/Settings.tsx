import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users, UserPlus, Shield, Mail } from 'lucide-react';
import TeamManagement from '@/components/settings/TeamManagement';

export default function SettingsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  
  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900" />;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center">
            <Settings className="mr-2 h-6 w-6" />
            Innstillinger
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Administrer ditt team og systeminnstillinger
          </p>
        </div>

        <Tabs defaultValue="team" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="team" className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center">
              <Mail className="mr-2 h-4 w-4" />
              Varsler
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center">
              <Shield className="mr-2 h-4 w-4" />
              Sikkerhet
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <TeamManagement />
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Varselinnstillinger</CardTitle>
                <CardDescription>
                  Konfigurer hvordan og når du mottar varsler
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Varselinnstillinger vil bli implementert i en senere versjon.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Sikkerhetsinnstillinger</CardTitle>
                <CardDescription>
                  Administrer sikkerhet og tilgangskontroll
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Sikkerhetsinnstillinger vil bli implementert i en senere versjon.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}