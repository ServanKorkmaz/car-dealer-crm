import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Company {
  id: string;
  name: string;
  role: 'EIER' | 'SELGER' | 'REGNSKAP' | 'VERKSTED';
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

export function CompanySwitcher() {
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load active company from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('activeCompanyId');
    if (saved) {
      setActiveCompanyId(saved);
    }
  }, []);

  // Get user's companies
  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies/user'],
    queryFn: () => apiRequest('/api/companies/user'),
    enabled: true,
  });

  // Set default active company if none is set
  useEffect(() => {
    if (companies.length > 0 && !activeCompanyId) {
      const defaultCompany = companies.find(c => c.role === 'EIER') || companies[0];
      setActiveCompanyId(defaultCompany.id);
      localStorage.setItem('activeCompanyId', defaultCompany.id);
    }
  }, [companies, activeCompanyId]);

  // Get active company details
  const activeCompany = companies.find(c => c.id === activeCompanyId);

  // Switch company mutation
  const switchCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      return apiRequest('/api/companies/switch', {
        method: 'POST',
        body: JSON.stringify({ companyId }),
      });
    },
    onSuccess: (_, companyId) => {
      setActiveCompanyId(companyId);
      localStorage.setItem('activeCompanyId', companyId);
      
      // Invalidate all queries to reload data for new company
      queryClient.invalidateQueries();
      
      const company = companies.find(c => c.id === companyId);
      toast({
        title: 'Bedrift endret',
        description: `Du jobber nå i ${company?.name}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke endre bedrift',
        variant: 'destructive',
      });
    },
  });

  // Create new company mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest('/api/companies', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: (newCompany) => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies/user'] });
      setShowCreateModal(false);
      setNewCompanyName('');
      
      // Switch to the new company
      switchCompanyMutation.mutate(newCompany.id);
      
      toast({
        title: 'Bedrift opprettet',
        description: `${newCompany.name} er opprettet og aktiv`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke opprette bedrift',
        variant: 'destructive',
      });
    },
  });

  const handleSwitchCompany = (companyId: string) => {
    if (companyId !== activeCompanyId) {
      switchCompanyMutation.mutate(companyId);
    }
  };

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCompanyName.trim()) {
      createCompanyMutation.mutate(newCompanyName.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Building2 className="h-4 w-4" />
        <span className="text-sm">Laster...</span>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <Building2 className="h-4 w-4" />
        <span className="text-sm">Ingen bedrifter</span>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center space-x-2 text-left font-normal"
            data-testid="company-switcher-trigger"
          >
            <Building2 className="h-4 w-4" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {activeCompany?.name || 'Velg bedrift'}
              </span>
              {activeCompany && (
                <span className="text-xs text-muted-foreground">
                  {ROLE_LABELS[activeCompany.role]}
                </span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-64" data-testid="company-switcher-menu">
          <DropdownMenuLabel>Dine bedrifter</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {companies.map((company) => (
            <DropdownMenuItem
              key={company.id}
              className="flex items-center justify-between cursor-pointer"
              onClick={() => handleSwitchCompany(company.id)}
              data-testid={`company-option-${company.id}`}
            >
              <div className="flex flex-col">
                <span className="font-medium">{company.name}</span>
                <span className="text-xs text-muted-foreground">
                  {ROLE_LABELS[company.role]}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Badge className={ROLE_COLORS[company.role]} variant="secondary">
                  {ROLE_LABELS[company.role]}
                </Badge>
                {company.id === activeCompanyId && (
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex items-center cursor-pointer text-primary"
            onClick={() => setShowCreateModal(true)}
            data-testid="create-company-button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ny bedrift
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Company Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[425px]" data-testid="create-company-modal">
          <DialogHeader>
            <DialogTitle>Opprett ny bedrift</DialogTitle>
            <DialogDescription>
              Opprett en ny bedrift hvor du blir eier. Du kan invitere teammedlemmer senere.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCompany} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Bedriftsnavn</Label>
              <Input
                id="company-name"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Skriv inn bedriftsnavn..."
                required
                data-testid="input-company-name"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                data-testid="button-cancel"
              >
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={!newCompanyName.trim() || createCompanyMutation.isPending}
                data-testid="button-create-company"
              >
                {createCompanyMutation.isPending ? 'Oppretter...' : 'Opprett bedrift'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}