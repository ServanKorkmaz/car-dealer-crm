import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { InsertFollowup } from '@shared/schema';

interface CreateFollowupModalProps {
  customerId: string;
  customerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateFollowupModal({ customerId, customerName, onClose, onSuccess }: CreateFollowupModalProps) {
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const { toast } = useToast();

  // Get user info for default assignment
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: () => apiRequest('/api/auth/user'),
  });

  // Set default assignment to current user
  React.useEffect(() => {
    if (currentUser && !assignedUserId) {
      setAssignedUserId(currentUser.id);
    }
  }, [currentUser, assignedUserId]);

  const createFollowupMutation = useMutation({
    mutationFn: async (followupData: InsertFollowup) => {
      return apiRequest('/api/followups', {
        method: 'POST',
        body: JSON.stringify(followupData),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Oppfølging opprettet',
        description: `Ny oppfølging for ${customerName} er registrert`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke opprette oppfølging',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dueDate) {
      toast({
        title: 'Manglende informasjon',
        description: 'Forfallsdato er påkrevd',
        variant: 'destructive',
      });
      return;
    }

    createFollowupMutation.mutate({
      customerId,
      userId: assignedUserId || currentUser?.id || '',
      dueDate,
      note: note.trim() || null,
    });
  };

  // Quick date shortcuts
  const getQuickDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="modal-create-followup">
        <DialogHeader>
          <DialogTitle>Ny oppfølging</DialogTitle>
          <DialogDescription>
            Opprett en påminnelse for å følge opp {customerName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="due-date">Forfallsdato</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              data-testid="input-due-date"
              required
            />
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDueDate(getQuickDate(1))}
                data-testid="button-tomorrow"
              >
                I morgen
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDueDate(getQuickDate(7))}
                data-testid="button-next-week"
              >
                Neste uke
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDueDate(getQuickDate(30))}
                data-testid="button-next-month"
              >
                Neste måned
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Notat (valgfritt)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Beskriv hva som skal følges opp..."
              rows={3}
              data-testid="textarea-note"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned-user">Tildelt til</Label>
            <Select value={assignedUserId} onValueChange={setAssignedUserId}>
              <SelectTrigger data-testid="select-assigned-user">
                <SelectValue placeholder="Velg bruker" />
              </SelectTrigger>
              <SelectContent>
                {currentUser && (
                  <SelectItem value={currentUser.id} data-testid={`user-option-${currentUser.id}`}>
                    {currentUser.email} (deg)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              data-testid="button-cancel"
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={createFollowupMutation.isPending || !dueDate}
              data-testid="button-create"
            >
              {createFollowupMutation.isPending ? 'Oppretter...' : 'Opprett oppfølging'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}