import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ContractGenerator from "@/components/contracts/ContractGenerator";
import { Plus, Search, Edit, Trash2, FileText, Download, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Contract, Customer } from "@shared/schema";

export default function Contracts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showGenerator, setShowGenerator] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Fetch customers for signing modal
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: isAuthenticated,
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorisert",
        description: "Du er ikke logget inn. Logger inn på nytt...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: contracts = [], isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
    enabled: isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: async (contractId: string) => {
      await apiRequest("DELETE", `/api/contracts/${contractId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Suksess",
        description: "Kontrakt ble slettet",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorisert",
          description: "Du er ikke logget inn. Logger inn på nytt...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Feil",
        description: "Kunne ikke slette kontrakt",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900" />;
  }

  const filteredContracts = contracts.filter((contract: Contract) =>
    contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
      case 'pending_signature':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'signed':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Utkast';
      case 'pending_signature':
        return 'Venter på signering';
      case 'signed':
        return 'Signert';
      case 'completed':
        return 'Fullført';
      case 'rejected':
        return 'Avvist';
      default:
        return status;
    }
  };

  const generatePdfMutation = useMutation({
    mutationFn: async (contractId: string) => {
      return await apiRequest("POST", `/api/contracts/${contractId}/generate-pdf`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Suksess",
        description: "PDF-kontrakt generert og klar for nedlasting",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorisert",
          description: "Du er ikke logget inn. Logger inn på nytt...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Feil",
        description: "Kunne ikke generere PDF-kontrakt",
        variant: "destructive",
      });
    },
  });

  const markCompletedMutation = useMutation({
    mutationFn: async (contractId: string) => {
      return await apiRequest("PUT", `/api/contracts/${contractId}`, {
        status: "completed"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Suksess",
        description: "Kontrakt markert som fullført",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorisert",
          description: "Du er ikke logget inn. Logger inn på nytt...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Feil",
        description: "Kunne ikke oppdatere kontrakt",
        variant: "destructive",
      });
    },
  });

  const downloadPDF = async (contractId: string, contractNumber: string) => {
    try {
      const response = await fetch(`/api/contracts/${contractId}/pdf`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `kontrakt-${contractNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Suksess",
        description: "PDF lastet ned",
      });
    } catch (error) {
      console.error('PDF download error:', error);
      toast({
        title: "Feil",
        description: "Kunne ikke laste ned PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Kontrakter</h2>
            <p className="text-slate-600 dark:text-slate-400">Administrer salgskontrakter</p>
          </div>
          <Button
            onClick={() => setShowGenerator(true)}
            className="bg-primary hover:bg-primary-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Opprett kontrakt
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Søk etter kontrakter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {contractsLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Laster kontrakter...</p>
          </div>
        ) : filteredContracts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Ingen kontrakter funnet
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {searchTerm ? "Prøv et annet søkeord" : "Opprett din første kontrakt for å komme i gang"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowGenerator(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Opprett kontrakt
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContracts.map((contract: Contract) => (
              <Card key={contract.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">#{contract.contractNumber}</CardTitle>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {new Date(contract.saleDate).toLocaleDateString('no-NO')}
                      </p>
                    </div>
                    <Badge className={getStatusColor(contract.status || 'draft')}>
                      {getStatusText(contract.status || 'draft')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Salgspris:</span>
                      <span className="font-medium">{formatPrice(contract.salePrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Opprettet:</span>
                      <span className="font-medium">
                        {new Date(contract.createdAt!).toLocaleDateString('no-NO')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    {/* Contract Status Display */}
                    {contract.status === 'signed' && (
                      <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-amber-600" />
                          <span className="text-xs text-amber-800 dark:text-amber-400">Signert - klar for fullføring</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markCompletedMutation.mutate(contract.id)}
                          disabled={markCompletedMutation.isPending}
                          className="h-6 px-2 text-amber-600 hover:text-amber-700"
                        >
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    
                    {contract.status === 'completed' && (
                      <div className="flex items-center space-x-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-green-800 dark:text-green-400">
                          Fullført {contract.updatedAt ? new Date(contract.updatedAt).toLocaleDateString('no-NO') : ''}
                        </span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setEditingContract(contract)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Rediger
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadPDF(contract.id, contract.contractNumber)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                        data-testid={`button-download-pdf-${contract.id}`}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(contract.id)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        data-testid={`button-delete-${contract.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {(showGenerator || editingContract) && (
        <ContractGenerator
          contract={editingContract}
          onClose={() => {
            setShowGenerator(false);
            setEditingContract(null);
          }}
        />
      )}


    </MainLayout>
  );
}
