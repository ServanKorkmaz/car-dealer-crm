import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, Edit, Trash2 } from "lucide-react";
import { Link } from "wouter";
import type { Car as CarType } from "@shared/schema";

export default function RecentCars() {
  const { data: cars = [], isLoading } = useQuery({
    queryKey: ["/api/cars"],
  });

  const recentCars = cars.slice(0, 5);

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Siste biler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 py-4 animate-pulse">
              <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Siste biler</CardTitle>
          <Link href="/cars">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary-600">
              Se alle
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {recentCars.length === 0 ? (
          <div className="text-center py-8">
            <Car className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Ingen biler lagt til ennå</p>
            <Link href="/cars">
              <Button variant="outline" size="sm" className="mt-2">
                Legg til din første bil
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recentCars.map((car: CarType) => (
              <div key={car.id} className="flex items-center space-x-4 py-4 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
                {/* Car image placeholder */}
                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  {car.images && car.images.length > 0 ? (
                    <img
                      src={car.images[0]}
                      alt={`${car.make} ${car.model}`}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  ) : (
                    <Car className="text-slate-400 w-6 h-6" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {car.make} {car.model} {car.year}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {car.registrationNumber}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {car.mileage.toLocaleString('no-NO')} km
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {formatPrice(car.salePrice)}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    +{car.profitMargin}% fortjeneste
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
