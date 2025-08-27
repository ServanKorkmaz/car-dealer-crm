import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  uuid,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Companies (Organizations) table
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  phone: varchar("phone"),
  email: varchar("email"),
  subscriptionPlan: varchar("subscription_plan").notNull().default("light"), // light, pro, enterprise
  subscriptionStatus: varchar("subscription_status").notNull().default("trial"), // trial, active, suspended, cancelled
  trialEndsAt: timestamp("trial_ends_at"),
  maxUsers: integer("max_users").notNull().default(1),
  maxCars: integer("max_cars").notNull().default(20),
  monthlyRevenue: integer("monthly_revenue").notNull().default(1990),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"), // super_admin, org_admin, user
  passwordHash: varchar("password_hash"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-Company Memberships
export const memberships = pgTable("memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  role: varchar("role").notNull().default("user"), // admin, sales, workshop, accountant, viewer
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Multi-tenant support tables
export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey(), // Auth user ID
  fullName: text("full_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// SVV Cache table
export const svvCache = pgTable("svv_cache", {
  regnr: varchar("regnr").primaryKey(),
  payload: jsonb("payload").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cars table
export const cars = pgTable("cars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  registrationNumber: varchar("registration_number").notNull().unique(),
  make: varchar("make").notNull(),
  model: varchar("model").notNull(),
  variant: varchar("variant"),
  year: integer("year").notNull(),
  mileage: integer("mileage").notNull(),
  vin: varchar("vin"),
  powerKw: integer("power_kw"),
  gearbox: varchar("gearbox"),
  bodyType: varchar("body_type"),
  seats: integer("seats"),
  weight: integer("weight"),
  nextEu: varchar("next_eu"),
  lastEu: varchar("last_eu"),
  color: varchar("color").default(""),
  fuelType: varchar("fuel_type").default(""),
  transmission: varchar("transmission").default(""),
  power: varchar("power").default(""), // e.g. "120 kW" 
  co2Emissions: integer("co2_emissions"), // g/km
  lastEuControl: timestamp("last_eu_control"),
  nextEuControl: timestamp("next_eu_control"),
  vehicleClass: varchar("vehicle_class"),
  costPrice: varchar("cost_price").notNull().default("0"), // Changed to varchar to handle strings
  salePrice: varchar("sale_price").default("0"),
  recondCost: varchar("recond_cost").default("0"), // Reconditioning cost
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }), // calculated field
  notes: text("notes"), // renamed from description for consistency
  images: text("images").array(), // array of image URLs
  status: varchar("status").default("available"), // available, sold, reserved
  euControl: boolean("eu_control").default(false), // EU control status
  finnUrl: varchar("finn_url"), // Finn.no listing URL
  soldDate: timestamp("sold_date"),
  soldPrice: varchar("sold_price"),
  soldToCustomerId: varchar("sold_to_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: varchar("user_id").notNull().references(() => users.id),
});

// Customers table
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  organizationNumber: varchar("organization_number"), // for companies
  address: text("address"),
  type: varchar("type").default("PRIVAT").$type<'PRIVAT' | 'BEDRIFT'>(), // PRIVAT, BEDRIFT
  gdprConsent: boolean("gdpr_consent").default(false),
  gdprConsentAt: timestamp("gdpr_consent_at", { withTimezone: true }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: varchar("user_id").notNull().references(() => users.id),
});

// Contracts table
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  contractNumber: varchar("contract_number").notNull().unique(),
  carId: varchar("car_id").notNull().references(() => cars.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  salePrice: decimal("sale_price", { precision: 15, scale: 2 }).notNull(),
  saleDate: timestamp("sale_date").notNull(),
  status: varchar("status").default("draft"), // draft, pending_signature, signed, completed, rejected
  pdfUrl: varchar("pdf_url"), // stored PDF file URL
  notes: text("notes"),
  
  // Template and enhanced fields
  contractTemplate: varchar("contract_template").notNull().default("privatsalg"), // privatsalg, innbytte, kommisjon, mva_pliktig
  
  // Trade-in fields
  tradeInCarId: varchar("trade_in_car_id").references(() => cars.id),
  tradeInValuation: varchar("trade_in_valuation"),
  tradeInReconCost: varchar("trade_in_recon_cost"),
  tradeInNet: varchar("trade_in_net"),
  tradeInOwedToCustomer: varchar("trade_in_owed_to_customer"),
  
  // Add-ons stored as JSON array
  addOns: jsonb("add_ons").$type<Array<{
    id: string;
    description: string;
    cost: string;
    price: string;
    quantity: number;
  }>>().default([]),
  
  // E-signing fields - enhanced
  eSignStatus: varchar("e_sign_status").notNull().default("ikke_sendt"), // ikke_sendt, sendt, signert
  eSignSentAt: timestamp("e_sign_sent_at"),
  signingProvider: varchar("signing_provider"), // verified.no, scrive, signant
  signingDocumentId: varchar("signing_document_id"), // provider's document ID
  signingUrl: varchar("signing_url"), // link for customer to sign
  signingStatus: varchar("signing_status").default("not_sent"), // not_sent, pending, signed, rejected, expired
  signedAt: timestamp("signed_at"),
  signerName: varchar("signer_name"),
  signerEmail: varchar("signer_email"),
  signerPhone: varchar("signer_phone"),
  signingMethod: varchar("signing_method").default("bankid"), // bankid, nemid, sms
  webhookStatus: varchar("webhook_status"), // received, processed, error
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: varchar("user_id").notNull().references(() => users.id),
});

// Activity Log table for tracking system activities (legacy)
export const activityLog = pgTable("activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type").notNull(), // car_created, car_updated, car_sold, customer_created, customer_updated, contract_created, contract_signed, user_login
  message: text("message").notNull(), // human-readable description
  entityId: varchar("entity_id"), // ID of the related entity (car, customer, contract)
  entityType: varchar("entity_type"), // cars, customers, contracts
  userId: varchar("user_id").notNull().references(() => users.id),
  metadata: jsonb("metadata"), // additional data like old/new values, prices, etc.
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_activity_log_user_id").on(table.userId),
  index("idx_activity_log_entity").on(table.entityId, table.entityType),
]);

