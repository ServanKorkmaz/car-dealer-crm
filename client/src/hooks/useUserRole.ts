import { useQuery } from '@tanstack/react-query';

interface UserRole {
  role: string;
  canViewSensitive: boolean;
  canDelete: boolean;
  canInvite: boolean;
}

export function useUserRole() {
  return useQuery<UserRole>({
    queryKey: ['/api/user/role'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useCanViewSensitive() {
  const { data: userRole } = useUserRole();
  return userRole?.canViewSensitive ?? true; // Single tenant - always true
}

export function useCanDelete() {
  const { data: userRole } = useUserRole();
  return userRole?.canDelete ?? true; // Single tenant - always true
}

export function useCanInvite() {
  const { data: userRole } = useUserRole();
  return userRole?.canInvite ?? false; // Single tenant - invites disabled
}