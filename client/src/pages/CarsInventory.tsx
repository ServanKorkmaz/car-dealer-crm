import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  Plus, 
  Filter,
  Download,
  Grid3x3,
  TableProperties,
  ChevronDown,
  Car as CarIcon,
  Calendar,
  Gauge,
  Fuel,
  Settings2,
  MapPin,
  Euro,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Sparkles,
  Upload,
  Eye,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  ArrowLeft,
  ExternalLink,
  Share2,
  Globe
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { Car } from "@shared/schema";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import AddCarDialog from "@/components/cars/AddCarDialog";

// Professional status configuration
const statusConfig = {
  available: {
    label: "Tilgjengelig",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
    dotColor: "bg-emerald-500"
  },
  reserved: {
    label: "Reservert",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    icon: Clock,
    dotColor: "bg-blue-500"
  },
  sold: {
    label: "Solgt",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    icon: XCircle,
    dotColor: "bg-slate-400"
  }
};

// Professional car card component
const CarCard = ({ 
  car, 
  view = "grid",
  onSelect,
  isSelected 
}: { 
  car: Car; 
  view?: "grid" | "list";
  onSelect?: (car: Car) => void;
  isSelected?: boolean;
}) => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const status = statusConfig[car.status as keyof typeof statusConfig] || statusConfig.available;
  
  const handleQuickAction = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: action,
      description: `${car.make} ${car.model} - ${action.toLowerCase()}`,
    });
  };

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseInt(price) : price;
    return new Intl.NumberFormat('nb-NO', { 
      style: 'currency', 
      currency: 'NOK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numPrice);
  };

  const formatMileage = (km: string | number) => {
    const numKm = typeof km === 'string' ? parseInt(km) : km;
    return new Intl.NumberFormat('nb-NO').format(numKm) + ' km';
  };

  if (view === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className="group"
      >
        <Card 
          className={cn(
            "hover:shadow-md transition-all duration-200 cursor-pointer border-l-4",
            status.dotColor.replace('bg-', 'border-l-'),
            isSelected && "ring-2 ring-primary"
          )}
          onClick={() => navigate(`/cars/${car.id}`)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Selection checkbox */}
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onSelect?.(car)}
                onClick={(e) => e.stopPropagation()}
                className="data-[state=checked]:bg-primary"
              />

              {/* Image */}
              <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                {car.images?.[0] ? (
                  <img 
                    src={car.images[0]} 
                    alt={`${car.make} ${car.model}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <CarIcon className="w-8 h-8 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {car.make} {car.model}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {car.year}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gauge className="w-3 h-3" />
                        {formatMileage(car.mileage || 0)}
                      </span>
                      {car.fuelType && (
                        <span className="flex items-center gap-1">
                          <Fuel className="w-3 h-3" />
                          {car.fuelType}
                        </span>
                      )}
                      {car.registrationNumber && (
                        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                          {car.registrationNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price and status */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xl font-bold">
                        {formatPrice(car.salePrice || 0)}
                      </div>

                    </div>

                    <Badge className={cn("gap-1", status.color)}>
                      <status.icon className="w-3 h-3" />
                      {status.label}
                    </Badge>

                    {/* Quick actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleQuickAction("Se detaljer", e)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Se detaljer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleQuickAction("Rediger", e)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Rediger
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleQuickAction("Dupliser", e)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Dupliser
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => handleQuickAction("Publiser til Finn.no", e)}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Publiser til Finn.no
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleQuickAction("Del på andre plattformer", e)}>
                          <Share2 className="w-4 h-4 mr-2" />
                          Del på andre plattformer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={(e) => handleQuickAction("Slett", e)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Slett
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Card 
        className={cn(
          "overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer",
          "border-0 ring-1 ring-slate-200 dark:ring-slate-800",
          isSelected && "ring-2 ring-primary"
        )}
        onClick={() => navigate(`/cars/${car.id}`)}
      >
        {/* Image section */}
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
          {car.images?.[0] ? (
            <img 
              src={car.images[0]} 
              alt={`${car.make} ${car.model}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <CarIcon className="w-16 h-16 text-slate-400" />
            </div>
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Status badge */}
          <div className="absolute top-3 left-3">
            <Badge className={cn("gap-1 backdrop-blur-sm", status.color)}>
              <status.icon className="w-3 h-3" />
              {status.label}
            </Badge>
          </div>

          {/* Selection checkbox */}
          <div className="absolute top-3 right-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect?.(car)}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/90 data-[state=checked]:bg-primary"
            />
          </div>

          {/* Quick actions - visible on hover */}
          <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              size="icon" 
              variant="secondary" 
              className="h-8 w-8 backdrop-blur-sm bg-white/90 hover:bg-white"
              onClick={(e) => handleQuickAction("Se detaljer", e)}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button 
              size="icon" 
              variant="secondary" 
              className="h-8 w-8 backdrop-blur-sm bg-white/90 hover:bg-white"
              onClick={(e) => handleQuickAction("Rediger", e)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content section */}
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Title and year */}
            <div>
              <h3 className="font-semibold text-lg line-clamp-1">
                {car.make} {car.model}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span>{car.year}</span>
                <span>•</span>
                <span>{formatMileage(car.mileage || 0)}</span>
                {car.fuelType && (
                  <>
                    <span>•</span>
                    <span>{car.fuelType}</span>
                  </>
                )}
              </div>
            </div>

            {/* Registration number */}
            {car.registrationNumber && (
              <div className="font-mono text-sm bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md w-fit">
                {car.registrationNumber}
              </div>
            )}

            {/* Price */}
            <div className="flex items-end justify-between pt-2 border-t">
              <div>
                <div className="text-2xl font-bold">
                  {formatPrice(car.salePrice || 0)}
                </div>

              </div>

              {/* EU Control indicator */}
              {car.lastEuControl && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="gap-1">
                      <FileText className="w-3 h-3" />
                      EU-kontroll
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sist godkjent: {format(new Date(car.lastEuControl), 'dd.MM.yyyy')}</p>
                    {car.nextEuControl && (
                      <p>Neste kontroll: {format(new Date(car.nextEuControl), 'dd.MM.yyyy')}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function CarsInventory() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCars, setSelectedCars] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isExporting, setIsExporting] = useState(false);
  const [showAddCarModal, setShowAddCarModal] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    status: "all",
    make: "all",
    fuelType: "all",
    transmission: "all",
    priceRange: [0, 1000000],
    yearRange: [2000, new Date().getFullYear()],
    mileageRange: [0, 300000]
  });

  // Fetch cars
  const { data: cars = [], isLoading, error } = useQuery<Car[]>({
    queryKey: ['/api/cars'],
  });

  // Filter and sort cars
  const filteredCars = useMemo(() => {
    let filtered = [...cars];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(car => 
        car.registrationNumber?.toLowerCase().includes(query) ||
        car.make?.toLowerCase().includes(query) ||
        car.model?.toLowerCase().includes(query) ||
        `${car.make} ${car.model}`.toLowerCase().includes(query)
      );
    }

    // Apply filters
    if (filters.status !== "all") {
      filtered = filtered.filter(car => car.status === filters.status);
    }
    if (filters.make !== "all") {
      filtered = filtered.filter(car => car.make === filters.make);
    }
    if (filters.fuelType !== "all") {
      filtered = filtered.filter(car => car.fuelType === filters.fuelType);
    }
    if (filters.transmission !== "all") {
      filtered = filtered.filter(car => car.transmission === filters.transmission);
    }

    // Price range
    filtered = filtered.filter(car => {
      const price = parseInt(String(car.salePrice || "0"));
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    // Year range
    filtered = filtered.filter(car => {
      const year = car.year || 0;
      return year >= filters.yearRange[0] && year <= filters.yearRange[1];
    });

    // Mileage range
    filtered = filtered.filter(car => {
      const mileage = car.mileage || 0;
      return mileage >= filters.mileageRange[0] && mileage <= filters.mileageRange[1];
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "price":
          comparison = parseInt(String(a.salePrice || "0")) - parseInt(String(b.salePrice || "0"));
          break;
        case "year":
          comparison = (a.year || 0) - (b.year || 0);
          break;
        case "mileage":
          comparison = (a.mileage || 0) - (b.mileage || 0);
          break;
        case "name":
          comparison = `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
          break;
        case "newest":
        default:
          comparison = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [cars, searchQuery, filters, sortBy, sortOrder]);

  // Get unique values for filters
  const uniqueMakes = useMemo(() => 
    Array.from(new Set(cars.map(car => car.make).filter(Boolean))).sort(),
    [cars]
  );

  const uniqueFuels = useMemo(() => 
    Array.from(new Set(cars.map(car => car.fuelType).filter(Boolean))).sort(),
    [cars]
  );

  // Selection handlers
  const handleSelectCar = (car: Car) => {
    const newSelection = new Set(selectedCars);
    if (newSelection.has(car.id)) {
      newSelection.delete(car.id);
    } else {
      newSelection.add(car.id);
    }
    setSelectedCars(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedCars.size === filteredCars.length) {
      setSelectedCars(new Set());
    } else {
      setSelectedCars(new Set(filteredCars.map(car => car.id)));
    }
  };

  // Bulk actions
  // Mark cars as sold mutation
  const markAsSoldMutation = useMutation({
    mutationFn: async (carIds: string[]) => {
      const promises = carIds.map(carId => 
        apiRequest('PUT', `/api/cars/${carId}/sold`, {})
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cars'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Biler markert som solgt",
        description: "Bilene er nå registrert som solgte i systemet",
      });
    },
    onError: (error: any) => {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['/api/cars'] });
      toast({
        title: "Feil",
        description: error.message || "Kunne ikke markere biler som solgt",
        variant: "destructive",
      });
    }
  });

  const handleBulkAction = (action: string) => {
    if (action === "Marker som solgt") {
      const carIds = Array.from(selectedCars);
      
      // Optimistic update - immediately update UI
      queryClient.setQueryData(['/api/cars'], (oldCars: Car[] | undefined) => {
        if (!oldCars) return oldCars;
        
        return oldCars.map(car => 
          carIds.includes(car.id) 
            ? { ...car, status: 'sold' as const, soldDate: new Date().toISOString() }
            : car
        );
      });
      
      // Make API call
      markAsSoldMutation.mutate(carIds);
      
      // Clear selection
      setSelectedCars(new Set());
      
      return;
    }
    
    // Handle other bulk actions
    toast({
      title: `${action} for ${selectedCars.size} biler`,
      description: "Handlingen ble utført.",
    });
    setSelectedCars(new Set());
  };

  // PDF Export function
  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('cars-inventory-content');
      if (!element) {
        toast({
          title: "Eksport feilet",
          description: "Kunne ikke finne innhold å eksportere",
          variant: "destructive",
        });
        return;
      }

      // Create canvas from the content
      const canvas = await html2canvas(element, {
        scale: 2,
        allowTaint: true,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation for better table view
      
      const imgWidth = 297; // A4 landscape width in mm
      const pageHeight = 210; // A4 landscape height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename with current date
      const today = new Date().toLocaleDateString('no-NO');
      const filename = `ForhandlerPRO-Bilbeholdning-${today}.pdf`;
      
      pdf.save(filename);
      
      toast({
        title: "PDF Eksport fullført",
        description: `Bilbeholdning eksportert som ${filename}`,
      });
    } catch (error) {
      console.error('PDF Export error:', error);
      toast({
        title: "Eksport feilet",
        description: "Kunne ikke eksportere bilbeholdning til PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };



  // Stats
  const stats = useMemo(() => ({
    total: cars.length,
    available: cars.filter(c => c.status === 'available').length,
    reserved: cars.filter(c => c.status === 'reserved').length,
    sold: cars.filter(c => c.status === 'sold').length,
    totalValue: cars
      .filter(c => c.status === 'available')
      .reduce((sum, car) => sum + parseInt(car.salePrice || "0"), 0)
  }), [cars]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                Bilbeholdning
              </h1>
              <p className="text-muted-foreground mt-1">
                Administrer din bilpark profesjonelt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* AI Price Suggestion */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <Sparkles className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>AI Prisforslag</p>
              </TooltipContent>
            </Tooltip>

            {/* Publish to platforms */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Globe className="w-4 h-4 mr-2" />
                  Publiser
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => toast({ title: "Finn.no", description: "Publiserer valgte biler til Finn.no..." })}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Publiser til Finn.no
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast({ title: "Bilbasen", description: "Publiserer til Bilbasen..." })}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Publiser til Bilbasen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast({ title: "AutoUncle", description: "Publiserer til AutoUncle..." })}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Publiser til AutoUncle
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast({ title: "Alle plattformer", description: "Publiserer til alle tilgjengelige plattformer..." })}>
                  <Globe className="w-4 h-4 mr-2" />
                  Publiser til alle
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting}>
                  <Download className="w-4 h-4 mr-2" />
                  {isExporting ? "Eksporterer..." : "Eksporter"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={exportToPDF} disabled={isExporting}>
                  <FileText className="w-4 h-4 mr-2" />
                  {isExporting ? "Eksporterer PDF..." : "Eksporter som PDF"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast({ title: "Excel Eksport", description: "Excel-eksport kommer snart..." })}>
                  <TableProperties className="w-4 h-4 mr-2" />
                  Eksporter som Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add new car */}
            <Button 
              className="gap-2 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              onClick={() => setShowAddCarModal(true)}
            >
              <Plus className="w-4 h-4" />
              Legg til bil
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div id="cars-inventory-content">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Totalt</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <CarIcon className="w-8 h-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tilgjengelig</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.available}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-emerald-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Reservert</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.reserved}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Solgt</p>
                  <p className="text-2xl font-bold text-slate-600">{stats.sold}</p>
                </div>
                <XCircle className="w-8 h-8 text-slate-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total verdi</p>
                  <p className="text-xl font-bold">
                    {new Intl.NumberFormat('nb-NO', { 
                      style: 'currency', 
                      currency: 'NOK',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(stats.totalValue)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and filters bar */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Søk etter reg.nr, VIN, merke eller modell..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Filter buttons */}
              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant={view === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    className="rounded-r-none"
                    onClick={() => setView("grid")}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={view === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="rounded-l-none"
                    onClick={() => setView("list")}
                  >
                    <TableProperties className="w-4 h-4" />
                  </Button>
                </div>

                {/* Sort */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <ArrowUpDown className="w-4 h-4" />
                      Sorter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Sorter etter</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortBy("newest")}>
                      Nyeste først
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("price")}>
                      Pris
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("year")}>
                      Årsmodell
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("mileage")}>
                      Kilometerstand
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("name")}>
                      Navn (A-Z)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                      {sortOrder === "asc" ? (
                        <>
                          <ArrowDown className="w-4 h-4 mr-2" />
                          Synkende
                        </>
                      ) : (
                        <>
                          <ArrowUp className="w-4 h-4 mr-2" />
                          Stigende
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Filters toggle */}
                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  className="gap-2"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtrer
                  {Object.values(filters).some(v => v !== "all" && v !== filters.priceRange && v !== filters.yearRange && v !== filters.mileageRange) && (
                    <Badge variant="secondary" className="ml-1">
                      {Object.values(filters).filter(v => v !== "all" && v !== filters.priceRange && v !== filters.yearRange && v !== filters.mileageRange).length}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>

            {/* Expanded filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <Separator className="my-4" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Status filter */}
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={filters.status} onValueChange={(value) => setFilters(f => ({ ...f, status: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle</SelectItem>
                          <SelectItem value="available">Tilgjengelig</SelectItem>
                          <SelectItem value="reserved">Reservert</SelectItem>
                          <SelectItem value="sold">Solgt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Make filter */}
                    <div className="space-y-2">
                      <Label>Merke</Label>
                      <Select value={filters.make} onValueChange={(value) => setFilters(f => ({ ...f, make: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle merker</SelectItem>
                          {uniqueMakes.map(make => (
                            <SelectItem key={make} value={make}>{make}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Fuel filter */}
                    <div className="space-y-2">
                      <Label>Drivstoff</Label>
                      <Select value={filters.fuelType} onValueChange={(value) => setFilters(f => ({ ...f, fuelType: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle typer</SelectItem>
                          {uniqueFuels.map(fuel => (
                            <SelectItem key={fuel} value={fuel || ""}>{fuel || ""}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Transmission filter */}
                    <div className="space-y-2">
                      <Label>Girkasse</Label>
                      <Select value={filters.transmission} onValueChange={(value) => setFilters(f => ({ ...f, transmission: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle</SelectItem>
                          <SelectItem value="manual">Manuell</SelectItem>
                          <SelectItem value="automatic">Automat</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price range */}
                    <div className="space-y-2">
                      <Label>
                        Pris: {new Intl.NumberFormat('nb-NO').format(filters.priceRange[0])} - {new Intl.NumberFormat('nb-NO').format(filters.priceRange[1])} kr
                      </Label>
                      <Slider
                        value={filters.priceRange}
                        onValueChange={(value) => setFilters(f => ({ ...f, priceRange: value as [number, number] }))}
                        max={1000000}
                        step={10000}
                        className="mt-2"
                      />
                    </div>

                    {/* Year range */}
                    <div className="space-y-2">
                      <Label>
                        År: {filters.yearRange[0]} - {filters.yearRange[1]}
                      </Label>
                      <Slider
                        value={filters.yearRange}
                        onValueChange={(value) => setFilters(f => ({ ...f, yearRange: value as [number, number] }))}
                        min={2000}
                        max={new Date().getFullYear()}
                        step={1}
                        className="mt-2"
                      />
                    </div>

                    {/* Mileage range */}
                    <div className="space-y-2">
                      <Label>
                        Kilometerstand: {new Intl.NumberFormat('nb-NO').format(filters.mileageRange[0])} - {new Intl.NumberFormat('nb-NO').format(filters.mileageRange[1])} km
                      </Label>
                      <Slider
                        value={filters.mileageRange}
                        onValueChange={(value) => setFilters(f => ({ ...f, mileageRange: value as [number, number] }))}
                        max={300000}
                        step={5000}
                        className="mt-2"
                      />
                    </div>

                    {/* Reset filters */}
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setFilters({
                          status: "all",
                          make: "all",
                          fuelType: "all",
                          transmission: "all",
                          priceRange: [0, 1000000],
                          yearRange: [2000, new Date().getFullYear()],
                          mileageRange: [0, 300000]
                        })}
                      >
                        Nullstill filtere
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Bulk actions bar */}
        <AnimatePresence>
          {selectedCars.size > 0 && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
            >
              <Card className="border-primary">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedCars.size === filteredCars.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm font-medium">
                        {selectedCars.size} av {filteredCars.length} valgt
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction("Publiser til Finn.no")}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Publiser til Finn.no
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction("Del på andre plattformer")}
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Andre plattformer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction("Eksporter")}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Eksporter valgte
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction("Marker som solgt")}
                      >
                        Marker som solgt
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleBulkAction("Slett")}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Slett valgte
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Viser {filteredCars.length} av {cars.length} biler
          </p>
        </div>

        {/* Cars grid/list */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Kunne ikke laste biler</p>
            </CardContent>
          </Card>
        ) : filteredCars.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center space-y-4">
              <CarIcon className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <div>
                <p className="font-medium">Ingen biler funnet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery || Object.values(filters).some(v => v !== "all") 
                    ? "Prøv å justere søket eller filtrene dine"
                    : "Legg til din første bil for å komme i gang"}
                </p>
              </div>
              {!searchQuery && !Object.values(filters).some(v => v !== "all") && (
                <Button onClick={() => setShowAddCarModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Legg til første bil
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className={cn(
            view === "grid" 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-3"
          )}>
            <AnimatePresence mode="popLayout">
              {filteredCars.map((car) => (
                <CarCard
                  key={car.id}
                  car={car}
                  view={view}
                  onSelect={handleSelectCar}
                  isSelected={selectedCars.has(car.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}


        </div>
      </div>
      
      {/* Add Car Dialog */}
      {showAddCarModal && (
        <AddCarDialog onClose={() => setShowAddCarModal(false)} />
      )}
    </div>
  );
}