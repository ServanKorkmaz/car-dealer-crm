// Mock user database for testing
export const MOCK_USERS = [
  // Super Admin
  {
    id: "admin_1",
    email: "admin@forhandlerpro.no",
    password: "ForhandlerPRO2025!",
    role: "super_admin",
    name: "System Administrator",
    companyId: null
  },
  
  // Test Organizations
  {
    id: "user_1", 
    email: "ole@hansenbil.no",
    password: "test123",
    role: "org_admin",
    name: "Ole Hansen",
    companyId: "org_hansen_bil"
  },
  {
    id: "user_2",
    email: "kari@svendsen-auto.no", 
    password: "test123",
    role: "org_admin",
    name: "Kari Svendsen",
    companyId: "org_svendsen_auto"
  }
];

export const MOCK_COMPANIES = [
  {
    id: "org_hansen_bil",
    name: "Hansen Bil AS",
    subscriptionPlan: "light",
    subscriptionStatus: "active",
    maxUsers: 1,
    maxCars: 20,
    monthlyRevenue: 1990,
    createdAt: new Date("2025-01-15")
  },
  {
    id: "org_svendsen_auto", 
    name: "Svendsen Auto AS",
    subscriptionPlan: "pro",
    subscriptionStatus: "active", 
    maxUsers: 5,
    maxCars: 100,
    monthlyRevenue: 3990,
    createdAt: new Date("2024-11-20")
  }
];

export const SUBSCRIPTION_PLANS = {
  light: {
    name: "ForhandlerPRO Light",
    price: 1990,
    priceLabel: "1 990 kr/mnd",
    features: [
      "Opptil 20 biler",
      "Grunnleggende CRM",
      "1 bruker",
      "Epost support"
    ],
    maxUsers: 1,
    maxCars: 20
  },
  pro: {
    name: "ForhandlerPRO Pro",
    price: 3990,
    priceLabel: "3 990 kr/mnd",
    features: [
      "Opptil 100 biler",
      "Avansert CRM",
      "5 brukere",
      "Prioritert support",
      "Integrasjoner"
    ],
    maxUsers: 5,
    maxCars: 100
  },
  enterprise: {
    name: "ForhandlerPRO Enterprise",
    price: 9990,
    priceLabel: "9 990 kr/mnd",
    features: [
      "Ubegrenset antall biler",
      "Full CRM-funksjonalitet",
      "Ubegrenset brukere",
      "Dedikert support",
      "API-tilgang",
      "Egne tilpasninger"
    ],
    maxUsers: -1, // unlimited
    maxCars: -1 // unlimited
  }
};

// Authentication helper functions
export function mockLogin(email: string, password: string) {
  const user = MOCK_USERS.find(u => u.email === email && u.password === password);
  if (user) {
    const company = user.companyId ? MOCK_COMPANIES.find(c => c.id === user.companyId) : null;
    return { user, company };
  }
  return null;
}

export function getUserPermissions(role: string, plan: string) {
  const permissions = {
    canCreateCars: true,
    canEditCars: true,
    canDeleteCars: false,
    canCreateCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: false,
    canCreateContracts: true,
    canEditContracts: true,
    canDeleteContracts: false,
    canViewAnalytics: false,
    canManageUsers: false,
    canManageSubscription: false,
    canViewAllData: false
  };

  // Role-based permissions
  if (role === 'super_admin') {
    return Object.keys(permissions).reduce((acc, key) => ({ ...acc, [key]: true }), {});
  }

  if (role === 'org_admin') {
    permissions.canDeleteCars = true;
    permissions.canDeleteCustomers = true;
    permissions.canDeleteContracts = true;
    permissions.canManageUsers = true;
    permissions.canManageSubscription = true;
    permissions.canViewAllData = true;
  }

  // Plan-based restrictions
  if (plan === 'light') {
    permissions.canViewAnalytics = false;
  } else if (plan === 'pro' || plan === 'enterprise') {
    permissions.canViewAnalytics = true;
  }

  return permissions;
}