import { storagePromise } from "./storage";

export type UserRole = "EIER" | "SELGER" | "REGNSKAP" | "VERKSTED";

export interface UserMembership {
  id: string;
  userId: string;
  companyId: string;
  role: UserRole;
  createdAt: Date;
}

export class RoleBasedAccessControl {
  /**
   * Get user's role in a specific company
   */
  static async getUserRole(userId: string, companyId: string): Promise<UserRole | null> {
    try {
      const storage = await storagePromise;
      const membership = await storage.getUserMembership(userId, companyId);
      return membership?.role || null;
    } catch (error) {
      console.error("Error getting user role:", error);
      return null;
    }
  }

  /**
   * Check if user has any of the specified roles in a company
   */
  static async hasRole(userId: string, companyId: string, allowedRoles: UserRole[]): Promise<boolean> {
    const userRole = await this.getUserRole(userId, companyId);
    return userRole ? allowedRoles.includes(userRole) : false;
  }

  /**
   * Check if user is a company member
   */
  static async isCompanyMember(userId: string, companyId: string): Promise<boolean> {
    const userRole = await this.getUserRole(userId, companyId);
    return userRole !== null;
  }

  /**
   * Get user's company ID (assumes user has only one company for now)
   */
  static async getUserCompanyId(userId: string): Promise<string | null> {
    try {
      const storage = await storagePromise;
      const membership = await storage.getUserMembership(userId, "default-company");
      return membership?.companyId || "default-company"; // Fallback for existing users
    } catch (error) {
      console.error("Error getting user company ID:", error);
      return "default-company";
    }
  }

  /**
   * Field-level permissions
   */
  static canViewSensitiveFields(userRole: UserRole): boolean {
    return ["EIER", "REGNSKAP"].includes(userRole);
  }

  /**
   * CRUD permissions by role
   */
  static canCreateCars(userRole: UserRole): boolean {
    return ["EIER", "SELGER", "REGNSKAP", "VERKSTED"].includes(userRole);
  }

  static canUpdateCars(userRole: UserRole): boolean {
    return ["EIER", "SELGER", "REGNSKAP", "VERKSTED"].includes(userRole);
  }

  static canDeleteCars(userRole: UserRole): boolean {
    return ["EIER"].includes(userRole);
  }

  static canCreateContracts(userRole: UserRole): boolean {
    return ["EIER", "SELGER", "REGNSKAP"].includes(userRole);
  }

  static canUpdateContracts(userRole: UserRole): boolean {
    return ["EIER", "SELGER", "REGNSKAP"].includes(userRole);
  }

  static canDeleteContracts(userRole: UserRole): boolean {
    return ["EIER"].includes(userRole);
  }

  static canManageCustomers(userRole: UserRole): boolean {
    return ["EIER", "SELGER", "REGNSKAP"].includes(userRole);
  }

  static canDeleteCustomers(userRole: UserRole): boolean {
    return ["EIER"].includes(userRole);
  }

  static canViewFinancialData(userRole: UserRole): boolean {
    return ["EIER", "REGNSKAP"].includes(userRole);
  }

  /**
   * Mask sensitive fields based on user role
   */
  static maskSensitiveCarFields(car: any, userRole: UserRole) {
    if (!this.canViewSensitiveFields(userRole)) {
      return {
        ...car,
        costPrice: null, // Hide cost price from non-authorized roles
        profitMargin: null,
        recondCost: null,
      };
    }
    return car;
  }

  /**
   * Filter data based on company membership
   */
  static filterByCompany<T extends { companyId: string }>(
    data: T[],
    userCompanyId: string
  ): T[] {
    return data.filter(item => item.companyId === userCompanyId);
  }
}

/**
 * Middleware to check role-based permissions
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const companyId = await RoleBasedAccessControl.getUserCompanyId(userId);
      if (!companyId) {
        return res.status(403).json({ message: "No company access" });
      }

      const hasPermission = await RoleBasedAccessControl.hasRole(userId, companyId, allowedRoles);
      if (!hasPermission) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Attach role and company info to request
      req.userRole = await RoleBasedAccessControl.getUserRole(userId, companyId);
      req.companyId = companyId;
      next();
    } catch (error) {
      console.error("Role check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
}

/**
 * Middleware to check company membership
 */
export function requireCompanyMembership() {
  return async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const companyId = await RoleBasedAccessControl.getUserCompanyId(userId);
      if (!companyId) {
        return res.status(403).json({ message: "No company access" });
      }

      const isMember = await RoleBasedAccessControl.isCompanyMember(userId, companyId);
      if (!isMember) {
        return res.status(403).json({ message: "Not a company member" });
      }

      // Attach company info to request
      req.companyId = companyId;
      req.userRole = await RoleBasedAccessControl.getUserRole(userId, companyId);
      next();
    } catch (error) {
      console.error("Company membership check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
}