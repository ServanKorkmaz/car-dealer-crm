import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield,
  Trash2,
  AlertCircle,
  Loader2,
  Check,
  X,
  Clock,
  Send
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import type { OrgRole } from '@shared/auth-types';

interface Member {
  user_id: string;
  role: OrgRole;
  status: 'active' | 'invited' | 'revoked';
  joined_at: string;
  profiles: {
    full_name?: string;
    email: string;
    avatar_url?: string;
  };
}

interface Invite {
  id: string;
  email: string;
  role: OrgRole;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  expires_at: string;
}

export function SettingsUsers() {
  const { currentOrg, user } = useAuth();
  const { isOwnerOrAdmin } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('viewer');

  // Fetch members
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: [`/api/auth/members/${currentOrg?.id}`],
    enabled: !!currentOrg,
  });

  // Fetch invites
  const { data: invites = [], isLoading: loadingInvites } = useQuery({
    queryKey: [`/api/auth/invites/${currentOrg?.id}`],
    enabled: !!currentOrg && isOwnerOrAdmin(),
  });

  // Fetch subscription for seat info
  const { data: subscription } = useQuery({
    queryKey: [`/api/auth/subscription/${currentOrg?.id}`],
    enabled: !!currentOrg,
  });

  // Send invite mutation
  const sendInviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: OrgRole }) => {
      const response = await fetch(`/api/auth/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          orgId: currentOrg?.id,
          email,
          role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invite');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/auth/invites/${currentOrg?.id}`] });
      toast({
        title: 'Invitasjon sendt',
        description: `Invitasjon ble sendt til ${inviteEmail}`,
      });
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('viewer');
    },
    onError: (error) => {
      toast({
        title: 'Feil',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: OrgRole }) => {
      const response = await fetch(`/api/auth/members/${currentOrg?.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          user_id: userId,
          role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update role');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/auth/members/${currentOrg?.id}`] });
      toast({
        title: 'Rolle oppdatert',
        description: 'Brukerens rolle ble endret',
      });
    },
    onError: (error) => {
      toast({
        title: 'Feil',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/auth/members/${currentOrg?.id}/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove member');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/auth/members/${currentOrg?.id}`] });
      toast({
        title: 'Medlem fjernet',
        description: 'Brukeren har ikke lenger tilgang til organisasjonen',
      });
    },
    onError: (error) => {
      toast({
        title: 'Feil',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getAuthToken = async () => {
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  const getRoleBadgeVariant = (role: OrgRole) => {
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

  const getRoleLabel = (role: OrgRole) => {
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

  const handleSendInvite = () => {
    if (!inviteEmail || !inviteRole) return;
    sendInviteMutation.mutate({ email: inviteEmail, role: inviteRole });
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

  const activeMembers = members.filter((m: Member) => m.status === 'active');
  const pendingInvites = invites.filter((i: Invite) => i.status === 'pending');
  const seatsUsed = activeMembers.length;
  const seatsAvailable = subscription?.seats || 0;

  return (
    <MainLayout>
      <div className="max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Brukere</h1>
          <p className="text-muted-foreground">
            Administrer teammedlemmer og tilganger
          </p>
        </div>

        {/* Seat usage */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Seter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {seatsUsed} av {seatsAvailable}
                </p>
                <p className="text-sm text-muted-foreground">seter brukt</p>
              </div>
              {isOwnerOrAdmin() && (
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={seatsUsed >= seatsAvailable}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Inviter bruker
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Inviter ny bruker</DialogTitle>
                      <DialogDescription>
                        Send invitasjon til en ny teammedlem
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">E-post</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="bruker@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Rolle</Label>
                        <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as OrgRole)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="sales">Selger</SelectItem>
                            <SelectItem value="workshop">Verksted</SelectItem>
                            <SelectItem value="accountant">Regnskapsfører</SelectItem>
                            <SelectItem value="viewer">Leser</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleSendInvite}
                        disabled={!inviteEmail || sendInviteMutation.isPending}
                      >
                        {sendInviteMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sender...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Send invitasjon
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active members */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Aktive medlemmer</CardTitle>
            <CardDescription>
              Brukere med tilgang til organisasjonen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bruker</TableHead>
                  <TableHead>E-post</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Ble med</TableHead>
                  {isOwnerOrAdmin() && <TableHead className="text-right">Handlinger</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingMembers ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : activeMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Ingen medlemmer
                    </TableCell>
                  </TableRow>
                ) : (
                  activeMembers.map((member: Member) => {
                    const initials = member.profiles.full_name
                      ? member.profiles.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                      : member.profiles.email.substring(0, 2).toUpperCase();

                    return (
                      <TableRow key={member.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.profiles.avatar_url} />
                              <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {member.profiles.full_name || 'Ikke angitt'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{member.profiles.email}</TableCell>
                        <TableCell>
                          {isOwnerOrAdmin() && member.user_id !== user?.id ? (
                            <Select
                              value={member.role}
                              onValueChange={(role) => 
                                updateRoleMutation.mutate({ 
                                  userId: member.user_id, 
                                  role: role as OrgRole 
                                })
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="owner">Eier</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="sales">Selger</SelectItem>
                                <SelectItem value="workshop">Verksted</SelectItem>
                                <SelectItem value="accountant">Regnskapsfører</SelectItem>
                                <SelectItem value="viewer">Leser</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={getRoleBadgeVariant(member.role)}>
                              {getRoleLabel(member.role)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(member.joined_at).toLocaleDateString('nb-NO')}
                        </TableCell>
                        {isOwnerOrAdmin() && (
                          <TableCell className="text-right">
                            {member.user_id !== user?.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeMemberMutation.mutate(member.user_id)}
                                disabled={removeMemberMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pending invites */}
        {isOwnerOrAdmin() && pendingInvites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Ventende invitasjoner</CardTitle>
              <CardDescription>
                Invitasjoner som ikke er akseptert ennå
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-post</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Sendt</TableHead>
                    <TableHead>Utløper</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvites.map((invite: Invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getRoleLabel(invite.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(invite.created_at).toLocaleDateString('nb-NO')}
                      </TableCell>
                      <TableCell>
                        {new Date(invite.expires_at).toLocaleDateString('nb-NO')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          Venter
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}