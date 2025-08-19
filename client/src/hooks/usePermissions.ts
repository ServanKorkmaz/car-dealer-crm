import { useAuth } from '@/contexts/AuthContext';
import { ROLE_PERMISSIONS, type OrgRole } from '@shared/auth-types';

type Resource = keyof typeof ROLE_PERMISSIONS.owner;
type Action = 'create' | 'read' | 'update' | 'delete';

export function usePermissions() {
  const { userRole } = useAuth();

  const can = (action: Action, resource: Resource): boolean => {
    if (!userRole) return false;
    
    const permissions = ROLE_PERMISSIONS[userRole];
    if (!permissions) return false;
    
    const resourcePermissions = permissions[resource];
    if (!resourcePermissions) return false;
    
    return resourcePermissions.includes(action);
  };

  const canAny = (actions: Action[], resource: Resource): boolean => {
    return actions.some(action => can(action, resource));
  };

  const canAll = (actions: Action[], resource: Resource): boolean => {
    return actions.every(action => can(action, resource));
  };

  const hasRole = (roles: OrgRole[]): boolean => {
    if (!userRole) return false;
    return roles.includes(userRole);
  };

  const isOwner = (): boolean => userRole === 'owner';
  const isAdmin = (): boolean => userRole === 'admin';
  const isOwnerOrAdmin = (): boolean => hasRole(['owner', 'admin']);

  return {
    can,
    canAny,
    canAll,
    hasRole,
    isOwner,
    isAdmin,
    isOwnerOrAdmin,
    userRole,
  };
}