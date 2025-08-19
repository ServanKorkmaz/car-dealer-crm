import { useQuery } from "@tanstack/react-query";

export interface UserRole {
  role: "EIER" | "SELGER" | "REGNSKAP" | "VERKSTED";
  companyId: string;
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
  return userRole?.canViewSensitive ?? false;
}

export function useCanDelete() {
  const { data: userRole } = useUserRole();
  return userRole?.canDelete ?? false;
}

export function useCanInvite() {
  const { data: userRole } = useUserRole();
  return userRole?.canInvite ?? false;
}