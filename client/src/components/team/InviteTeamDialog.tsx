import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Copy, Mail, Clock, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InviteFormData {
  email: string;
  role: "EIER" | "SELGER" | "REGNSKAP" | "VERKSTED";
}

const roleLabels = {
  EIER: "Eier",
  SELGER: "Selger", 
  REGNSKAP: "Regnskap",
  VERKSTED: "Verksted"
};

const roleDescriptions = {
  EIER: "Full tilgang til alt, kan invitere nye brukere",
  SELGER: "Kan håndtere biler, kunder og salgskontrakter",
  REGNSKAP: "Tilgang til finansielle data og rapporter",
  VERKSTED: "Tilgang til verksted og service informasjon"
};

export function InviteTeamDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<InviteFormData>({
    email: "",
    role: "SELGER"
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing invites
  const { data: invites = [] } = useQuery({
    queryKey: ['/api/invites'],
    enabled: open,
  });

  // Create invite mutation
  const createInviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send invite');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invitasjon sendt!",
        description: `Invitasjon sendt til ${formData.email}`,
      });
      
      setFormData({ email: "", role: "SELGER" });
      queryClient.invalidateQueries({ queryKey: ['/api/invites'] });
      
      // Copy invite link to clipboard
      navigator.clipboard.writeText(data.inviteLink);
      toast({
        title: "Invitasjonslenke kopiert",
        description: "Lenken er kopiert til utklippstavlen",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Feil ved sending av invitasjon",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim()) {
      toast({
        title: "Feil",
        description: "E-postadresse er påkrevd",
        variant: "destructive",
      });
      return;
    }
    createInviteMutation.mutate(formData);
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Lenke kopiert",
      description: "Invitasjonslenken er kopiert til utklippstavlen",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Inviter teammedlem
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invite form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Send ny invitasjon</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-postadresse</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="bruker@example.no"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    data-testid="input-invite-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rolle</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger data-testid="select-invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <div className="space-y-1">
                            <div className="font-medium">{label}</div>
                            <div className="text-xs text-muted-foreground">
                              {roleDescriptions[value as keyof typeof roleDescriptions]}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  type="submit" 
                  disabled={createInviteMutation.isPending}
                  className="w-full"
                  data-testid="button-send-invite"
                >
                  {createInviteMutation.isPending ? (
                    "Sender..."
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send invitasjon
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Existing invites */}
          {invites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ventende invitasjoner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invites.map((invite: any) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{invite.email}</span>
                          <Badge variant="secondary">
                            {roleLabels[invite.role as keyof typeof roleLabels]}
                          </Badge>
                          {invite.accepted ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                              <Check className="h-3 w-3 mr-1" />
                              Akseptert
                            </Badge>
                          ) : new Date(invite.expiresAt) < new Date() ? (
                            <Badge variant="destructive">
                              <X className="h-3 w-3 mr-1" />
                              Utløpt
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              Venter
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Sendt {new Date(invite.createdAt).toLocaleDateString('no-NO')}
                          {!invite.accepted && new Date(invite.expiresAt) >= new Date() && (
                            <span> • Utløper {new Date(invite.expiresAt).toLocaleDateString('no-NO')}</span>
                          )}
                        </div>
                      </div>
                      
                      {!invite.accepted && new Date(invite.expiresAt) >= new Date() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteLink(invite.token)}
                          data-testid={`button-copy-invite-${invite.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}