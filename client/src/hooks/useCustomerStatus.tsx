import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Activity, Customer } from '@shared/schema';

export type CustomerStatus = 'HOT' | 'WARM' | 'COLD';

interface CustomerWithStatus extends Customer {
  status: CustomerStatus;
  lastContactDate?: string;
  daysSinceContact: number;
}

export function useCustomerStatus() {
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
  });

  const customersWithStatus = useMemo(() => {
    return customers.map(customer => {
      // Find the most recent activity for this customer
      const customerActivities = activities.filter(activity => 
        activity.entityId === customer.id || 
        activity.message?.includes(customer.name)
      );

      const lastActivity = customerActivities.sort((a, b) => 
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      )[0];

      const lastContactDate = lastActivity?.createdAt;
      const daysSinceContact = lastContactDate 
        ? Math.floor((new Date().getTime() - new Date(lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999; // Very high number if no contact

      let status: CustomerStatus;
      if (daysSinceContact <= 7) {
        status = 'HOT';
      } else if (daysSinceContact <= 30) {
        status = 'WARM';
      } else {
        status = 'COLD';
      }

      return {
        ...customer,
        status,
        lastContactDate,
        daysSinceContact
      } as CustomerWithStatus;
    });
  }, [customers, activities]);

  return { customersWithStatus };
}

export function getStatusColor(status: CustomerStatus) {
  switch (status) {
    case 'HOT':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'WARM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'COLD':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getStatusLabel(status: CustomerStatus) {
  switch (status) {
    case 'HOT': return 'Varm';
    case 'WARM': return 'Lunken';
    case 'COLD': return 'Kald';
    default: return 'Ukjent';
  }
}