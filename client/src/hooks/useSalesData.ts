import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';

export function useSalesData(period: string, customDateRange?: { from: Date | null; to: Date | null }) {
  return useQuery({
    queryKey: ['sales-data', period, customDateRange],
    queryFn: async () => {
      // Hent kontrakter og biler
      const [contractsRes, carsRes] = await Promise.all([
        fetch('/api/contracts'),
        fetch('/api/cars')
      ]);

      if (!contractsRes.ok || !carsRes.ok) {
        throw new Error('Failed to fetch sales data');
      }

      const contracts = await contractsRes.json();
      const cars = await carsRes.json();

      // Kombiner kontrakter og solgte biler til salgsdata
      const soldCars = cars.filter((car: any) => car.status === 'sold' && car.soldDate && car.soldPrice);
      
      // Lag "virtuelle kontrakter" for solgte biler som ikke har eksplisitte kontrakter
      const soldCarContracts = soldCars
        .filter((car: any) => !contracts.some((contract: any) => contract.carId === car.id))
        .map((car: any) => ({
          id: `sold-car-${car.id}`,
          carId: car.id,
          customerId: car.soldToCustomerId || 'unknown',
          salePrice: car.soldPrice,
          saleDate: car.soldDate,
          status: 'completed',
          contractNumber: `AUTO-${car.id.slice(0, 8)}`,
          isSoldCar: true // marker for å skille fra eksplisitte kontrakter
        }));

      const allSalesData = [...contracts, ...soldCarContracts];

      return {
        contracts: allSalesData,
        cars
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}