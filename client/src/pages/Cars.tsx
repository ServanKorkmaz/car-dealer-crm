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
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import AddCarModal from "@/components/cars/AddCarModal";
import EditCarModal from "@/components/cars/EditCarModal";
import CarCard from "@/components/cars/CarCard";
import { 
  Plus, Search, Edit, Trash2, CheckCircle, Clock, ExternalLink, 
  Filter, SortAsc, Car as CarIcon, Calendar, Gauge, MapPin,
  Eye, DollarSign, Settings, TrendingUp, TrendingDown, AlertCircle,
  Copy, Star, Grid3x3, List, LayoutGrid, Fuel, Info, X,
  Layers3, Layers2, Layers
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Car } from "@shared/schema";
import { Link } from "wouter";
import SavedViewsToolbar from "@/components/shared/SavedViewsToolbar";
import { deserializeViewFromUrl, type SavedViewPayload } from "@/hooks/useSavedViews";

// Improved Grid Card Component - kompakt og oversiktlig
function GridCarCard({ 
  car, 
  onEdit, 
  onSell, 
  onDelete, 
  onToggleFavorite,
  isDeleting, 
  isSelling,
  isFavorite,
  calculateDaysOnStock, 
  formatPrice, 
  getStatusColor, 
  getStatusText,
  calculateProfit 
}: {
  car: Car;
  onEdit: () => void;
  onSell: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  isDeleting: boolean;
  isSelling: boolean;
  isFavorite: boolean;
  calculateDaysOnStock: (createdAt: string, soldDate?: string | null) => number;
  formatPrice: (price: string) => string;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  calculateProfit: (salePrice: string, costPrice?: string) => { amount: number; percentage: number };
}) {
  const daysOnStock = calculateDaysOnStock(car.createdAt?.toString() || "", car.soldDate?.toString() || null);
  const hasImage = car.images && car.images.length > 0;
  const profit = calculateProfit(car.salePrice || "0", car.costPrice || undefined);
  const [showQuickInfo, setShowQuickInfo] = useState(false);

  // Advarselsflagg for manglende data
  const warnings = [];
  if (!hasImage) warnings.push("Mangler bilde");
  if (!car.euControl) warnings.push("Mangler EU-kontroll");
  
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col" data-testid={`card-car-${car.id}`}>
      {/* Bilbilde med statusmerking */}
      <div className="relative h-36 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2">
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
        <div className={`${hasImage ? 'hidden' : 'flex'} absolute inset-0 items-center justify-center`}>
          <CarIcon className="w-10 h-10 text-slate-400" />
        </div>
        
        {/* Status badge øverst til venstre */}
        <Badge className={`absolute top-2 left-2 ${getStatusColor(car.status || 'available')} text-xs px-2 py-0.5`}>
          {getStatusText(car.status || 'available')}
        </Badge>
        
        {/* Pris øverst til høyre */}
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-sm font-bold">
          {formatPrice(car.salePrice || "0")}
        </div>
        
        {/* Dager på lager nederst til høyre */}
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded">
          {daysOnStock} dager
        </div>
        
        {/* Favorittmerking */}
        <button
          onClick={onToggleFavorite}
          className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm p-1 rounded hover:bg-black/80 transition-colors"
        >
          <Star className={`w-4 h-4 ${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-white'}`} />
        </button>
      </div>

      {/* Tittel og hovedinfo */}
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
            {car.make} {car.model} {car.year}
          </h3>
          {warnings.length > 0 && (
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          )}
        </div>
        
        {/* Teknisk info på én linje */}
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 truncate">
          {car.registrationNumber} · {car.mileage?.toLocaleString('no-NO')} km · {car.transmission || 'Auto'} · {car.fuelType || 'Ukjent'}
        </p>
        
        {/* Fortjeneste-indikator */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            {profit.amount > 0 ? (
              <>
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-xs font-medium text-green-600">
                  +{formatPrice(String(profit.amount))} ({profit.percentage.toFixed(0)}%)
                </span>
              </>
            ) : profit.amount < 0 ? (
              <>
                <TrendingDown className="w-3 h-3 text-red-600" />
                <span className="text-xs font-medium text-red-600">
                  {formatPrice(String(profit.amount))} ({profit.percentage.toFixed(0)}%)
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-400">Ingen kostpris</span>
            )}
          </div>
        </div>
        
        {/* Handlingsknapper */}
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => setShowQuickInfo(!showQuickInfo)}
          >
            <Info className="w-3 h-3 mr-1" />
            Detaljer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-7 px-2"
            data-testid={`button-edit-${car.id}`}
          >
            <Edit className="w-3 h-3" />
          </Button>
          {car.status === 'available' && (
            <Button
              size="sm"
              onClick={onSell}
              disabled={isSelling}
              className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700"
              data-testid={`button-sell-${car.id}`}
            >
              Selg
            </Button>
          )}
        </div>
        
        {/* Utvidet info (toggle) */}
        {showQuickInfo && (
          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Kostpris:</span>
              <span className="font-medium">{car.costPrice ? formatPrice(car.costPrice) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">EU-kontroll:</span>
              <span className="font-medium">{car.euControl || 'Ikke registrert'}</span>
            </div>
            {car.finnUrl && (
              <button
                onClick={() => navigator.clipboard.writeText(car.finnUrl!)}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
              >
                <Copy className="w-3 h-3" />
                Kopier Finn-lenke
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Improved List Card Component - kompakt listevisning
function ListCarCard({ 
  car, 
  onEdit, 
  onSell, 
  onDelete, 
  onToggleFavorite,
  isDeleting, 
  isSelling,
  isFavorite,
  calculateDaysOnStock, 
  formatPrice, 
  getStatusColor, 
  getStatusText,
  calculateProfit 
}: {
  car: Car;
  onEdit: () => void;
  onSell: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  isDeleting: boolean;
  isSelling: boolean;
  isFavorite: boolean;
  calculateDaysOnStock: (createdAt: string, soldDate?: string | null) => number;
  formatPrice: (price: string) => string;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  calculateProfit: (salePrice: string, costPrice?: string) => { amount: number; percentage: number };
}) {
  const daysOnStock = calculateDaysOnStock(car.createdAt?.toString() || "", car.soldDate?.toString() || null);
  const hasImage = car.images && car.images.length > 0;
  const profit = calculateProfit(car.salePrice || "0", car.costPrice || undefined);
  
  // Advarselsflagg
  const warnings = [];
  if (!hasImage) warnings.push("Mangler bilde");
  if (!car.euControl) warnings.push("Mangler EU-kontroll");

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-3" data-testid={`card-car-${car.id}`}>
      <div className="flex items-center gap-3">
        {/* Miniatyrbilde */}
        <div className="w-24 h-16 flex-shrink-0 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden relative">
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
          
          {/* Favorittmerking */}
          <button
            onClick={onToggleFavorite}
            className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm p-0.5 rounded"
          >
            <Star className={`w-3 h-3 ${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-white'}`} />
          </button>
        </div>

        {/* Bilinformasjon */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                  {car.make} {car.model} {car.year}
                </h3>
                {warnings.length > 0 && (
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {car.registrationNumber} · {car.mileage?.toLocaleString('no-NO')} km · {car.transmission || 'Auto'} · {car.fuelType || 'Ukjent'}
              </p>
            </div>
            
            {/* Status og pris */}
            <div className="flex items-center gap-3">
              <Badge className={`${getStatusColor(car.status || 'available')} text-xs`}>
                {getStatusText(car.status || 'available')}
              </Badge>
              <div className="text-right">
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatPrice(car.salePrice || "0")}
                </div>
                <div className="text-xs text-slate-500">
                  {daysOnStock} dager
                </div>
              </div>
            </div>
          </div>

          {/* Fortjeneste og handlinger */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              {profit.amount > 0 ? (
                <>
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <span className="text-xs font-medium text-green-600">
                    +{formatPrice(String(profit.amount))} ({profit.percentage.toFixed(0)}%)
                  </span>
                </>
              ) : profit.amount < 0 ? (
                <>
                  <TrendingDown className="w-3 h-3 text-red-600" />
                  <span className="text-xs font-medium text-red-600">
                    {formatPrice(String(profit.amount))} ({profit.percentage.toFixed(0)}%)
                  </span>
                </>
              ) : (
                <span className="text-xs text-slate-400">Ingen kostpris</span>
              )}
            </div>
            
            {/* Handlingsknapper */}
            <div className="flex gap-1">
              <Link href={`/cars/${car.id}`}>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  Detaljer
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-7 px-2"
                data-testid={`button-edit-${car.id}`}
              >
                <Edit className="w-3 h-3" />
              </Button>
              {car.status === 'available' && (
                <Button
                  size="sm"
                  onClick={onSell}
                  disabled={isSelling}
                  className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700"
                  data-testid={`button-sell-${car.id}`}
                >
                  Selg
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={isDeleting}
                className="h-7 px-2 text-red-600 hover:text-red-700"
                data-testid={`button-delete-${car.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
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
  const [filterFuelType, setFilterFuelType] = useState("all");
  const [filterYear, setFilterYear] = useState<[number, number]>([2000, new Date().getFullYear()]);
  const [filterMileage, setFilterMileage] = useState<[number, number]>([0, 500000]);
  const [filterPrice, setFilterPrice] = useState<[number, number]>([0, 2000000]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [density, setDensity] = useState<'comfort' | 'normal' | 'compact'>('normal');
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [sellingCar, setSellingCar] = useState<Car | null>(null);
  const [salePrice, setSalePrice] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // Load density preference from localStorage
  useEffect(() => {
    const savedDensity = localStorage.getItem('cars_density') as 'comfort' | 'normal' | 'compact' | null;
    if (savedDensity) {
      setDensity(savedDensity);
    }
  }, []);
  
  // Save density preference to localStorage
  const handleDensityChange = (newDensity: 'comfort' | 'normal' | 'compact') => {
    setDensity(newDensity);
    localStorage.setItem('cars_density', newDensity);
  };

  // Handle URL-based view sharing
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    if (viewParam) {
      const payload = deserializeViewFromUrl(viewParam);
      if (payload) {
        applyViewPayload(payload);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Create current filter state for saved views
  const getCurrentFilters = (): SavedViewPayload => {
    return {
      searchTerm,
      sortBy,
      filterStatus,
      filterMake,
      filterFuelType,
      filterYear,
      filterMileage,
      filterPrice,
      density,
      viewMode,
      showFilters,
    };
  };

  // Apply saved view payload
  const applyViewPayload = (payload: SavedViewPayload) => {
    if (payload.searchTerm !== undefined) setSearchTerm(payload.searchTerm);
    if (payload.sortBy !== undefined) setSortBy(payload.sortBy);
    if (payload.filterStatus !== undefined) setFilterStatus(payload.filterStatus);
    if (payload.filterMake !== undefined) setFilterMake(payload.filterMake);
    if (payload.filterFuelType !== undefined) setFilterFuelType(payload.filterFuelType);
    if (payload.filterYear !== undefined) setFilterYear(payload.filterYear);
    if (payload.filterMileage !== undefined) setFilterMileage(payload.filterMileage);
    if (payload.filterPrice !== undefined) setFilterPrice(payload.filterPrice);
    if (payload.density !== undefined) handleDensityChange(payload.density);
    if (payload.viewMode !== undefined) setViewMode(payload.viewMode);
    if (payload.showFilters !== undefined) setShowFilters(payload.showFilters);
  };

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

  // Get unique makes and fuel types for filter dropdown
  const uniqueMakes = Array.from(new Set(cars.map(car => car.make))).sort();
  const uniqueFuelTypes = Array.from(new Set(cars.map(car => car.fuelType).filter(Boolean))).sort();
  
  // Calculate profit function
  const calculateProfit = (salePrice: string, costPrice?: string) => {
    const sale = parseFloat(salePrice || '0');
    const cost = parseFloat(costPrice || '0');
    if (cost === 0) return { amount: 0, percentage: 0 };
    const amount = sale - cost;
    const percentage = (amount / cost) * 100;
    return { amount, percentage };
  };
  
  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('carFavorites');
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
  }, []);
  
  // Save favorites to localStorage
  const toggleFavorite = (carId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(carId)) {
      newFavorites.delete(carId);
    } else {
      newFavorites.add(carId);
    }
    setFavorites(newFavorites);
    localStorage.setItem('carFavorites', JSON.stringify(Array.from(newFavorites)));
  };

  // Filter and sort cars with advanced filters
  let filteredCars = cars.filter((car: Car) => {
    const matchesSearch = 
      car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (car as any).chassisNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${car.make} ${car.model}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || car.status === filterStatus;
    const matchesMake = filterMake === "all" || car.make === filterMake;
    const matchesFuelType = filterFuelType === "all" || car.fuelType === filterFuelType;
    
    // Year filter
    const carYear = car.year || 0;
    const matchesYear = carYear >= filterYear[0] && carYear <= filterYear[1];
    
    // Mileage filter
    const carMileage = car.mileage || 0;
    const matchesMileage = carMileage >= filterMileage[0] && carMileage <= filterMileage[1];
    
    // Price filter
    const carPrice = parseFloat(car.salePrice || '0');
    const matchesPrice = carPrice >= filterPrice[0] && carPrice <= filterPrice[1];
    
    return matchesSearch && matchesStatus && matchesMake && matchesFuelType && 
           matchesYear && matchesMileage && matchesPrice;
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
    setSellingCar(car);
    setSalePrice(car.salePrice || "");
    setShowSellDialog(true);
  };

  const confirmSell = () => {
    if (sellingCar) {
      sellMutation.mutate({ 
        carId: sellingCar.id, 
        soldPrice: salePrice 
      });
      setShowSellDialog(false);
      setSellingCar(null);
      setSalePrice("");
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

        {/* Saved Views Toolbar */}
        <SavedViewsToolbar
          page="cars"
          currentFilters={getCurrentFilters()}
          onApplyView={applyViewPayload}
          className="mb-4"
        />

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
            
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-10"
              >
                <Filter className="w-4 h-4 mr-2" />
                Avanserte filtre
                {showFilters && <X className="w-4 h-4 ml-2" />}
              </Button>
              
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

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {filteredCars.length} av {cars.length} biler
            </span>
            
            {/* Density toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Tetthet:</span>
              <ToggleGroup 
                type="single" 
                value={density} 
                onValueChange={(value) => value && handleDensityChange(value as 'comfort' | 'normal' | 'compact')}
                className="border rounded-md"
              >
                <ToggleGroupItem value="comfort" aria-label="Komfort" className="px-3 py-1">
                  <Layers3 className="w-4 h-4 mr-1" />
                  Komfort
                </ToggleGroupItem>
                <ToggleGroupItem value="normal" aria-label="Normal" className="px-3 py-1">
                  <Layers2 className="w-4 h-4 mr-1" />
                  Normal
                </ToggleGroupItem>
                <ToggleGroupItem value="compact" aria-label="Kompakt" className="px-3 py-1">
                  <Layers className="w-4 h-4 mr-1" />
                  Kompakt
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            {/* View mode toggle */}
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

        {/* Advanced Filters Panel */}
        {showFilters && (
          <Card className="p-4 bg-slate-50 dark:bg-slate-800/50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Fuel Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="fuel-type" className="text-sm font-medium">Drivstofftype</Label>
                <Select value={filterFuelType} onValueChange={setFilterFuelType}>
                  <SelectTrigger id="fuel-type">
                    <SelectValue placeholder="Velg drivstoff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle typer</SelectItem>
                    {uniqueFuelTypes.map(fuel => (
                      <SelectItem key={fuel || 'unknown'} value={fuel || 'unknown'}>{fuel || 'Ukjent'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Year Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Årsmodell: {filterYear[0]} - {filterYear[1]}</Label>
                <div className="px-2">
                  <Slider
                    value={filterYear}
                    onValueChange={(value) => setFilterYear(value as [number, number])}
                    min={2000}
                    max={new Date().getFullYear()}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* Mileage Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Kilometerstand: {filterMileage[0].toLocaleString()} - {filterMileage[1].toLocaleString()} km
                </Label>
                <div className="px-2">
                  <Slider
                    value={filterMileage}
                    onValueChange={(value) => setFilterMileage(value as [number, number])}
                    min={0}
                    max={500000}
                    step={10000}
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* Price Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Pris: {formatPrice(String(filterPrice[0]))} - {formatPrice(String(filterPrice[1]))}
                </Label>
                <div className="px-2">
                  <Slider
                    value={filterPrice}
                    onValueChange={(value) => setFilterPrice(value as [number, number])}
                    min={0}
                    max={2000000}
                    step={50000}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            
            {/* Reset Filters Button */}
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterStatus("all");
                  setFilterMake("all");
                  setFilterFuelType("all");
                  setFilterYear([2000, new Date().getFullYear()]);
                  setFilterMileage([0, 500000]);
                  setFilterPrice([0, 2000000]);
                  setSearchTerm("");
                }}
              >
                Nullstill filtre
              </Button>
            </div>
          </Card>
        )}

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
          <div className={`
            ${viewMode === "grid" 
              ? `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 
                 ${density === 'compact' ? 'gap-2' : density === 'comfort' ? 'gap-6' : 'gap-4'}` 
              : "space-y-3"
            }
          `}>
            {filteredCars.map((car: Car) => (
              viewMode === "grid" ? (
                <CarCard
                  key={car.id} 
                  car={car}
                  density={density}
                  onEdit={() => setEditingCar(car)}
                  onSell={() => handleSellCar(car)}
                  onDelete={() => deleteMutation.mutate(car.id)}
                  onToggleFavorite={() => toggleFavorite(car.id)}
                  isDeleting={deleteMutation.isPending}
                  isSelling={sellMutation.isPending}
                  isFavorite={favorites.has(car.id)}
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
                  onToggleFavorite={() => toggleFavorite(car.id)}
                  isDeleting={deleteMutation.isPending}
                  isSelling={sellMutation.isPending}
                  isFavorite={favorites.has(car.id)}
                  calculateDaysOnStock={calculateDaysOnStock}
                  formatPrice={formatPrice}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                  calculateProfit={calculateProfit}
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

      {/* Sell Car Dialog */}
      {showSellDialog && sellingCar && (
        <Dialog open={showSellDialog} onOpenChange={(open) => {
          if (!open) {
            setShowSellDialog(false);
            setSellingCar(null);
            setSalePrice("");
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Marker som solgt
              </DialogTitle>
              <DialogDescription>
                Angi salgspris for {sellingCar.make} {sellingCar.model} ({sellingCar.registrationNumber})
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 pt-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Utsalgspris:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {formatPrice(sellingCar.salePrice || "0")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Innkjøpspris:</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {formatPrice(sellingCar.costPrice || "0")}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Faktisk salgspris
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    placeholder="Angi salgspris"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="pl-10 text-lg font-medium"
                    autoFocus
                    data-testid="input-sale-price"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Beløp i norske kroner (NOK)
                </p>
              </div>
              
              {salePrice && sellingCar.costPrice && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-700 dark:text-blue-300">Fortjeneste:</span>
                    <span className={`font-bold ${
                      parseInt(salePrice) - parseInt(sellingCar.costPrice) >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatPrice((parseInt(salePrice || "0") - parseInt(sellingCar.costPrice || "0")).toString())}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSellDialog(false);
                  setSellingCar(null);
                  setSalePrice("");
                }}
                className="flex-1"
                data-testid="button-cancel-sell"
              >
                Avbryt
              </Button>
              <Button
                onClick={confirmSell}
                disabled={!salePrice || sellMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
                data-testid="button-confirm-sell"
              >
                {sellMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marker som solgt
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
