import { pgTable, text, uuid, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const categoriesTable = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  name_en: text("name_en"),
  color: text("color").notNull().default("#6366f1"),
  icon: text("icon"),
  tax_code: text("tax_code"),
  deduction_pct: integer("deduction_pct").notNull().default(100),
  description: text("description"),
  parent_code: text("parent_code"),
  is_default: boolean("is_default").notNull().default(false),
  is_deletable: boolean("is_deletable").notNull().default(true),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Category = typeof categoriesTable.$inferSelect;
