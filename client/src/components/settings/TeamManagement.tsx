import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Mail, Shield, Edit, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'EIER' | 'SELGER' | 'REGNSKAP' | 'VERKSTED';
  joinedAt: string;
}

const ROLE_LABELS = {
  EIER: 'Eier',
  SELGER: 'Selger', 
  REGNSKAP: 'Regnskap',
  VERKSTED: 'Verksted'
} as const;

const ROLE_COLORS = {
  EIER: 'bg-purple-100 text-purple-800',
  SELGER: 'bg-blue-100 text-blue-800',
  REGNSKAP: 'bg-green-100 text-green-800',
  VERKSTED: 'bg-orange-100 text-orange-800'
} as const;

export default function TeamManagement() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'SELGER' | 'REGNSKAP' | 'VERKSTED'>('SELGER');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role: currentUserRole } = useUserRole();

  const isOwner = currentUserRole === 'EIER';

  // Get team members
  const { data: teamMembers = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ['/api/team/members'],
    queryFn: () => apiRequest('/api/team/members'),
  });

  // Invite member mutation
  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      return apiRequest('/api/team/invite', {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('SELGER');
      toast({
        title: 'Invitasjon sendt',
        description: 'Teammedlemmet vil motta en e-post med invitasjon',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke sende invitasjon',
        variant: 'destructive',
      });
    },
  });

  // Change role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: string }) => {
      return apiRequest(`/api/team/members/${memberId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
      toast({
        title: 'Rolle endret',
        description: 'Teammedlemmets rolle har blitt oppdatert',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke endre rolle',
        variant: 'destructive',
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return apiRequest(`/api/team/members/${memberId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
      toast({
        title: 'Medlem fjernet',
        description: 'Teammedlemmet har blitt fjernet fra bedriften',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke fjerne medlem',
        variant: 'destructive',
      });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmail.trim()) {
      inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Teamadministrasjon
            </CardTitle>
            <CardDescription>
              Administrer teammedlemmer og deres tilgangsnivå
            </CardDescription>
          </div>
          {isOwner && (
            <Button onClick={() => setShowInviteModal(true)} data-testid="invite-member-button">
              <UserPlus className="mr-2 h-4 w-4" />
              Inviter medlem
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-muted h-10 w-10"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Ingen teammedlemmer</h3>
            <p className="text-muted-foreground mb-4">
              Du er det eneste medlemmet i bedriften. Inviter andre for å jobbe sammen.
            </p>
            {isOwner && (
              <Button onClick={() => setShowInviteModal(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Inviter første medlem
              </Button>
            )}
          </div>
        ) : (
          <Table data-testid="team-members-table">
            <TableHeader>
              <TableRow>
                <TableHead>Navn</TableHead>
                <TableHead>E-post</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Ble med</TableHead>
                {isOwner && <TableHead>Handlinger</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id} data-testid={`team-member-${member.id}`}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <Badge className={ROLE_COLORS[member.role]} variant="secondary">
                      {ROLE_LABELS[member.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(member.joinedAt).toLocaleDateString('no-NO')}
                  </TableCell>
                  {isOwner && (
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Role change functionality would be implemented here
                            toast({
                              title: 'Funksjonalitet kommer',
                              description: 'Rolleendring vil bli implementert snart',
                            });
                          }}
                          data-testid={`edit-role-${member.id}`}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        {member.role !== 'EIER' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeMemberMutation.mutate(member.id)}
                            data-testid={`remove-member-${member.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Invite Member Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent data-testid="invite-member-modal">
          <DialogHeader>
            <DialogTitle>Inviter nytt teammedlem</DialogTitle>
            <DialogDescription>
              Send invitasjon til en kollega for å bli med i bedriften
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-postadresse</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="kollega@example.com"
                required
                data-testid="invite-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Rolle</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger data-testid="invite-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SELGER">Selger</SelectItem>
                  <SelectItem value="REGNSKAP">Regnskap</SelectItem>
                  <SelectItem value="VERKSTED">Verksted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInviteModal(false)}
                data-testid="cancel-invite"
              >
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
                data-testid="send-invite"
              >
                {inviteMutation.isPending ? 'Sender...' : 'Send invitasjon'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}