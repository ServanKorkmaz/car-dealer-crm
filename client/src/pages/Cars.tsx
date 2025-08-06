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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AddCarModal from "@/components/cars/AddCarModal";
import EditCarModal from "@/components/cars/EditCarModal";
import { 
  Plus, Search, Edit, Trash2, CheckCircle, Clock, ExternalLink, 
  Filter, SortAsc, Car as CarIcon, Calendar, Gauge, MapPin,
  Eye, DollarSign, Settings
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Car } from "@shared/schema";
import { Link } from "wouter";

// Grid Card Component for modern card layout
function GridCarCard({ 
  car, 
  onEdit, 
  onSell, 
  onDelete, 
  isDeleting, 
  isSelling, 
  calculateDaysOnStock, 
  formatPrice, 
  getStatusColor, 
  getStatusText 
}: {
  car: Car;
  onEdit: () => void;
  onSell: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  isSelling: boolean;
  calculateDaysOnStock: (createdAt: string, soldDate?: string | null) => number;
  formatPrice: (price: string) => string;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
}) {
  const daysOnStock = calculateDaysOnStock(car.createdAt || "", car.soldDate || null);
  const hasImage = car.images && car.images.length > 0;

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white dark:bg-slate-800 border-0 shadow-lg overflow-hidden cursor-pointer" data-testid={`card-car-${car.id}`}>
      {/* Car Image */}
      <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 overflow-hidden">
        {hasImage ? (
          <img 
            src={car.images![0]} 
            alt={`${car.make} ${car.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`${hasImage ? 'hidden' : 'flex'} absolute inset-0 items-center justify-center`}>
          <div className="text-center">
            <CarIcon className="w-16 h-16 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Ingen bilde</p>
          </div>
        </div>
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <Badge className={`${getStatusColor(car.status)} shadow-lg`}>
            {getStatusText(car.status)}
          </Badge>
        </div>

        {/* Days on stock */}
        <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          {daysOnStock} dager
        </div>
      </div>

      <CardContent className="p-4">
        {/* Title and Year */}
        <div className="mb-3">
          <Link href={`/cars/${car.id}`}>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {car.make} {car.model}
            </h3>
          </Link>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Calendar className="w-3 h-3" />
            <span>{car.year}</span>
            <span>•</span>
            <MapPin className="w-3 h-3" />
            <span>{car.registrationNumber}</span>
          </div>
        </div>

        {/* Key Info */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="flex items-center gap-1">
            <Gauge className="w-3 h-3 text-slate-400" />
            <span className="text-slate-600 dark:text-slate-400">
              {car.mileage?.toLocaleString('no-NO') || '0'} km
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Settings className="w-3 h-3 text-slate-400" />
            <span className="text-slate-600 dark:text-slate-400">
              {car.transmission || 'Auto'}
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatPrice(car.status === 'sold' && car.soldPrice ? car.soldPrice : car.salePrice || "0")}
            </span>
            <div className="text-right text-xs text-slate-500">
              {car.status === 'sold' ? 'Solgt for' : 'Salgspris'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link href={`/cars/${car.id}`} className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              data-testid={`button-view-${car.id}`}
            >
              <Eye className="w-3 h-3 mr-1" />
              Se detaljer
            </Button>
          </Link>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            data-testid={`button-edit-${car.id}`}
          >
            <Edit className="w-3 h-3" />
          </Button>
          
          {car.status === 'available' && (
            <Button
              size="sm"
              onClick={onSell}
              disabled={isSelling}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              data-testid={`button-sell-${car.id}`}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Selg
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
            data-testid={`button-delete-${car.id}`}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// List Card Component for compact list view
function ListCarCard({ 
  car, 
  onEdit, 
  onSell, 
  onDelete, 
  isDeleting, 
  isSelling, 
  calculateDaysOnStock, 
  formatPrice, 
  getStatusColor, 
  getStatusText 
}: {
  car: Car;
  onEdit: () => void;
  onSell: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  isSelling: boolean;
  calculateDaysOnStock: (createdAt: string, soldDate?: string | null) => number;
  formatPrice: (price: string) => string;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
}) {
  const daysOnStock = calculateDaysOnStock(car.createdAt || "", car.soldDate || null);
  const hasImage = car.images && car.images.length > 0;

  return (
    <Card className="hover:shadow-lg transition-all duration-200 bg-white dark:bg-slate-800 border-0 shadow-md" data-testid={`card-car-${car.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Thumbnail */}
          <div className="w-20 h-16 flex-shrink-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-lg overflow-hidden">
            {hasImage ? (
              <img 
                src={car.images![0]} 
                alt={`${car.make} ${car.model}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`${hasImage ? 'hidden' : 'flex'} w-full h-full items-center justify-center`}>
              <CarIcon className="w-6 h-6 text-slate-400" />
            </div>
          </div>

          {/* Car Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white truncate">
                  {car.make} {car.model}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {car.year} • {car.registrationNumber} • {car.mileage?.toLocaleString('no-NO')} km
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={getStatusColor(car.status)}>
                  {getStatusText(car.status)}
                </Badge>
                <div className="text-right">
                  <div className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatPrice(car.status === 'sold' && car.soldPrice ? car.soldPrice : car.salePrice || "0")}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {daysOnStock} dager
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-3">
              <span>{car.fuelType || 'Ukjent drivstoff'}</span>
              <span>•</span>
              <span>{car.transmission || 'Ukjent girkasse'}</span>
              {car.color && (
                <>
                  <span>•</span>
                  <span>{car.color}</span>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                data-testid={`button-edit-${car.id}`}
              >
                <Edit className="w-3 h-3 mr-1" />
                Rediger
              </Button>
              
              {car.status === 'available' && (
                <Button
                  size="sm"
                  onClick={onSell}
                  disabled={isSelling}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  data-testid={`button-sell-${car.id}`}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Marker som solgt
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                disabled={isDeleting}
                className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                data-testid={`button-delete-${car.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Cars() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [showFinnImport, setShowFinnImport] = useState(false);
  const [finnUrl, setFinnUrl] = useState("");
  const [manualRegNumber, setManualRegNumber] = useState("");
  const [showRegNumberDialog, setShowRegNumberDialog] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMake, setFilterMake] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

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

  const { data: cars = [], isLoading: carsLoading, refetch: refetchCars } = useQuery<Car[]>({
    queryKey: ["/api/cars"],
    enabled: isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: async (carId: string) => {
      await apiRequest("DELETE", `/api/cars/${carId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/analytics/30"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/analytics/7"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/analytics/365"] });
      toast({
        title: "Suksess",
        description: "Bil ble slettet",
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
        description: "Kunne ikke slette bil",
        variant: "destructive",
      });
    },
  });

  const sellMutation = useMutation({
    mutationFn: async ({ carId, soldPrice }: { carId: string; soldPrice?: string }) => {
      await apiRequest("PUT", `/api/cars/${carId}/sell`, { soldPrice });
    },
    onSuccess: () => {
      // Force immediate refresh of all relevant data
      queryClient.refetchQueries({ queryKey: ["/api/cars"] });
      queryClient.refetchQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.refetchQueries({ queryKey: ["/api/dashboard/analytics/30"] });
      queryClient.refetchQueries({ queryKey: ["/api/dashboard/analytics/7"] });
      queryClient.refetchQueries({ queryKey: ["/api/dashboard/analytics/365"] });
      toast({
        title: "Suksess",
        description: "Bil markert som solgt",
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
        description: "Kunne ikke markere bil som solgt",
        variant: "destructive",
      });
    },
  });

  const finnImportMutation = useMutation({
    mutationFn: async (data: { url: string; regNumber?: string }) => {
      const response = await apiRequest("POST", "/api/cars/import-from-finn", data);
      return response;
    },
    onSuccess: async (data: any) => {
      if (data.carData) {
        toast({
          title: "Suksess", 
          description: `Bil importert: ${data.carData.make} ${data.carData.model}`,
        });
        
        // Close dialog and reset fields
        setShowFinnImport(false);
        setFinnUrl("");
        setManualRegNumber("");
        
        // Force immediate refresh
        await refetchCars();
        
        // Also update dashboard stats
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      }
    },
    onError: (error: any) => {
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
      let errorMessage = "Kunne ikke hente bildata fra Finn.no";
      
      if (error.message) {
        if (error.message.includes("eksisterer allerede")) {
          errorMessage = error.message;
        } else if (error.message.includes("duplicate key")) {
          errorMessage = "Denne bilen er allerede registrert i systemet";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Import feilet",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleFinnImport = () => {
    if (!finnUrl.trim()) {
      toast({
        title: "Feil",
        description: "Vennligst skriv inn en gyldig Finn.no URL",
        variant: "destructive",
      });
      return;
    }

    // Enhanced URL validation
    const urlPattern = /^https?:\/\/(www\.)?finn\.no\/(car|mobility)\/(item|ad)\/\d+/i;
    if (!urlPattern.test(finnUrl)) {
      toast({
        title: "Ugyldig URL",
        description: "URL må være en Finn.no bil- eller kjøretøyannonse (f.eks. https://www.finn.no/mobility/item/123456)",
        variant: "destructive",
      });
      return;
    }

    finnImportMutation.mutate({ url: finnUrl, regNumber: manualRegNumber });
  };

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900" />;
  }

  // Get unique makes for filter dropdown
  const uniqueMakes = Array.from(new Set(cars.map(car => car.make))).sort();

  // Filter and sort cars
  let filteredCars = cars.filter((car: Car) => {
    const matchesSearch = 
      car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (car as any).chassisNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${car.make} ${car.model}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || car.status === filterStatus;
    const matchesMake = filterMake === "all" || car.make === filterMake;
    
    return matchesSearch && matchesStatus && matchesMake;
  });

  // Sort cars
  filteredCars = [...filteredCars].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
      case "oldest":
        return new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime();
      case "price-high":
        return parseFloat(b.salePrice || '0') - parseFloat(a.salePrice || '0');
      case "price-low":
        return parseFloat(a.salePrice || '0') - parseFloat(b.salePrice || '0');
      case "mileage-low":
        return (a.mileage || 0) - (b.mileage || 0);
      case "mileage-high":
        return (b.mileage || 0) - (a.mileage || 0);
      case "year-new":
        return (b.year || 0) - (a.year || 0);
      case "year-old":
        return (a.year || 0) - (b.year || 0);
      case "make":
        return a.make.localeCompare(b.make);
      default:
        return 0;
    }
  });

  // Calculate days on stock
  const calculateDaysOnStock = (createdAt: string, soldDate?: string | null) => {
    const startDate = new Date(createdAt);
    const endDate = soldDate ? new Date(soldDate) : new Date();
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleSellCar = (car: Car) => {
    const soldPrice = prompt(`Salgspris for ${car.make} ${car.model}:`, car.salePrice || "");
    if (soldPrice !== null) {
      sellMutation.mutate({ carId: car.id, soldPrice });
    }
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'sold':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'reserved':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Tilgjengelig';
      case 'sold':
        return 'Solgt';
      case 'reserved':
        return 'Reservert';
      default:
        return status;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Biler</h2>
            <p className="text-slate-600 dark:text-slate-400">Administrer bilbeholdningen din</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              data-testid="button-add-car"
            >
              <Plus className="w-4 h-4 mr-2" />
              Legg til bil
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowFinnImport(true)}
              className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300 shadow-md hover:shadow-lg transition-all duration-200"
              data-testid="button-import-finn"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Importer fra Finn.no
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Søk etter reg.nr, merke, modell, chassisnummer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-cars"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]" data-testid="select-filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statuser</SelectItem>
                  <SelectItem value="available">Tilgjengelig</SelectItem>
                  <SelectItem value="sold">Solgt</SelectItem>
                  <SelectItem value="reserved">Reservert</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterMake} onValueChange={setFilterMake}>
                <SelectTrigger className="w-[130px]" data-testid="select-filter-make">
                  <SelectValue placeholder="Merke" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle merker</SelectItem>
                  {uniqueMakes.map(make => (
                    <SelectItem key={make} value={make}>{make}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]" data-testid="select-sort">
                  <SelectValue placeholder="Sorter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Nyeste først</SelectItem>
                  <SelectItem value="oldest">Eldste først</SelectItem>
                  <SelectItem value="price-high">Høyeste pris</SelectItem>
                  <SelectItem value="price-low">Laveste pris</SelectItem>
                  <SelectItem value="mileage-low">Lavest km</SelectItem>
                  <SelectItem value="mileage-high">Høyest km</SelectItem>
                  <SelectItem value="year-new">Nyeste årsmodell</SelectItem>
                  <SelectItem value="year-old">Eldste årsmodell</SelectItem>
                  <SelectItem value="make">Merke A-Å</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {filteredCars.length} av {cars.length} biler
            </span>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
                data-testid="button-view-grid"
              >
                <div className="grid grid-cols-2 gap-0.5 w-3 h-3">
                  <div className="bg-current w-1 h-1 rounded-[1px]"></div>
                  <div className="bg-current w-1 h-1 rounded-[1px]"></div>
                  <div className="bg-current w-1 h-1 rounded-[1px]"></div>
                  <div className="bg-current w-1 h-1 rounded-[1px]"></div>
                </div>
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
                data-testid="button-view-list"
              >
                <div className="flex flex-col gap-0.5 w-3 h-3">
                  <div className="bg-current w-3 h-0.5 rounded-[1px]"></div>
                  <div className="bg-current w-3 h-0.5 rounded-[1px]"></div>
                  <div className="bg-current w-3 h-0.5 rounded-[1px]"></div>
                </div>
              </Button>
            </div>
          </div>
        </div>

        {carsLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Laster biler...</p>
          </div>
        ) : filteredCars.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <Plus className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Ingen biler funnet
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {searchTerm ? "Prøv et annet søkeord" : "Legg til din første bil for å komme i gang"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Legg til bil
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
            : "space-y-4"
          }>
            {filteredCars.map((car: Car) => (
              viewMode === "grid" ? (
                <GridCarCard 
                  key={car.id} 
                  car={car} 
                  onEdit={() => setEditingCar(car)}
                  onSell={() => handleSellCar(car)}
                  onDelete={() => deleteMutation.mutate(car.id)}
                  isDeleting={deleteMutation.isPending}
                  isSelling={sellMutation.isPending}
                  calculateDaysOnStock={calculateDaysOnStock}
                  formatPrice={formatPrice}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                />
              ) : (
                <ListCarCard 
                  key={car.id} 
                  car={car} 
                  onEdit={() => setEditingCar(car)}
                  onSell={() => handleSellCar(car)}
                  onDelete={() => deleteMutation.mutate(car.id)}
                  isDeleting={deleteMutation.isPending}
                  isSelling={sellMutation.isPending}
                  calculateDaysOnStock={calculateDaysOnStock}
                  formatPrice={formatPrice}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                />
              )
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddCarModal onClose={() => setShowAddModal(false)} />
      )}

      {editingCar && (
        <EditCarModal 
          car={editingCar} 
          onClose={() => setEditingCar(null)} 
        />
      )}

      {/* Finn.no Import Dialog */}
      {showFinnImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Importer bil fra Finn.no
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Lim inn URL-en til en bil- eller kjøretøyannonse på Finn.no for å hente data automatisk.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Finn.no URL *
                </label>
                <Input
                  type="url"
                  placeholder="https://www.finn.no/mobility/item/123456"
                  value={finnUrl}
                  onChange={(e) => setFinnUrl(e.target.value)}
                  className="w-full mt-1"
                  disabled={finnImportMutation.isPending}
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Registreringsnummer (valgfritt)
                </label>
                <Input
                  type="text"
                  placeholder="F.eks: EV12345 eller AB1234"
                  value={manualRegNumber}
                  onChange={(e) => setManualRegNumber(e.target.value.toUpperCase())}
                  className="w-full mt-1"
                  disabled={finnImportMutation.isPending}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Legg til hvis ikke i annonsen for å hente SVV-data
                </p>
              </div>
              
              {finnImportMutation.isPending && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                    <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <span>Importerer bil fra Finn.no...</span>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowFinnImport(false);
                    setFinnUrl("");
                    setManualRegNumber("");
                  }}
                  disabled={finnImportMutation.isPending}
                >
                  Avbryt
                </Button>
                <Button
                  onClick={handleFinnImport}
                  disabled={finnImportMutation.isPending || !finnUrl.trim()}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {finnImportMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                      Importerer...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Importer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
