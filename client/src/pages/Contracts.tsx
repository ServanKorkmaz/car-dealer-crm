import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCanDelete } from "@/hooks/useUserRole";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EnhancedContractGenerator from "@/components/contracts/EnhancedContractGenerator";
import { 
  Plus, Search, Filter, FileText, TrendingUp, Clock, Package,
  Calendar, Phone, Mail, Car, CreditCard, AlertCircle, CheckCircle2,
  FileSignature, Send, Download, Camera, History, Upload, Banknote,
  Timer, UserCheck, ChevronRight, Receipt, Briefcase, Shield
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Contract, Customer, Car as CarType } from "@shared/schema";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

// Contract type configurations
const contractTypes = {
  purchase: { 
    label: 'Kjøpekontrakt', 
    icon: FileText, 
    color: 'blue',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    textColor: 'text-blue-400'
  },
  tradein: { 
    label: 'Innbyttekontrakt', 
    icon: Car, 
    color: 'purple',
    bgColor: 'bg-purple-500/10', 
    borderColor: 'border-purple-500/20',
    textColor: 'text-purple-400'
  },
  financing: { 
    label: 'Finansieringsavtale', 
    icon: CreditCard, 
    color: 'green',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    textColor: 'text-green-400'
  },
  lease: { 
    label: 'Leasingkontrakt', 
    icon: Receipt, 
    color: 'orange',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    textColor: 'text-orange-400'
  },
  service: { 
    label: 'Servicekontrakt', 
    icon: Shield, 
    color: 'teal',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500/20',
    textColor: 'text-teal-400'
  }
};

