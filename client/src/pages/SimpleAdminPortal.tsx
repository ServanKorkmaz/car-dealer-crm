import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Activity, BarChart3, Shield, AlertCircle, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import Sidebar from '@/components/layout/Sidebar';

export default function SimpleAdminPortal() {
  const { user, company } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Check if user has admin rights
  // For development, allow all authenticated users to see admin portal
  const isAdmin = user ? true : false; // Temporarily allow all logged-in users

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Ingen tilgang
            </CardTitle>
            <CardDescription>
              Du må være administrator eller eier for å se denne siden.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-6 space-y-6">
        {/* Back button and Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/">
              <Button variant="ghost" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tilbake til Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Admin Portal
            </h1>
            <p className="text-muted-foreground mt-1">
              Administrer systemet og se aktivitet
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              {company?.name || 'Forhandler'}
            </Badge>
            <Badge variant={user?.role === 'owner' ? 'default' : 'secondary'}>
              {user?.role === 'owner' ? 'Eier' : 'Admin'}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Oversikt
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Brukere
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Aktivitet
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <SystemOverview />
          </TabsContent>
          
          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
          
          <TabsContent value="activity" className="space-y-4">
            <ActivityLog />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SystemOverview() {
  const { data: stats } = useQuery({
    queryKey: ['/api/admin/stats'],
    enabled: false // Disabled until we have the API endpoint
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Totale brukere</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">12</div>
          <p className="text-xs text-muted-foreground">+2 fra forrige måned</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Aktive biler</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">45</div>
          <p className="text-xs text-muted-foreground">8 solgt denne måneden</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Kontrakter</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">23</div>
          <p className="text-xs text-muted-foreground">+5 denne uken</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">API-kall i dag</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">1,247</div>
          <p className="text-xs text-muted-foreground">Normal aktivitet</p>
        </CardContent>
      </Card>
    </div>
  );
}

function UserManagement() {
  // Mock data - replace with real API call
  const users = [
    { id: 1, name: "Ola Nordmann", email: "ola@example.com", role: "owner", status: "active", lastActive: "2 min siden" },
    { id: 2, name: "Kari Hansen", email: "kari@example.com", role: "admin", status: "active", lastActive: "15 min siden" },
    { id: 3, name: "Per Jensen", email: "per@example.com", role: "sales", status: "active", lastActive: "1 time siden" },
    { id: 4, name: "Lisa Olsen", email: "lisa@example.com", role: "workshop", status: "inactive", lastActive: "3 dager siden" },
  ];

  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      owner: { label: "Eier", variant: "default" },
      admin: { label: "Admin", variant: "secondary" },
      sales: { label: "Selger", variant: "outline" },
      workshop: { label: "Verksted", variant: "outline" },
    };
    const config = variants[role] || { label: role, variant: "outline" };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brukeradministrasjon</CardTitle>
        <CardDescription>
          Administrer brukere og deres roller
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map(user => (
            <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
                <div className="text-xs text-muted-foreground">Sist aktiv: {user.lastActive}</div>
              </div>
              <div className="flex items-center gap-2">
                {getRoleBadge(user.role)}
                <Badge variant={user.status === 'active' ? 'outline' : 'secondary'}>
                  {user.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                </Badge>
                <Button variant="outline" size="sm">Rediger</Button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-6 border-t">
          <Button className="w-full">Inviter ny bruker</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityLog() {
  // Mock activity data
  const activities = [
    { id: 1, user: "Ola Nordmann", action: "Opprettet ny kontrakt", target: "#K-2024-023", time: "2 min siden", type: "create" },
    { id: 2, user: "Kari Hansen", action: "Oppdaterte bil", target: "Tesla Model 3", time: "15 min siden", type: "update" },
    { id: 3, user: "Per Jensen", action: "La til ny kunde", target: "Erik Svendsen", time: "1 time siden", type: "create" },
    { id: 4, user: "System", action: "Automatisk backup fullført", target: "", time: "2 timer siden", type: "system" },
    { id: 5, user: "Lisa Olsen", action: "Slettet dokument", target: "Gammel kontrakt", time: "3 timer siden", type: "delete" },
  ];

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'create': return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'update': return <div className="w-2 h-2 bg-blue-500 rounded-full" />;
      case 'delete': return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      case 'system': return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
      default: return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktivitetslogg</CardTitle>
        <CardDescription>
          Siste hendelser i systemet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map(activity => (
            <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="mt-1.5">
                {getActionIcon(activity.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{activity.user}</span>
                  <span className="text-sm text-muted-foreground">{activity.action}</span>
                  {activity.target && (
                    <span className="text-sm font-medium text-primary">{activity.target}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{activity.time}</div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-6 border-t">
          <Button variant="outline" className="w-full">Se full historikk</Button>
        </div>
      </CardContent>
    </Card>
  );
}