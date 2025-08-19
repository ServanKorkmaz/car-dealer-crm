import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type { PlanFeatures } from '@shared/auth-types';

export function useFeatures() {
  const { currentOrg } = useAuth();

  const { data: features, isLoading } = useQuery({
    queryKey: [`/api/auth/features/${currentOrg?.id}`],
    enabled: !!currentOrg,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const hasFeature = (feature: keyof PlanFeatures): boolean => {
    if (!features) return false;
    
    const value = features[feature];
    
    // For numeric limits, check if we have any capacity
    if (typeof value === 'number') {
      return value === -1 || value > 0; // -1 means unlimited
    }
    
    // For boolean features
    return !!value;
  };

  const getLimit = (feature: keyof PlanFeatures): number | null => {
    if (!features) return null;
    
    const value = features[feature];
    
    if (typeof value === 'number') {
      return value === -1 ? null : value; // null means unlimited
    }
    
    return null;
  };

  const isFeatureEnabled = (feature: keyof PlanFeatures): boolean => {
    return hasFeature(feature);
  };

  return {
    features: features as PlanFeatures | undefined,
    isLoading,
    hasFeature,
    getLimit,
    isFeatureEnabled,
  };
}