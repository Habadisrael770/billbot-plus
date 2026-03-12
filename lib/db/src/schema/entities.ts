import { pgTable, text, uuid, boolean, timestamp } from "drizzle-orm/pg-core";

export const entitiesTable = pgTable("entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull().default("business"),
  tax_id: text("tax_id"),
  is_default: boolean("is_default").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Entity = typeof entitiesTable.$inferSelect;
