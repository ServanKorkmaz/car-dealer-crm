import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Car, DollarSign, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricsProps {
  metrics: {
    carsSoldThisPeriod: number;
    totalCarsSold: number;
    totalRevenue: number;
    avgSalePrice: number;
    avgProfitPerCar: number;
    totalProfit: number;
    revenueGrowth: number;
    previousPeriodCount: number;
  };
}

export default function SalesMetrics({ metrics }: MetricsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const metricCards = [
    {
      title: 'Biler solgt denne perioden',
      value: metrics.carsSoldThisPeriod,
      icon: Car,
      change: metrics.previousPeriodCount ? 
        ((metrics.carsSoldThisPeriod - metrics.previousPeriodCount) / metrics.previousPeriodCount) * 100 : 0,
      format: (v: number) => v.toString(),
      color: 'blue'
    },
    {
      title: 'Total omsetning',
      value: metrics.totalRevenue,
      icon: DollarSign,
      change: metrics.revenueGrowth,
      format: formatCurrency,
      color: 'green'
    },
    {
      title: 'Gjennomsnittlig salgspris',
      value: metrics.avgSalePrice,
      icon: Target,
      format: formatCurrency,
      color: 'purple'
    },
    {
      title: 'Fortjeneste per bil',
      value: metrics.avgProfitPerCar,
      icon: TrendingUp,
      format: formatCurrency,
      color: 'orange'
    },
    {
      title: 'Totalt solgte biler',
      value: metrics.totalCarsSold,
      icon: Car,
      format: (v: number) => v.toString(),
      color: 'gray',
      isAllTime: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {metricCards.map((metric, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "p-2 rounded-lg",
                metric.color === 'blue' && "bg-blue-100 dark:bg-blue-900/20",
                metric.color === 'green' && "bg-green-100 dark:bg-green-900/20",
                metric.color === 'purple' && "bg-purple-100 dark:bg-purple-900/20",
                metric.color === 'orange' && "bg-orange-100 dark:bg-orange-900/20",
                metric.color === 'gray' && "bg-gray-100 dark:bg-gray-900/20"
              )}>
                <metric.icon className={cn(
                  "h-5 w-5",
                  metric.color === 'blue' && "text-blue-600 dark:text-blue-400",
                  metric.color === 'green' && "text-green-600 dark:text-green-400",
                  metric.color === 'purple' && "text-purple-600 dark:text-purple-400",
                  metric.color === 'orange' && "text-orange-600 dark:text-orange-400",
                  metric.color === 'gray' && "text-gray-600 dark:text-gray-400"
                )} />
              </div>
              {metric.change !== undefined && !metric.isAllTime && (
                <div className={cn(
                  "flex items-center text-sm font-medium",
                  metric.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {metric.change >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {formatPercentage(metric.change)}
                </div>
              )}
              {metric.isAllTime && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">All time</span>
              )}
            </div>
            <div>
              <p className="text-2xl font-bold">
                {metric.format(metric.value)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{metric.title}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}