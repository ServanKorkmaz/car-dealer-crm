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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Siste biler</CardTitle>
          <Link href="/cars">
            <Button variant="ghost" size="sm" className="text-xs text-slate-500 hover:text-slate-700">
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
          <div className="space-y-2">
            {recentCars.map((car: CarType) => (
              <div key={car.id} className="flex items-center space-x-3 py-3 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
                {/* Car image placeholder */}
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center flex-shrink-0">
                  {car.images && car.images.length > 0 ? (
                    <img
                      src={car.images[0]}
                      alt={`${car.make} ${car.model}`}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <Car className="text-slate-400 w-5 h-5" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {car.make} {car.model} {car.year}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>{car.registrationNumber}</span>
                    <span>·</span>
                    <span>{car.mileage.toLocaleString('no-NO')} km</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {formatPrice(car.salePrice)}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    +{car.profitMargin}% fortjeneste
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
