import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EditCarModal from "@/components/cars/EditCarModal";
import { 
  ArrowLeft, Edit, Trash2, CheckCircle, Clock, Calendar, 
  Gauge, Settings, MapPin, Fuel, Car as CarIcon, Eye,
  Download, Share, Heart
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Car } from "@shared/schema";
import { useLocation, useRoute } from "wouter";

export default function CarDetail() {
  const [, params] = useRoute("/cars/:id");
  const [, setLocation] = useLocation();
  const carId = params?.id;
  
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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

  const { data: car, isLoading: carLoading, error } = useQuery<Car>({
    queryKey: ["/api/cars", carId],
    queryFn: async () => {
      const response = await fetch(`/api/cars/${carId}`);
      if (!response.ok) {
        throw new Error('Car not found');
      }
      return response.json();
    },
    enabled: isAuthenticated && !!carId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (carId: string) => {
      await apiRequest("DELETE", `/api/cars/${carId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Suksess",
        description: "Bil ble slettet",
      });
      setLocation("/cars");
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
    mutationFn: async ({ carId, soldPrice }: { carId: string; soldPrice: string }) => {
      await apiRequest("PUT", `/api/cars/${carId}/sell`, { soldPrice });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars", carId] });
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/analytics/30"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/analytics/7"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/analytics/365"] });
      toast({
        title: "Suksess",
        description: "Bil ble markert som solgt",
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

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900" />;
  }

  if (carLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !car) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <CarIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Bil ikke funnet
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Bilen du ser etter eksisterer ikke eller er blitt slettet.
            </p>
            <Button onClick={() => setLocation("/cars")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tilbake til biler
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const handleSellCar = () => {
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

  const calculateDaysOnStock = (createdAt: string, soldDate?: string | null) => {
    const startDate = new Date(createdAt);
    const endDate = soldDate ? new Date(soldDate) : new Date();
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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

  const daysOnStock = calculateDaysOnStock(car.createdAt || "", car.soldDate);
  const hasImages = car.images && car.images.length > 0;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/cars")}
              data-testid="button-back-to-cars"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tilbake til biler
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {car.make} {car.model}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                {car.year} • {car.registrationNumber}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(car.status)}>
              {getStatusText(car.status)}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Image Gallery */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative h-96 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
                {hasImages ? (
                  <>
                    <img 
                      src={car.images[currentImageIndex]} 
                      alt={`${car.make} ${car.model}`}
                      className="w-full h-full object-cover"
                      data-testid="car-main-image"
                    />
                    {car.images.length > 1 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                          onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : car.images.length - 1)}
                          data-testid="button-prev-image"
                        >
                          ←
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                          onClick={() => setCurrentImageIndex(prev => prev < car.images.length - 1 ? prev + 1 : 0)}
                          data-testid="button-next-image"
                        >
                          →
                        </Button>
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                          {currentImageIndex + 1} / {car.images.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <CarIcon className="w-24 h-24 text-slate-400 mx-auto mb-4" />
                      <p className="text-lg text-slate-500 dark:text-slate-400">Ingen bilder</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Thumbnail strip */}
              {hasImages && car.images.length > 1 && (
                <div className="flex gap-2 p-4 overflow-x-auto">
                  {car.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-colors ${
                        index === currentImageIndex 
                          ? 'border-blue-500' 
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                      data-testid={`thumbnail-${index}`}
                    >
                      <img 
                        src={image} 
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Car Information */}
          <div className="space-y-6">
            {/* Price and Actions */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">
                      {formatPrice(car.status === 'sold' && car.soldPrice ? car.soldPrice : car.salePrice || "0")}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {car.status === 'sold' ? 'Solgt for' : 'Salgspris'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                      <Clock className="w-4 h-4" />
                      {daysOnStock} dager på lager
                    </div>
                  </div>
                </div>

                {car.status === 'sold' && car.soldDate && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg text-emerald-700 dark:text-emerald-300 text-sm flex items-center mb-4">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Solgt {new Date(car.soldDate).toLocaleDateString('no-NO')}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditingCar(car)}
                    className="flex-1"
                    data-testid="button-edit-car"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Rediger
                  </Button>
                  
                  {car.status === 'available' && (
                    <Button
                      onClick={handleSellCar}
                      disabled={sellMutation.isPending}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      data-testid="button-sell-car"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Marker som solgt
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => deleteMutation.mutate(car.id)}
                    disabled={deleteMutation.isPending}
                    className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                    data-testid="button-delete-car"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Specifications */}
            <Card>
              <CardHeader>
                <CardTitle>Spesifikasjoner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Årsmodell</div>
                      <div className="font-medium">{car.year}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Kilometerstand</div>
                      <div className="font-medium">{car.mileage?.toLocaleString('no-NO')} km</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Drivstoff</div>
                      <div className="font-medium">{car.fuelType || 'Ikke oppgitt'}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Girkasse</div>
                      <div className="font-medium">{car.transmission || 'Ikke oppgitt'}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Reg.nr.</div>
                      <div className="font-medium">{car.registrationNumber}</div>
                    </div>
                  </div>
                  
                  {car.chassisNumber && (
                    <div className="flex items-center gap-2">
                      <CarIcon className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Chassisnummer</div>
                        <div className="font-medium">{car.chassisNumber}</div>
                      </div>
                    </div>
                  )}
                  
                  {car.color && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: car.color.toLowerCase() }}></div>
                      <div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Farge</div>
                        <div className="font-medium">{car.color}</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Description */}
        {car.description && (
          <Card>
            <CardHeader>
              <CardTitle>Beskrivelse</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {car.description}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {editingCar && (
        <EditCarModal 
          car={editingCar} 
          onClose={() => setEditingCar(null)} 
        />
      )}
    </MainLayout>
  );
}