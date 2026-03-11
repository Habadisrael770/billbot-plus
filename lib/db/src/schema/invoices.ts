import { pgTable, text, uuid, timestamp, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";

export const invoicesTable = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendor_id: uuid("vendor_id").references(() => vendorsTable.id),
  raw_vendor_name: text("raw_vendor_name"),
  normalized_vendor_name: text("normalized_vendor_name"),
  tax_id: text("tax_id"),
  invoice_number: text("invoice_number"),
  invoice_date: date("invoice_date"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }),
  vat: numeric("vat", { precision: 12, scale: 2 }),
  total: numeric("total", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("ILS"),
  file_path: text("file_path").notNull(),
  file_sha256: text("file_sha256").notNull(),
  duplicate_status: text("duplicate_status").notNull().default("unique"),
  duplicate_of_invoice_id: uuid("duplicate_of_invoice_id"),
  status: text("status").notNull().default("pending_review"),
  extraction_confidence: numeric("extraction_confidence", { precision: 5, scale: 2 }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
