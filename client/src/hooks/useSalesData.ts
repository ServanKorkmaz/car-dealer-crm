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

      return {
        contracts,
        cars
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}