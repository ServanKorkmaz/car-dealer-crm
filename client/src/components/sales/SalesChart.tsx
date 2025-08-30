import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart } from 'recharts';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { Contract, Car as CarType } from '@shared/schema';

interface SalesChartProps {
  data: {
    contracts: Contract[];
    cars: CarType[];
  } | null;
  period: string;
}

export default function SalesChart({ data, period }: SalesChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];

    // Filtrer ut signerte/fullførte kontrakter samt solgte biler
    const signedContracts = data.contracts.filter((contract: any) => 
      contract.status === 'signed' || contract.status === 'completed' || contract.isSoldCar
    );

    // Grupper salg per måned
    const salesByMonth = signedContracts.reduce((acc: any, contract) => {
      const monthKey = format(new Date(contract.saleDate), 'yyyy-MM');
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          displayMonth: format(new Date(contract.saleDate), 'MMM yyyy', { locale: nb }),
          count: 0,
          revenue: 0,
          profit: 0
        };
      }
      
      const car = data.cars.find(c => c.id === contract.carId);
      const salePrice = parseFloat(contract.salePrice);
      const costPrice = car?.costPrice ? parseFloat(car.costPrice) : 0;
      
      acc[monthKey].count += 1;
      acc[monthKey].revenue += salePrice;
      acc[monthKey].profit += (salePrice - costPrice);
      
      return acc;
    }, {});

    return Object.values(salesByMonth)
      .sort((a: any, b: any) => a.month.localeCompare(b.month))
      .slice(-12); // Vis siste 12 måneder
  }, [data]);

  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'Antall biler') return value.toString();
    return new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salgsutvikling</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData}>
            <CartesianGrid 
              strokeDasharray="1 1" 
              className="stroke-border opacity-30"
            />
            <XAxis 
              dataKey="displayMonth" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              yAxisId="left"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              formatter={formatTooltipValue}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Bar 
              yAxisId="left"
              dataKey="count" 
              name="Antall biler" 
              fill="hsl(var(--primary))"
              radius={[8, 8, 0, 0]}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="revenue" 
              name="Omsetning" 
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}