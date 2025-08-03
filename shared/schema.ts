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

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("seller"), // admin, seller
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cars table
export const cars = pgTable("cars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  registrationNumber: varchar("registration_number").notNull().unique(),
  make: varchar("make").notNull(),
  model: varchar("model").notNull(),
  year: integer("year").notNull(),
  mileage: integer("mileage").notNull(),
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
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }), // calculated field
  notes: text("notes"), // renamed from description for consistency
  images: text("images").array(), // array of image URLs
  status: varchar("status").default("available"), // available, sold, reserved
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
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  organizationNumber: varchar("organization_number"), // for companies
  personNumber: varchar("person_number"), // for individuals
  address: text("address"),
  type: varchar("type").default("individual"), // individual, company
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: varchar("user_id").notNull().references(() => users.id),
});

// Contracts table
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractNumber: varchar("contract_number").notNull().unique(),
  carId: varchar("car_id").notNull().references(() => cars.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull(),
  saleDate: timestamp("sale_date").notNull(),
  status: varchar("status").default("draft"), // draft, signed, completed
  pdfUrl: varchar("pdf_url"), // stored PDF file URL
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: varchar("user_id").notNull().references(() => users.id),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  cars: many(cars),
  customers: many(customers),
  contracts: many(contracts),
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
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCarSchema = createInsertSchema(cars).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  profitMargin: true,
  co2Emissions: true,
  lastEuControl: true,
  nextEuControl: true,
  vehicleClass: true,
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
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertCar = z.infer<typeof insertCarSchema>;
export type Car = typeof cars.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;
