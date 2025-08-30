import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import { useSalesData } from '@/hooks/useSalesData';
import SalesMetrics from '@/components/sales/SalesMetrics';
import SalesChart from '@/components/sales/SalesChart';
import TopSellingModels from '@/components/sales/TopSellingModels';
import PeriodFilter from '@/components/sales/PeriodFilter';
import MainLayout from "@/components/layout/MainLayout";
import type { Contract, Car as CarType } from '@shared/schema';

export default function ProfessionalDashboard() {
  const [period, setPeriod] = useState<'current_month' | 'last_month' | 'last_12_months' | 'year_to_date' | 'custom'>('current_month');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  
  const { data, isLoading, error, refetch } = useSalesData(period, customDateRange);

  const metrics = useMemo(() => {
    if (!data) return null;
    
    // Filtrer ut signerte/fullførte kontrakter samt solgte biler
    const allSoldContracts = data.contracts.filter((contract: any) => 
      contract.status === 'signed' || contract.status === 'completed' || contract.isSoldCar
    );

    const currentPeriodSales = allSoldContracts.filter((contract: any) => {
      const saleDate = new Date(contract.saleDate);
      const now = new Date();
      
      switch(period) {
        case 'current_month':
          return saleDate >= startOfMonth(now) && saleDate <= endOfMonth(now);
        case 'last_month':
          const lastMonth = subMonths(now, 1);
          return saleDate >= startOfMonth(lastMonth) && saleDate <= endOfMonth(lastMonth);
        case 'last_12_months':
          return saleDate >= subMonths(now, 12);
        case 'year_to_date':
          return saleDate >= startOfYear(now);
        case 'custom':
          return customDateRange.from && customDateRange.to && 
                 saleDate >= customDateRange.from && saleDate <= customDateRange.to;
        default:
          return true;
      }
    });

    const totalRevenue = currentPeriodSales.reduce((sum: number, contract: any) => sum + parseFloat(contract.salePrice), 0);
    const totalProfit = currentPeriodSales.reduce((sum: number, contract: any) => {
      const car = data.cars.find((c: CarType) => c.id === contract.carId);
      const costPrice = car?.costPrice ? parseFloat(car.costPrice) : 0;
      return sum + (parseFloat(contract.salePrice) - costPrice);
    }, 0);
    const avgSalePrice = currentPeriodSales.length > 0 ? totalRevenue / currentPeriodSales.length : 0;
    const avgProfitPerCar = currentPeriodSales.length > 0 ? totalProfit / currentPeriodSales.length : 0;

    // Sammenlign med forrige periode
    const previousPeriodSales = allSoldContracts.filter((contract: any) => {
      const saleDate = new Date(contract.saleDate);
      const now = new Date();
      
      switch(period) {
        case 'current_month':
          const prevMonth = subMonths(now, 1);
          return saleDate >= startOfMonth(prevMonth) && saleDate <= endOfMonth(prevMonth);
        case 'last_month':
          const twoMonthsAgo = subMonths(now, 2);
          return saleDate >= startOfMonth(twoMonthsAgo) && saleDate <= endOfMonth(twoMonthsAgo);
        default:
          return false;
      }
    });

    const prevRevenue = previousPeriodSales.reduce((sum: number, contract: any) => sum + parseFloat(contract.salePrice), 0);
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    return {
      carsSoldThisPeriod: currentPeriodSales.length,
      totalCarsSold: allSoldContracts.length,
      totalRevenue,
      avgSalePrice,
      avgProfitPerCar,
      totalProfit,
      revenueGrowth,
      previousPeriodCount: previousPeriodSales.length
    };
  }, [data, period, customDateRange]);

  const exportData = () => {
    if (!data) return;
    
    // Konverter til CSV
    const csvData = data.contracts
      .filter((contract: any) => contract.status === 'signed' || contract.status === 'completed' || contract.isSoldCar)
      .map((contract: any) => {
        const car = data.cars.find((c: CarType) => c.id === contract.carId);
        return {
          'Kontraktnummer': contract.contractNumber,
          'Salgsdato': format(new Date(contract.saleDate), 'dd.MM.yyyy'),
          'Bilmerke': car?.make || 'Ukjent',
          'Modell': car?.model || 'Ukjent',
          'År': car?.year || '',
          'Salgspris': parseFloat(contract.salePrice),
          'Status': contract.status
        };
      });
    
    const csvContent = convertToCSV(csvData);
    downloadCSV(csvContent, `salgsrapport_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' ? `"${val}"` : val
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (error) {
    return (
      <MainLayout>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-destructive">Kunne ikke laste salgsdata. Vennligst prøv igjen senere.</p>
            <Button onClick={() => refetch()} className="mt-4">Prøv igjen</Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Salg & Omsetning</h1>
            <p className="text-muted-foreground mt-1">Oversikt over salgsytelse og nøkkeltall</p>
          </div>
          <div className="flex gap-2">
            <PeriodFilter 
              period={period} 
              onPeriodChange={setPeriod}
              customDateRange={customDateRange}
              onCustomDateChange={setCustomDateRange}
            />
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Eksporter
            </Button>
          </div>
        </div>

        {/* Hovedmetrikker */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : metrics && (
          <SalesMetrics metrics={metrics} />
        )}

        {/* Tabs for detaljert visning */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview">Oversikt</TabsTrigger>
            <TabsTrigger value="trends">Trender</TabsTrigger>
            <TabsTrigger value="performance">Ytelse</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <SalesChart data={data || null} period={period} />
              </div>
              <div>
                <TopSellingModels data={data || null} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>Salgstrender</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Avanserte trendanalyser kommer snart
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Selgerytelse</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Selgerstatistikk kommer snart
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}