export default function Contracts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showGenerator, setShowGenerator] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [prefilledData, setPrefilledData] = useState<{customerId?: string, carId?: string} | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");

  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const canDelete = useCanDelete();

  // Check URL parameters for pre-filled contract data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const customerId = params.get('customerId');
    const carId = params.get('carId');
    const prefillCar = params.get('prefillCar');
    const openGenerator = params.get('generator') === 'open';
    const shouldPrefill = params.get('prefill') === 'true';
    
    // Open generator directly with car pre-filled
    if (openGenerator && prefillCar) {
      setPrefilledData({ carId: prefillCar });
      setShowGenerator(true);
      
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, '', url.toString());
    }
    // Legacy prefill support
    else if (shouldPrefill && customerId && carId) {
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

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-background" />;
  }

  // Filter contracts
  const filteredContracts = contracts.filter((contract: Contract) => {
    const matchesSearch = contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === "all" || 
      (activeTab === "active" && ['draft', 'pending_signature', 'signed'].includes(contract.status || '')) ||
      (activeTab === "ready" && contract.status === 'signed') ||
      (activeTab === "completed" && contract.status === 'completed');
    
    // Price filter
    const price = parseFloat(contract.salePrice);
    const matchesPrice = priceFilter === "all" ||
      (priceFilter === "under200" && price < 200000) ||
      (priceFilter === "200to500" && price >= 200000 && price <= 500000) ||
      (priceFilter === "500to1m" && price > 500000 && price <= 1000000) ||
      (priceFilter === "over1m" && price > 1000000);

    return matchesSearch && matchesTab && matchesPrice;
  });

  // Calculate advanced stats
  const stats = {
    activeSales: contracts.filter(c => ['draft', 'pending_signature', 'signed'].includes(c.status || '')).length,
    awaitingDocs: contracts.filter(c => c.status === 'pending_signature').length,
    readyForDelivery: contracts.filter(c => c.status === 'signed').length,
    monthlyRevenue: contracts
      .filter(c => {
        if (c.status !== 'completed') return false;
        const date = new Date(c.updatedAt || c.createdAt || '');
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, c) => sum + parseFloat(c.salePrice), 0),
    avgSaleTime: Math.round(Math.random() * 7 + 3), // Mock data - would calculate from real data
    financingPercent: Math.round((contracts.filter(c => c.status === 'completed').length * 0.65) * 100) // Mock
  };

  const formatPrice = (price: string | number) => {
    const amount = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getDaysUntilDelivery = (deliveryDate: Date | string | null) => {
    if (!deliveryDate) return null;
    const delivery = typeof deliveryDate === 'string' ? new Date(deliveryDate) : deliveryDate;
    const now = new Date();
    const diff = delivery.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const getCustomerInfo = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer || null;
  };

  const getCarInfo = (carId: string) => {
    const car = cars.find(c => c.id === carId);
    return car || null;
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

  const getContractType = (template: string | undefined) => {
    switch (template) {
      case 'innbytte': return contractTypes.tradein;
      case 'kommisjon': return contractTypes.financing;
      case 'mva_pliktig': return contractTypes.lease;
      default: return contractTypes.purchase;
    }
  };

  const getStatusInfo = (status: string | undefined) => {
    switch (status) {
      case 'draft':
        return { label: 'Tilbud', color: 'bg-slate-500', icon: FileText };
      case 'pending_signature':
        return { label: 'Venter signatur', color: 'bg-amber-500', icon: Clock };
      case 'signed':
        return { label: 'Signert', color: 'bg-blue-500', icon: FileSignature };
      case 'completed':
        return { label: 'Levert', color: 'bg-green-500', icon: CheckCircle2 };
      default:
        return { label: 'Ukjent', color: 'bg-gray-500', icon: AlertCircle };
    }
  };

  const getNextAction = (contract: Contract) => {
    switch (contract.status) {
      case 'draft': return 'Send tilbud til kunde';
      case 'pending_signature': return 'Følg opp signering';
      case 'signed': return 'Registrer betaling';
      case 'completed': return 'Arkiver dokumenter';
      default: return 'Ingen handling';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Clean Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Kontraktsadministrasjon</h1>
            <p className="text-muted-foreground mt-1">Håndter hele salgsprosessen effektivt</p>
          </div>
          <Button 
            onClick={() => setShowGenerator(true)}
            size="lg"
            className="gap-2"
          >
            <Plus className="w-5 h-5" />
            Opprett ny kontrakt
          </Button>
        </div>

        {/* Professional Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Salg</span>
              </div>
              <div className="text-2xl font-bold">{stats.activeSales}</div>
              <p className="text-xs text-muted-foreground">Aktive salg</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-amber-500">Venter</span>
              </div>
              <div className="text-2xl font-bold">{stats.awaitingDocs}</div>
              <p className="text-xs text-muted-foreground">Venter dokumenter</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-blue-500">Klar</span>
              </div>
              <div className="text-2xl font-bold">{stats.readyForDelivery}</div>
              <p className="text-xs text-muted-foreground">Klar for levering</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-500">Måned</span>
              </div>
              <div className="text-xl font-bold">{formatPrice(stats.monthlyRevenue)}</div>
              <p className="text-xs text-muted-foreground">Månedlig omsetning</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Timer className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-purple-500">Snitt</span>
              </div>
              <div className="text-2xl font-bold">{stats.avgSaleTime} dager</div>
              <p className="text-xs text-muted-foreground">Gjennomsnittlig salgstid</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <CreditCard className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-orange-500">Finansiert</span>
              </div>
              <div className="text-2xl font-bold">{stats.financingPercent}%</div>
              <p className="text-xs text-muted-foreground">Finansieringsandel</p>
            </CardContent>
          </Card>
        </div>

        {/* Clean Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Søk kontraktnummer, kunde eller bil..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Prisområde" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle priser</SelectItem>
                    <SelectItem value="under200">Under 200k</SelectItem>
                    <SelectItem value="200to500">200k - 500k</SelectItem>
                    <SelectItem value="500to1m">500k - 1M</SelectItem>
                    <SelectItem value="over1m">Over 1M</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Betaling" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="cash">Kontant</SelectItem>
                    <SelectItem value="financing">Finansiering</SelectItem>
                    <SelectItem value="lease">Leasing</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Levering" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="stock">På lager</SelectItem>
                    <SelectItem value="ordered">Bestilt</SelectItem>
                    <SelectItem value="arrived">Ankommet</SelectItem>
                    <SelectItem value="delivered">Levert</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="icon">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract List with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              Alle ({contracts.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Aktive ({contracts.filter(c => ['draft', 'pending_signature', 'signed'].includes(c.status || '')).length})
            </TabsTrigger>
            <TabsTrigger value="ready">
              Klar for levering ({contracts.filter(c => c.status === 'signed').length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Fullført ({contracts.filter(c => c.status === 'completed').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {contractsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-muted-foreground">Laster kontrakter...</p>
                </div>
              </div>
            ) : filteredContracts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ingen kontrakter funnet</h3>
                  <p className="text-muted-foreground mb-4">
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
              <div className="space-y-4">
                {filteredContracts.map((contract: Contract) => {
                  const customer = getCustomerInfo(contract.customerId);
                  const car = getCarInfo(contract.carId);
                  const contractType = getContractType(contract.contractTemplate);
                  const statusInfo = getStatusInfo(contract.status);
                  const StatusIcon = statusInfo.icon;
                  const TypeIcon = contractType.icon;
                  const daysUntilDelivery = getDaysUntilDelivery(contract.saleDate);

                  return (
                    <Card key={contract.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="flex">
                        {/* Left color bar */}
                        <div className={cn("w-1", statusInfo.color)} />
                        
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between gap-4">
                            {/* Main Info */}
                            <div className="flex-1 space-y-4">
                              {/* Header */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "p-2 rounded-lg",
                                    contractType.bgColor,
                                    contractType.borderColor,
                                    "border"
                                  )}>
                                    <TypeIcon className={cn("w-5 h-5", contractType.textColor)} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-semibold text-lg">#{contract.contractNumber}</h3>
                                      <Badge variant="outline" className="gap-1">
                                        <StatusIcon className="w-3 h-3" />
                                        {statusInfo.label}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{contractType.label}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold">{formatPrice(contract.salePrice)}</p>
                                  <p className="text-xs text-muted-foreground">Total verdi</p>
                                </div>
                              </div>

                              {/* Customer and Car Info */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Customer */}
                                <div className="flex items-start gap-3">
                                  <UserCheck className="w-4 h-4 text-muted-foreground mt-1" />
                                  <div className="flex-1">
                                    <p className="font-medium">{customer?.name || 'Ukjent kunde'}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                      {customer?.phone && (
                                        <a 
                                          href={`tel:${customer.phone}`}
                                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                                        >
                                          <Phone className="w-3 h-3" />
                                          {customer.phone}
                                        </a>
                                      )}
                                      {customer?.email && (
                                        <a 
                                          href={`mailto:${customer.email}`}
                                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                                        >
                                          <Mail className="w-3 h-3" />
                                          {customer.email}
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Car */}
                                <div className="flex items-start gap-3">
                                  <Car className="w-4 h-4 text-muted-foreground mt-1" />
                                  <div className="flex-1">
                                    <p className="font-medium">
                                      {car ? `${car.brand} ${car.model}` : 'Ukjent bil'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {car?.year} • {car?.regnr || 'Ingen reg.nr'}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Progress and Actions */}
                              <div className="space-y-3">
                                {/* Delivery countdown */}
                                {daysUntilDelivery !== null && daysUntilDelivery >= 0 && (
                                  <div className="flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm">Levering om {daysUntilDelivery} dager</span>
                                        <span className="text-sm text-muted-foreground">{formatDate(contract.saleDate)}</span>
                                      </div>
                                      <Progress value={Math.max(0, 100 - (daysUntilDelivery * 3.33))} className="h-1" />
                                    </div>
                                  </div>
                                )}

                                {/* Next Action */}
                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-500" />
                                    <span className="text-sm font-medium">Neste handling:</span>
                                    <span className="text-sm text-muted-foreground">{getNextAction(contract)}</span>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                  <Button 
                                    variant="default" 
                                    size="sm"
                                    onClick={() => viewContract(contract.id)}
                                  >
                                    <FileText className="w-4 h-4 mr-1" />
                                    Se kontrakt
                                  </Button>

                                  {contract.status === 'draft' && (
                                    <>
                                      <Button variant="outline" size="sm">
                                        <Send className="w-4 h-4 mr-1" />
                                        Send tilbud
                                      </Button>
                                      <Button variant="outline" size="sm">
                                        <Car className="w-4 h-4 mr-1" />
                                        Bestill bil
                                      </Button>
                                    </>
                                  )}

                                  {contract.status === 'pending_signature' && (
                                    <>
                                      <Button variant="outline" size="sm">
                                        <Upload className="w-4 h-4 mr-1" />
                                        Last opp dokumenter
                                      </Button>
                                      <Button variant="outline" size="sm">
                                        <Phone className="w-4 h-4 mr-1" />
                                        Følg opp
                                      </Button>
                                    </>
                                  )}

                                  {contract.status === 'signed' && (
                                    <>
                                      <Button variant="outline" size="sm">
                                        <Banknote className="w-4 h-4 mr-1" />
                                        Registrer betaling
                                      </Button>
                                      <Button variant="outline" size="sm">
                                        <Package className="w-4 h-4 mr-1" />
                                        Book levering
                                      </Button>
                                      <Button variant="outline" size="sm">
                                        <Receipt className="w-4 h-4 mr-1" />
                                        Generer faktura
                                      </Button>
                                    </>
                                  )}

                                  {canDelete && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => deleteMutation.mutate(contract.id)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      Slett
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right side - Document checklist */}
                            <div className="hidden lg:block w-64">
                              <Card>
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-sm">Dokumenter</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    <span className="text-muted-foreground">Signert kontrakt</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    <span className="text-muted-foreground">Legitimasjon</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Clock className="w-4 h-4 text-amber-500" />
                                    <span className="text-muted-foreground">Forsikringsbevis</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <AlertCircle className="w-4 h-4 text-gray-400" />
                                    <span className="text-muted-foreground">Finansieringsbevis</span>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
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