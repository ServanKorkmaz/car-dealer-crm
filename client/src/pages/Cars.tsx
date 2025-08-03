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
import AddCarModal from "@/components/cars/AddCarModal";
import EditCarModal from "@/components/cars/EditCarModal";
import { Plus, Search, Edit, Trash2, CheckCircle, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Car } from "@shared/schema";

export default function Cars() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
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

  const { data: cars = [], isLoading: carsLoading } = useQuery<Car[]>({
    queryKey: ["/api/cars"],
    enabled: isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: async (carId: string) => {
      await apiRequest("DELETE", `/api/cars/${carId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900" />;
  }

  const filteredCars = cars.filter((car: Car) =>
    car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
    car.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    car.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-primary hover:bg-primary-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Legg til bil
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Søk etter biler..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
          <div className="space-y-4">
            {filteredCars.map((car: Car) => {
              const daysOnStock = calculateDaysOnStock(car.createdAt || "", car.soldDate);
              const isSold = car.status === "sold";
              
              return (
                <Card 
                  key={car.id} 
                  className={`transition-all hover:shadow-md ${
                    isSold ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 
                    'bg-slate-800 dark:bg-slate-900 border-slate-700'
                  }`}
                  data-testid={`card-car-${car.id}`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl text-white font-bold">
                          {car.make} {car.model}
                        </CardTitle>
                        <p className="text-slate-400 mt-1">
                          {car.registrationNumber} • {car.year}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Badge 
                          variant={isSold ? "default" : "secondary"}
                          className={
                            isSold ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                          }
                        >
                          {isSold ? "Solgt" : "Tilgjengelig"}
                        </Badge>
                        <div className="flex items-center text-sm text-slate-400">
                          <Clock className="w-3 h-3 mr-1" />
                          {daysOnStock} dag{daysOnStock !== 1 ? 'er' : ''} {isSold ? 'på lager' : 'ute'}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Kilometerstand:</span>
                        <p className="font-medium text-white">{car.mileage?.toLocaleString('no-NO') || 'Ukjent'} km</p>
                      </div>
                      <div>
                        <span className="text-slate-400">
                          {isSold ? 'Solgt for:' : 'Salgspris:'}
                        </span>
                        <p className="font-medium text-white">
                          {isSold && car.soldPrice ? 
                            formatPrice(car.soldPrice) :
                            formatPrice(car.salePrice || "")}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Fortjeneste:</span>
                        <p className="font-medium text-green-400">
                          {car.profitMargin || 0}%
                        </p>
                      </div>
                    </div>
                    
                    {isSold && car.soldDate && (
                      <div className="text-sm text-green-600 dark:text-green-400 flex items-center bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Solgt {new Date(car.soldDate).toLocaleDateString('no-NO')}
                      </div>
                    )}

                    <div className="flex items-center space-x-3 pt-2">
                      {!isSold && (
                        <Button
                          onClick={() => handleSellCar(car)}
                          disabled={sellMutation.isPending}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          data-testid={`button-sell-${car.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marker som solgt
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        onClick={() => setEditingCar(car)}
                        className={`${!isSold ? '' : 'flex-1'} border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white`}
                        data-testid={`button-edit-${car.id}`}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Rediger  
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => deleteMutation.mutate(car.id)}
                        disabled={deleteMutation.isPending}
                        className="border-red-600 text-red-400 hover:bg-red-900/20"
                        data-testid={`button-delete-${car.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
    </MainLayout>
  );
}
