import { pgTable, text, uuid, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const businessProfileTable = pgTable("business_profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  onboarding_completed: boolean("onboarding_completed").notNull().default(false),
  business_tax_ids: text("business_tax_ids")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  business_names: text("business_names")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  expense_categories: text("expense_categories")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  business_type: text("business_type"),
  industry: text("industry"),
  home_office_usage_percent: integer("home_office_usage_percent").default(0),
  vehicle_business_usage_percent: integer("vehicle_business_usage_percent").default(0),
  estimated_annual_revenue: text("estimated_annual_revenue"),
  is_vat_registered: boolean("is_vat_registered").default(false),
  has_employees: boolean("has_employees").default(false),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BusinessProfile = typeof businessProfileTable.$inferSelect;
