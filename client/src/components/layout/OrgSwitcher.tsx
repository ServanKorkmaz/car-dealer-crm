import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Building,
  ChevronDown,
  Plus,
  Settings,
  LogOut,
  User,
  Users,
  CreditCard,
  Check,
} from 'lucide-react';
import { useLocation } from 'wouter';

export function OrgSwitcher() {
  const { user, currentOrg, organizations, switchOrg, signOut, userRole } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleSwitchOrg = async (orgId: string) => {
    if (orgId === currentOrg?.id) return;
    
    setIsLoading(true);
    try {
      await switchOrg(orgId);
    } catch (error) {
      console.error('Failed to switch org:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setLocation('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'sales':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Eier';
      case 'admin':
        return 'Admin';
      case 'sales':
        return 'Selger';
      case 'workshop':
        return 'Verksted';
      case 'accountant':
        return 'Regnskapsfører';
      case 'viewer':
        return 'Leser';
      default:
        return role;
    }
  };

  if (!user || !currentOrg) {
    return null;
  }

  const userInitials = user.profile?.full_name
    ? user.profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email.substring(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-4">
      {/* Organization Switcher */}
      {organizations.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              disabled={isLoading}
            >
              <Building className="w-4 h-4" />
              <span className="max-w-[150px] truncate">{currentOrg.name}</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Bytt forhandler</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSwitchOrg(org.id)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  <span className="truncate">{org.name}</span>
                </div>
                {org.id === currentOrg.id && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLocation('/onboarding')}>
              <Plus className="w-4 h-4 mr-2" />
              Opprett ny forhandler
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.profile?.avatar_url} alt={user.email} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.profile?.full_name || user.email}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
              {userRole && (
                <Badge variant={getRoleBadgeVariant(userRole)} className="w-fit mt-1">
                  {getRoleLabel(userRole)}
                </Badge>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setLocation('/settings/profile')}>
            <User className="w-4 h-4 mr-2" />
            Min profil
          </DropdownMenuItem>
          
          {userRole && ['owner', 'admin'].includes(userRole) && (
            <>
              <DropdownMenuItem onClick={() => setLocation('/settings/brukere')}>
                <Users className="w-4 h-4 mr-2" />
                Brukere
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/settings/organisasjon')}>
                <Building className="w-4 h-4 mr-2" />
                Organisasjon
              </DropdownMenuItem>
            </>
          )}
          
          {userRole === 'owner' && (
            <DropdownMenuItem onClick={() => setLocation('/settings/plan')}>
              <CreditCard className="w-4 h-4 mr-2" />
              Plan & Fakturering
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem onClick={() => setLocation('/settings')}>
            <Settings className="w-4 h-4 mr-2" />
            Innstillinger
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
            <LogOut className="w-4 h-4 mr-2" />
            Logg ut
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}