// Removed invites table - no longer needed without multi-tenant

// Enhanced Activities table for smart alerts and notifications
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: varchar("user_id"),
  type: varchar("type").notNull(), // IMPORT, CAR_UPDATE, CONTRACT_CREATED, CONTRACT_SIGNED, SALE, PRICE_CHANGE, FOLLOW_UP, ALERT
  entityId: varchar("entity_id"), // ID of the related entity (car, customer, contract)
  message: text("message").notNull(), // human-readable description
  priority: varchar("priority").notNull().default("normal"), // 'low' | 'normal' | 'high'
  resolved: boolean("resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_activities_user_type").on(table.userId, table.type),
  index("idx_activities_priority").on(table.priority, table.resolved),
]);

// User Saved Views table for storing user filter preferences
export const userSavedViews = pgTable("user_saved_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  page: varchar("page").notNull(), // 'cars' or 'customers'
  name: varchar("name").notNull(),
  payload: jsonb("payload").notNull(), // Contains all filter state
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_saved_views_user_page").on(table.userId, table.page),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  cars: many(cars),
  customers: many(customers),
  contracts: many(contracts),
  activityLogs: many(activityLog),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

export const carsRelations = relations(cars, ({ one, many }) => ({
  user: one(users, {
    fields: [cars.userId],
    references: [users.id],
  }),
  contracts: many(contracts),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, {
    fields: [customers.userId],
    references: [users.id],
  }),
  contracts: many(contracts),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  user: one(users, {
    fields: [contracts.userId],
    references: [users.id],
  }),
  car: one(cars, {
    fields: [contracts.carId],
    references: [cars.id],
  }),
  customer: one(customers, {
    fields: [contracts.customerId],
    references: [customers.id],
  }),
}));

// Zod schemas
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

export const insertMembershipSchema = createInsertSchema(memberships).omit({
  id: true,
  joinedAt: true,
});

export const insertCarSchema = createInsertSchema(cars).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  profitMargin: true,
  companyId: true,
}).extend({
  // Allow more flexible data types for imports and updates
  power: z.union([z.string(), z.number()]).transform(val => val?.toString() || ""),
  lastEuControl: z.union([z.string(), z.date(), z.null()]).optional().transform(val => {
    if (!val || val === null) return null;
    if (typeof val === 'string') return new Date(val);
    return val;
  }),
  nextEuControl: z.union([z.string(), z.date(), z.null()]).optional().transform(val => {
    if (!val || val === null) return null;
    if (typeof val === 'string') return new Date(val);
    return val;
  }),
  co2Emissions: z.union([z.number(), z.string(), z.null()]).optional().transform(val => {
    if (!val || val === null) return null;
    return typeof val === 'string' ? parseInt(val) || null : val;
  }),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  // Make optional fields truly optional
  pdfUrl: true,
  signingProvider: true,
  signingDocumentId: true,
  signingUrl: true,
  signedAt: true,
  signerName: true,
  signerEmail: true,
  signerPhone: true,
  signingMethod: true,
  webhookStatus: true,
}).extend({
  // Override field types to match frontend data
  salePrice: z.union([z.string(), z.number()]).transform(val => val.toString()),
  saleDate: z.union([z.string(), z.date()]).transform(val => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }),
  // Add-ons array validation
  addOns: z.array(z.object({
    id: z.string(),
    description: z.string(),
    cost: z.string(),
    price: z.string(),
    quantity: z.number().min(1).default(1),
  })).default([]),
  // Contract template validation
  contractTemplate: z.enum(["privatsalg", "innbytte", "kommisjon", "mva_pliktig"]).default("privatsalg"),
  // E-sign status validation  
  eSignStatus: z.enum(["ikke_sendt", "sendt", "signert"]).default("ikke_sendt"),
});

