import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const apiConnectionsTable = pgTable("api_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  service: text("service").notNull(),
  display_name: text("display_name").notNull(),
  api_key: text("api_key").notNull(),
  api_secret: text("api_secret"),
  base_url: text("base_url"),
  is_active: boolean("is_active").notNull().default(true),
  last_tested_at: timestamp("last_tested_at", { withTimezone: true }),
  last_test_ok: boolean("last_test_ok"),
  last_test_error: text("last_test_error"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ApiConnection = typeof apiConnectionsTable.$inferSelect;
export type InsertApiConnection = typeof apiConnectionsTable.$inferInsert;
