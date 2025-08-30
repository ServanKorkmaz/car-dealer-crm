import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';
import type { Contract, Car as CarType } from '@shared/schema';

interface TopSellingModelsProps {
  data: {
    contracts: Contract[];
    cars: CarType[];
  } | null;
}

export default function TopSellingModels({ data }: TopSellingModelsProps) {
  const topModels = useMemo(() => {
    if (!data) return [];

    // Filtrer ut signerte/fullførte kontrakter samt solgte biler
    const signedContracts = data.contracts.filter((contract: any) => 
      contract.status === 'signed' || contract.status === 'completed' || contract.isSoldCar
    );

    const modelCounts = signedContracts.reduce((acc: any, contract) => {
      const car = data.cars.find(c => c.id === contract.carId);
      if (car) {
        const key = `${car.make} ${car.model}`;
        if (!acc[key]) {
          acc[key] = { model: key, count: 0, revenue: 0 };
        }
        acc[key].count += 1;
        acc[key].revenue += parseFloat(contract.salePrice);
      }
      return acc;
    }, {});

    return Object.values(modelCounts)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);
  }, [data]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Topp 5 Bestselgere
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topModels.map((item: any, index) => (
            <div key={item.model} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
                  index === 1 ? 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400' :
                  index === 2 ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' :
                  'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium">{item.model}</p>
                  <p className="text-sm text-muted-foreground">{item.count} solgt • {formatCurrency(item.revenue)}</p>
                </div>
              </div>
              {index === 0 && (
                <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400">
                  Bestselger
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}