// Types
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type InsertMembership = z.infer<typeof insertMembershipSchema>;

// Activity Log types
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;
export type InsertCar = z.infer<typeof insertCarSchema>;
export type Car = typeof cars.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

// Saved Views schemas
export const insertSavedViewSchema = createInsertSchema(userSavedViews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

// Activity types enum
export const ActivityType = {
  IMPORT: "IMPORT",
  CAR_UPDATE: "CAR_UPDATE", 
  CONTRACT_CREATED: "CONTRACT_CREATED",
  CONTRACT_SIGNED: "CONTRACT_SIGNED",
  SALE: "SALE",
  PRICE_CHANGE: "PRICE_CHANGE",
  FOLLOW_UP: "FOLLOW_UP",
  ALERT: "ALERT",
} as const;

export type ActivityTypeValue = typeof ActivityType[keyof typeof ActivityType];

// Activity priority enum
export const ActivityPriority = {
  LOW: "low",
  NORMAL: "normal", 
  HIGH: "high",
} as const;

export type ActivityPriorityValue = typeof ActivityPriority[keyof typeof ActivityPriority];

export type UserSavedView = typeof userSavedViews.$inferSelect;
export type InsertSavedView = z.infer<typeof insertSavedViewSchema>;

// Activities types
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

// Market comparables table
export const marketComps = pgTable("market_comps", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  regnr: text("regnr"),
  brand: text("brand"),
  model: text("model"),
  year: integer("year"),
  variant: text("variant"),
  fuel: text("fuel"),
  gearbox: text("gearbox"),
  km: integer("km"),
  price: numeric("price"),
  location: text("location"),
  listedAt: timestamp("listed_at", { withTimezone: true }).defaultNow(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertMarketCompSchema = createInsertSchema(marketComps).omit({ 
  id: true, 
  createdAt: true,
  fetchedAt: true 
});
export type MarketComp = typeof marketComps.$inferSelect;
export type InsertMarketComp = z.infer<typeof insertMarketCompSchema>;

// Pricing rules table
export const pricingRules = pgTable("pricing_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetGrossPct: numeric("target_gross_pct").notNull().default("0.12"),
  minGrossPct: numeric("min_gross_pct").notNull().default("0.05"),
  agingDays1: integer("aging_days_1").notNull().default(30),
  agingDisc1: numeric("aging_disc_1").notNull().default("0.02"),
  agingDays2: integer("aging_days_2").notNull().default(45),
  agingDisc2: numeric("aging_disc_2").notNull().default("0.03"),
  agingDays3: integer("aging_days_3").notNull().default(60),
  agingDisc3: numeric("aging_disc_3").notNull().default("0.05"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertPricingRulesSchema = createInsertSchema(pricingRules).omit({ 
  createdAt: true 
});
export type PricingRules = typeof pricingRules.$inferSelect;
export type InsertPricingRules = z.infer<typeof insertPricingRulesSchema>;



// Follow-ups table for customer follow-ups and reminders
export const followups = pgTable("followups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dueDate: varchar("due_date").notNull(), // Using varchar for date to match existing pattern
  note: text("note"),
  status: varchar("status").notNull().default("OPEN").$type<'OPEN' | 'DONE' | 'SKIPPED'>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Insert and Select Types for Follow-ups
export const insertFollowupSchema = createInsertSchema(followups).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertFollowup = z.infer<typeof insertFollowupSchema>;
export type Followup = typeof followups.$inferSelect;

// Authentication tables
export const refreshTokens = pgTable('refresh_tokens', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  token: text('token').notNull().unique(),
  userId: varchar('user_id').notNull().references(() => users.id),
  tokenFamily: text('token_family').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  revoked: boolean('revoked').default(false),
  revokedAt: timestamp('revoked_at'),
});

export const loginAudits = pgTable('login_audits', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent').notNull(),
  success: boolean('success').notNull(),
  failureReason: text('failure_reason'),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  token: text('token').notNull().unique(),
  userId: varchar('user_id').notNull().references(() => users.id),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  used: boolean('used').default(false),
  usedAt: timestamp('used_at'),
});
