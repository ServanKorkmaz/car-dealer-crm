import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import AddCarModal from "@/components/cars/AddCarModal";
import EditCarModal from "@/components/cars/EditCarModal";
import { 
  Plus, Search, Edit, Trash2, Car as CarIcon, Eye, DollarSign, 
  TrendingUp, TrendingDown, AlertCircle, Copy, Star, Grid3x3, 
  Fuel, X, UserPlus, ChevronDown, FilterX, ArrowUpDown, 
  Grid2x2, SquareStack, TableProperties, Filter, LayoutGrid
} from "lucide-react";
import { InviteTeamDialog } from "@/components/team/InviteTeamDialog";
import { useCanViewSensitive, useCanDelete, useCanInvite } from "@/hooks/useUserRole";
import { apiRequest } from "@/lib/queryClient";
import type { Car } from "@shared/schema";
import { Link } from "wouter";



// Professional Car Card for Grid View
function ProfessionalCarCard({ 
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
  calculateProfit,
  canDelete,
  size = "normal"
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
  canDelete: boolean;
  size?: "compact" | "normal" | "comfort";
}) {
  const canViewSensitive = useCanViewSensitive();
  const daysOnStock = calculateDaysOnStock(car.createdAt?.toString() || "", car.soldDate?.toString() || null);
  const hasImage = car.images && car.images.length > 0;
  const profit = canViewSensitive ? calculateProfit(car.salePrice || "0", car.costPrice || undefined) : { amount: 0, percentage: 0 };
  
  // Size configurations
  const sizeConfig = {
    compact: {
      card: "p-3",
      image: "h-32",
      title: "text-sm",
      subtitle: "text-xs",
      price: "text-lg",
      button: "h-7 text-xs px-2"
    },
    normal: {
      card: "p-4",
      image: "h-40",
      title: "text-base",
      subtitle: "text-sm",
      price: "text-xl",
      button: "h-8 text-sm px-3"
    },
    comfort: {
      card: "p-5",
      image: "h-48",
      title: "text-lg",
      subtitle: "text-base",
      price: "text-2xl",
      button: "h-9 text-base px-4"
    }
  };

  const config = sizeConfig[size];

  // Status color mapping with modern colors
  const getModernStatusColor = (status: string) => {
    switch (status) {
      case 'sold': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800';
      case 'available': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
      case 'reserved': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 ring-1 ring-slate-200 dark:ring-slate-800 hover:ring-slate-300 dark:hover:ring-slate-700" 
          data-testid={`card-car-${car.id}`}>
      <CardContent className={config.card}>
        {/* Image Container with Status Overlay */}
        <div className={`relative ${config.image} rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 mb-4`}>
          {hasImage ? (
            <img 
              src={car.images![0]} 
              alt={`${car.make} ${car.model}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          
          {/* Placeholder when no image */}
          <div className={`${hasImage ? 'hidden' : 'flex'} absolute inset-0 items-center justify-center`}>
            <div className="text-center">
              <CarIcon className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Ingen bilde</span>
            </div>
          </div>
          
          {/* Status Badge - Top Left */}
          <div className="absolute top-3 left-3">
            <Badge className={`${getModernStatusColor(car.status || 'available')} border font-medium px-2.5 py-1 text-xs`}>
              {getStatusText(car.status || 'available')}
            </Badge>
          </div>
          
          {/* Favorite Button - Top Right */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleFavorite}
                className="absolute top-3 right-3 p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-white/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm"
              >
                <Star className={`w-4 h-4 ${isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-slate-400 hover:text-yellow-500'}`} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {isFavorite ? 'Fjern fra favoritter' : 'Legg til favoritter'}
            </TooltipContent>
          </Tooltip>
          
          {/* Days on Stock - Bottom Right */}
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-sm text-white text-xs font-medium">
            {daysOnStock} dager
          </div>
        </div>

        {/* Car Information */}
        <div className="space-y-3">
          {/* Title and Warnings */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className={`font-bold text-slate-900 dark:text-white truncate ${config.title}`}>
                {car.make} {car.model}
              </h3>
              <p className={`text-slate-600 dark:text-slate-400 font-medium ${config.subtitle}`}>
                {car.year}
              </p>
            </div>
            {(!hasImage || !car.euControl) && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    {!hasImage && <div>• Mangler bilde</div>}
                    {!car.euControl && <div>• Mangler EU-kontroll</div>}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Technical Details */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{car.registrationNumber}</span>
              <Separator orientation="vertical" className="h-4" />
              <span>{car.mileage?.toLocaleString('no-NO')} km</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
              <Fuel className="w-4 h-4" />
              <span>{car.fuelType || 'Ukjent'}</span>
              <Separator orientation="vertical" className="h-4" />
              <span>{car.transmission || 'Auto'}</span>
            </div>
          </div>

          {/* Price and Profit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`font-bold text-slate-900 dark:text-white ${config.price}`}>
                {formatPrice(car.salePrice || "0")}
              </span>
              {canViewSensitive && profit.amount !== 0 && (
                <div className="flex items-center gap-1">
                  {profit.amount > 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${profit.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {profit.amount > 0 ? '+' : ''}{formatPrice(String(profit.amount))}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/cars/${car.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className={`w-full ${config.button} border-slate-300 dark:border-slate-600`}>
                    <Eye className="w-4 h-4 mr-2" />
                    Detaljer
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Se full bilprofil</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  className={config.button}
                  data-testid={`button-edit-${car.id}`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rediger bil</TooltipContent>
            </Tooltip>

            {car.status === 'available' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={onSell}
                    disabled={isSelling}
                    className={`${config.button} bg-emerald-600 hover:bg-emerald-700 text-white border-0`}
                    data-testid={`button-sell-${car.id}`}
                  >
                    <DollarSign className="w-4 h-4 mr-1" />
                    Selg
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Opprett salgskontrakt</TooltipContent>
              </Tooltip>
            )}
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
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMake, setFilterMake] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [gridSize, setGridSize] = useState<"compact" | "normal" | "comfort">("normal");
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const canDelete = useCanDelete();
  const canInvite = useCanInvite();
  const queryClient = useQueryClient();
  
  // Fetch cars with refined query
  const { data: cars = [], isLoading: carsLoading, error: carsError } = useQuery({
    queryKey: ["/api/cars"],
    enabled: isAuthenticated,
  });

  // Utility functions (keeping existing logic)
  const calculateDaysOnStock = (createdAt: string, soldDate?: string | null) => {
    const startDate = new Date(createdAt);
    const endDate = soldDate ? new Date(soldDate) : new Date();
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatPrice = (price: string) => {
    const num = parseInt(price);
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sold': return 'bg-red-100 text-red-800';
      case 'available': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reserved': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sold': return 'Solgt';
      case 'available': return 'Tilgjengelig';
      case 'pending': return 'Venter';
      case 'reserved': return 'Reservert';
      default: return 'Ukjent';
    }
  };

  const calculateProfit = (salePrice: string, costPrice?: string) => {
    if (!costPrice) return { amount: 0, percentage: 0 };
    const sale = parseInt(salePrice);
    const cost = parseInt(costPrice);
    const profit = sale - cost;
    const percentage = cost > 0 ? (profit / cost) * 100 : 0;
    return { amount: profit, percentage };
  };

  // Filter and sort cars
  const filteredCars = cars
    .filter(car => {
      const matchesSearch = 
        car.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        car.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        car.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || car.status === filterStatus;
      const matchesMake = filterMake === "all" || car.make === filterMake;
      
      const price = parseInt(car.salePrice || "0");
      const matchesPrice = price >= priceRange[0] && price <= priceRange[1];
      
      return matchesSearch && matchesStatus && matchesMake && matchesPrice;
    })
    .sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case "price":
          aVal = parseInt(a.salePrice || "0");
          bVal = parseInt(b.salePrice || "0");
          break;
        case "year":
          aVal = a.year || 0;
          bVal = b.year || 0;
          break;
        case "mileage":
          aVal = a.mileage || 0;
          bVal = b.mileage || 0;
          break;
        case "make":
          aVal = a.make || "";
          bVal = b.make || "";
          break;
        default:
          aVal = new Date(a.createdAt || 0).getTime();
          bVal = new Date(b.createdAt || 0).getTime();
      }
      
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  // Get unique makes for filter
  const uniqueMakes = [...new Set(cars.map(car => car.make).filter(Boolean))];

  // Mutations (keeping existing logic)
  const deleteMutation = useMutation({
    mutationFn: (carId: string) => apiRequest(`/api/cars/${carId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cars'] });
      toast({ title: "Bil slettet", description: "Bilen er slettet fra lageret." });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Ikke autorisert", description: "Du har ikke tilgang til å slette biler.", variant: "destructive" });
      } else {
        toast({ title: "Feil", description: "Kunne ikke slette bil.", variant: "destructive" });
      }
    }
  });

  const sellMutation = useMutation({
    mutationFn: (carId: string) => apiRequest(`/api/cars/${carId}/sell`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cars'] });
      toast({ title: "Bil solgt", description: "Bilen er markert som solgt." });
    },
    onError: () => {
      toast({ title: "Feil", description: "Kunne ikke selge bil.", variant: "destructive" });
    }
  });

  const toggleFavorite = (carId: string) => {
    const newFavorites = new Set(favorites);
    if (favorites.has(carId)) {
      newFavorites.delete(carId);
    } else {
      newFavorites.add(carId);
    }
    setFavorites(newFavorites);
  };

  if (!isAuthenticated) {
    return <div>Please log in to view cars.</div>;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Biler</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Administrer billageret ditt ({filteredCars.length} av {cars.length} biler)
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {canInvite && (
              <Button
                variant="outline"
                onClick={() => setShowInviteModal(true)}
                className="border-slate-300 dark:border-slate-600"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Inviter team
              </Button>
            )}
            
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white border-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ny bil
            </Button>
          </div>
        </div>

        {/* Sticky Search and Filter Bar */}
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Søk etter merke, modell eller regnummer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-300 dark:border-slate-600 rounded-xl h-12 text-base"
                data-testid="input-search"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] h-12 rounded-xl border-slate-300 dark:border-slate-600">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statuser</SelectItem>
                  <SelectItem value="available">Tilgjengelig</SelectItem>
                  <SelectItem value="sold">Solgt</SelectItem>
                  <SelectItem value="pending">Venter</SelectItem>
                  <SelectItem value="reserved">Reservert</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterMake} onValueChange={setFilterMake}>
                <SelectTrigger className="w-[140px] h-12 rounded-xl border-slate-300 dark:border-slate-600">
                  <SelectValue placeholder="Merke" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle merker</SelectItem>
                  {uniqueMakes.map(make => (
                    <SelectItem key={make} value={make!}>{make}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`h-12 px-4 rounded-xl border-slate-300 dark:border-slate-600 ${showFilters ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-2">
              {/* Sort */}
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field);
                setSortOrder(order as "asc" | "desc");
              }}>
                <SelectTrigger className="w-[180px] h-12 rounded-xl border-slate-300 dark:border-slate-600">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-desc">Nyeste først</SelectItem>
                  <SelectItem value="createdAt-asc">Eldste først</SelectItem>
                  <SelectItem value="price-desc">Høyeste pris</SelectItem>
                  <SelectItem value="price-asc">Laveste pris</SelectItem>
                  <SelectItem value="year-desc">Nyeste årsmodell</SelectItem>
                  <SelectItem value="year-asc">Eldste årsmodell</SelectItem>
                  <SelectItem value="mileage-asc">Lavest km</SelectItem>
                  <SelectItem value="mileage-desc">Høyest km</SelectItem>
                  <SelectItem value="make-asc">Merke A-Å</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "grid" | "list")}>
                <ToggleGroupItem value="grid" className="h-12 px-4 rounded-xl">
                  <Grid3x3 className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" className="h-12 px-4 rounded-xl">
                  <TableProperties className="w-4 h-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Grid Size Control */}
              {viewMode === "grid" && (
                <ToggleGroup type="single" value={gridSize} onValueChange={(value) => value && setGridSize(value as typeof gridSize)}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="compact" className="h-12 px-3 rounded-xl">
                        <SquareStack className="w-4 h-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>Kompakt visning</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="normal" className="h-12 px-3 rounded-xl">
                        <Grid2x2 className="w-4 h-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>Normal visning</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="comfort" className="h-12 px-3 rounded-xl">
                        <LayoutGrid className="w-4 h-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>Komfort visning</TooltipContent>
                  </Tooltip>
                </ToggleGroup>
              )}
            </div>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Price Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Prisområde: {formatPrice(String(priceRange[0]))} - {formatPrice(String(priceRange[1]))}
                  </Label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={1000000}
                    min={0}
                    step={10000}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterStatus("all");
                    setFilterMake("all");
                    setPriceRange([0, 1000000]);
                    setSearchTerm("");
                  }}
                  className="text-slate-600 dark:text-slate-400"
                >
                  <FilterX className="w-4 h-4 mr-2" />
                  Nullstill filter
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {carsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCars.length === 0 ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <CarIcon className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {searchTerm || filterStatus !== "all" || filterMake !== "all" ? "Ingen biler matchet søket" : "Ingen biler registrert"}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {searchTerm || filterStatus !== "all" || filterMake !== "all" 
                  ? "Prøv å justere søkekriteriene eller filtrene for å finne biler."
                  : "Kom i gang ved å registrere din første bil i lageret."
                }
              </p>
              {(!searchTerm && filterStatus === "all" && filterMake === "all") && (
                <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Legg til første bil
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className={`grid gap-6 ${
                gridSize === "compact" 
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                  : gridSize === "normal"
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              }`}>
                {filteredCars.map((car) => (
                  <ProfessionalCarCard
                    key={car.id}
                    car={car}
                    size={gridSize}
                    onEdit={() => setEditingCar(car)}
                    onSell={() => sellMutation.mutate(car.id)}
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
                    canDelete={canDelete}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Bil</th>
                        <th className="p-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Reg.nr</th>
                        <th className="p-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Modell</th>
                        <th className="p-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Drivstoff</th>
                        <th className="p-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Status</th>
                        <th className="p-4 text-right text-sm font-semibold text-slate-900 dark:text-white">Pris</th>
                        <th className="p-4 text-center text-sm font-semibold text-slate-900 dark:text-white">Dager</th>
                        <th className="p-4 text-center text-sm font-semibold text-slate-900 dark:text-white">Handlinger</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCars.map((car) => (
                        <tr key={car.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group" 
                            data-testid={`row-car-${car.id}`}>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                                {car.images && car.images.length > 0 ? (
                                  <img 
                                    src={car.images[0]} 
                                    alt={`${car.make} ${car.model}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <CarIcon className="w-6 h-6 text-slate-400" />
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => toggleFavorite(car.id)}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              >
                                <Star className={`w-4 h-4 ${favorites.has(car.id) ? 'text-yellow-500 fill-yellow-500' : 'text-slate-400'}`} />
                              </button>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-mono font-medium text-slate-900 dark:text-white">
                              {car.registrationNumber}
                            </span>
                          </td>
                          <td className="p-4">
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {car.make} {car.model}
                              </div>
                              <div className="text-sm text-slate-600 dark:text-slate-400">
                                {car.year} • {car.mileage?.toLocaleString('no-NO')} km
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              <div>{car.fuelType || 'Ukjent'}</div>
                              <div>{car.transmission || 'Auto'}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={`${getStatusColor(car.status || 'available')} border font-medium`}>
                              {getStatusText(car.status || 'available')}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="text-right">
                              <div className="font-bold text-lg text-slate-900 dark:text-white">
                                {formatPrice(car.salePrice || "0")}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {calculateDaysOnStock(car.createdAt?.toString() || "", car.soldDate?.toString() || null)} dager
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link href={`/cars/${car.id}`}>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent>Se detaljer</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingCar(car)}
                                    className="h-8 w-8 p-0"
                                    data-testid={`button-edit-${car.id}`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Rediger</TooltipContent>
                              </Tooltip>

                              {car.status === 'available' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      onClick={() => sellMutation.mutate(car.id)}
                                      disabled={sellMutation.isPending}
                                      className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                      data-testid={`button-sell-${car.id}`}
                                    >
                                      Selg
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Opprett salgskontrakt</TooltipContent>
                                </Tooltip>
                              )}

                              {canDelete && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteMutation.mutate(car.id)}
                                      disabled={deleteMutation.isPending}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                      data-testid={`button-delete-${car.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Slett bil</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modals */}
        {showAddModal && (
          <AddCarModal onClose={() => setShowAddModal(false)} />
        )}

        {editingCar && (
          <EditCarModal car={editingCar} onClose={() => setEditingCar(null)} />
        )}

        {showInviteModal && (
          <InviteTeamDialog
            open={showInviteModal}
            onOpenChange={setShowInviteModal}
          />
        )}
      </div>
    </MainLayout>
  );
}

