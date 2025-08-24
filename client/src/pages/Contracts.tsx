import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCanDelete } from "@/hooks/useUserRole";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EnhancedContractGenerator from "@/components/contracts/EnhancedContractGenerator";
import { 
  Plus, Search, Edit, Trash2, FileText, Download, CheckCircle, 
  Grid3X3, List, Copy, Calendar, Car, User, TrendingUp,
  Clock, AlertCircle, XCircle, Send, MoreVertical,
  FileSignature, Euro, Users
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Contract, Customer, Car as CarType } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function Contracts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showGenerator, setShowGenerator] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [prefilledData, setPrefilledData] = useState<{customerId?: string, carId?: string} | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const canDelete = useCanDelete();

  // Check URL parameters for pre-filled contract data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const customerId = params.get('customerId');
    const carId = params.get('carId');
    const shouldPrefill = params.get('prefill') === 'true';
    
    if (shouldPrefill && customerId && carId) {
      setPrefilledData({ customerId, carId });
      setShowGenerator(true);
      
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Fetch data
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: isAuthenticated,
  });

  const { data: cars = [] } = useQuery<CarType[]>({
    queryKey: ["/api/cars"],
    enabled: isAuthenticated,
  });

  const { data: contracts = [], isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
    enabled: isAuthenticated,
  });

  // Redirect if not authenticated
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
    }
  }, [isAuthenticated, isLoading, toast]);

  // Mutations
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

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  // Filter and search contracts
  const filteredContracts = contracts.filter((contract: Contract) => {
    const matchesSearch = contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || contract.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Calculate stats
  const stats = {
    total: contracts.length,
    pending: contracts.filter(c => c.status === 'pending_signature').length,
    completedThisMonth: contracts.filter(c => {
      if (c.status !== 'completed') return false;
      const completedDate = new Date(c.updatedAt || c.createdAt || '');
      const now = new Date();
      return completedDate.getMonth() === now.getMonth() && 
             completedDate.getFullYear() === now.getFullYear();
    }).length,
    totalRevenue: contracts
      .filter(c => c.status === 'completed')
      .reduce((sum, c) => sum + parseFloat(c.salePrice), 0)
  };

  const formatPrice = (price: string | number) => {
    const amount = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getRelativeTime = (date: Date | string | null) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (hours < 1) return 'Akkurat nå';
    if (hours < 24) return `${hours} ${hours === 1 ? 'time' : 'timer'} siden`;
    if (days < 30) return `${days} ${days === 1 ? 'dag' : 'dager'} siden`;
    return d.toLocaleDateString('no-NO');
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return {
          label: 'Kladd',
          color: 'bg-slate-700 text-slate-300 border-dashed border-slate-600',
          icon: FileText,
          bgCard: 'bg-slate-800/50 border-slate-700'
        };
      case 'pending_signature':
        return {
          label: 'Venter signatur',
          color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          icon: Clock,
          bgCard: 'bg-blue-500/5 border-blue-500/20',
          pulse: true
        };
      case 'signed':
        return {
          label: 'Signert',
          color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          icon: FileSignature,
          bgCard: 'bg-amber-500/5 border-amber-500/20'
        };
      case 'completed':
        return {
          label: 'Fullført',
          color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          icon: CheckCircle,
          bgCard: 'bg-emerald-500/5 border-emerald-500/20'
        };
      case 'rejected':
        return {
          label: 'Kansellert',
          color: 'bg-red-500/20 text-red-400 border-red-500/30',
          icon: XCircle,
          bgCard: 'bg-red-500/5 border-red-500/20'
        };
      default:
        return {
          label: status,
          color: 'bg-slate-700 text-slate-300',
          icon: FileText,
          bgCard: 'bg-slate-800/50'
        };
    }
  };

  const viewContract = async (contractId: string) => {
    const contractWindow = window.open(`/api/contracts/${contractId}/pdf`, '_blank');
    
    if (contractWindow) {
      toast({
        title: "Kontrakt åpnet",
        description: "Bruk Ctrl+P for å skrive ut eller lagre som PDF",
      });
    } else {
      toast({
        title: "Blokkert",
        description: "Tillat popup-vinduer for denne siden.",
        variant: "destructive",
      });
    }
  };

  const copyContractId = (contractNumber: string) => {
    navigator.clipboard.writeText(contractNumber);
    toast({
      title: "Kopiert!",
      description: `Kontraktnummer ${contractNumber} kopiert`,
    });
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Ukjent kunde';
  };

  const getCustomerInitials = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 'UK';
    const names = customer.name.split(' ');
    return names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getCarInfo = (carId: string) => {
    const car = cars.find(c => c.id === carId);
    if (!car) return { brand: 'Ukjent', model: '', year: '' };
    return {
      brand: car.brand || 'Ukjent',
      model: car.model || '',
      year: car.year || ''
    };
  };

  const filterButtons = [
    { value: 'all', label: 'Alle', count: contracts.length },
    { value: 'draft', label: 'Kladd', count: contracts.filter(c => c.status === 'draft').length },
    { value: 'pending_signature', label: 'Venter signatur', count: contracts.filter(c => c.status === 'pending_signature').length },
    { value: 'completed', label: 'Fullført', count: contracts.filter(c => c.status === 'completed').length },
    { value: 'rejected', label: 'Kansellert', count: contracts.filter(c => c.status === 'rejected').length },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 bg-slate-950 min-h-screen -m-6 p-6">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 backdrop-blur-lg border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Kontraktsadministrasjon</h1>
              <p className="text-slate-400">Administrer salgskontrakter effektivt</p>
            </div>
            <Button
              onClick={() => setShowGenerator(true)}
              size="lg"
              className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Opprett ny kontrakt
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-slate-800/50 backdrop-blur border-slate-700 hover:scale-105 transition-transform">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Totalt kontrakter</p>
                    <p className="text-3xl font-bold text-white">{stats.total}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 backdrop-blur border-slate-700 hover:scale-105 transition-transform">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Venter signatur</p>
                    <p className="text-3xl font-bold text-amber-400">{stats.pending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 backdrop-blur border-slate-700 hover:scale-105 transition-transform">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Fullført denne måneden</p>
                    <p className="text-3xl font-bold text-emerald-400">{stats.completedThisMonth}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 backdrop-blur border-slate-700 hover:scale-105 transition-transform">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Omsetning</p>
                    <p className="text-2xl font-bold text-white">{formatPrice(stats.totalRevenue)}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900/50 backdrop-blur rounded-xl p-4 border border-slate-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {filterButtons.map((filter) => (
                <Button
                  key={filter.value}
                  variant={filterStatus === filter.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(filter.value)}
                  className={cn(
                    "rounded-full transition-all duration-200",
                    filterStatus === filter.value
                      ? "bg-blue-500 text-white hover:bg-blue-600 shadow-lg"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700"
                  )}
                >
                  {filter.label}
                  {filter.count > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-700">
                      {filter.count}
                    </span>
                  )}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Søk kontrakter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "border-slate-700",
                    viewMode === "grid" ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-400"
                  )}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "border-slate-700",
                    viewMode === "list" ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-400"
                  )}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Cards Grid */}
        {contractsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-slate-400">Laster kontrakter...</p>
            </div>
          </div>
        ) : filteredContracts.length === 0 ? (
          <Card className="bg-slate-900/50 backdrop-blur border-slate-800">
            <CardContent className="text-center py-20">
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Ingen kontrakter funnet
              </h3>
              <p className="text-slate-400 mb-6">
                {searchTerm ? "Prøv et annet søkeord" : "Opprett din første kontrakt for å komme i gang"}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setShowGenerator(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Opprett kontrakt
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className={cn(
            "grid gap-6",
            viewMode === "grid" 
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid-cols-1"
          )}>
            {filteredContracts.map((contract: Contract) => {
              const statusConfig = getStatusConfig(contract.status || 'draft');
              const StatusIcon = statusConfig.icon;
              const carInfo = getCarInfo(contract.carId);
              const customerName = getCustomerName(contract.customerId);
              const customerInitials = getCustomerInitials(contract.customerId);

              return (
                <Card 
                  key={contract.id} 
                  className={cn(
                    "group relative overflow-hidden backdrop-blur transition-all duration-300 hover:scale-105 hover:shadow-2xl border",
                    statusConfig.bgCard,
                    statusConfig.pulse && "animate-pulse"
                  )}
                >
                  <CardContent className="p-6">
                    {/* Contract ID and Copy Button */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 group">
                          <h3 className="text-xl font-bold text-white">
                            #{contract.contractNumber}
                          </h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                            onClick={() => copyContractId(contract.contractNumber)}
                          >
                            <Copy className="w-3 h-3 text-slate-400" />
                          </Button>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {getRelativeTime(contract.createdAt)}
                        </p>
                      </div>
                      <Badge 
                        className={cn(
                          "flex items-center gap-1 border",
                          statusConfig.color
                        )}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Customer Info */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                        {customerInitials}
                      </div>
                      <div>
                        <p className="text-white font-medium">{customerName}</p>
                        <p className="text-xs text-slate-500">Kunde</p>
                      </div>
                    </div>

                    {/* Car Info */}
                    <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Car className="w-4 h-4 text-slate-400" />
                        <p className="text-sm font-semibold text-white">
                          {carInfo.brand} {carInfo.model}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">{carInfo.year}</p>
                    </div>

                    {/* Financial Summary */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Salgspris</span>
                        <span className="text-lg font-bold text-white">
                          {formatPrice(contract.salePrice)}
                        </span>
                      </div>
                      {contract.status === 'pending_signature' && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Signaturer</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: '0%' }}
                              />
                            </div>
                            <span className="text-xs text-slate-400">0/2</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewContract(contract.id)}
                        className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Se kontrakt
                      </Button>

                      {contract.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-slate-400 hover:text-white"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                          <DropdownMenuItem 
                            onClick={() => setEditingContract(contract)}
                            className="hover:bg-slate-700 cursor-pointer"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Rediger
                          </DropdownMenuItem>
                          {contract.status === 'signed' && (
                            <DropdownMenuItem 
                              onClick={() => markCompletedMutation.mutate(contract.id)}
                              className="hover:bg-slate-700 cursor-pointer"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Marker som fullført
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-slate-700" />
                          {canDelete && (
                            <DropdownMenuItem 
                              onClick={() => deleteMutation.mutate(contract.id)}
                              className="hover:bg-red-900/20 text-red-400 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Slett
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Contract Generator Modal */}
      {(showGenerator || editingContract) && (
        <EnhancedContractGenerator
          contract={editingContract}
          prefilledData={prefilledData}
          onClose={() => {
            setShowGenerator(false);
            setEditingContract(null);
            setPrefilledData(null);
          }}
        />
      )}
    </MainLayout>
  );
}