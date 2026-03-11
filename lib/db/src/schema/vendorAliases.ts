import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";

export const vendorAliasesTable = pgTable(
  "vendor_aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendor_id: uuid("vendor_id")
      .notNull()
      .references(() => vendorsTable.id, { onDelete: "cascade" }),
    alias_name: text("alias_name").notNull(),
    normalized_alias: text("normalized_alias").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_vendor_aliases_normalized").on(table.normalized_alias)]
);

export const insertVendorAliasSchema = createInsertSchema(vendorAliasesTable).omit({
  id: true,
  created_at: true,
});

export type InsertVendorAlias = z.infer<typeof insertVendorAliasSchema>;
export type VendorAlias = typeof vendorAliasesTable.$inferSelect;
