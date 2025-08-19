import React from 'react';
import { useRoute } from 'wouter';
import { CustomerProfile } from '@/components/customers/CustomerProfile';

export function CustomerProfilePage() {
  const [match, params] = useRoute<{ id: string }>('/customers/:id/profile');

  if (!match || !params?.id) {
    return <div>Customer not found</div>;
  }

  return <CustomerProfile customerId={params.id} />;
}