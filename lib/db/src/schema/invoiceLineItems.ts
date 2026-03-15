import { pgTable, uuid, text, numeric, integer, serial } from "drizzle-orm/pg-core";
import { invoicesTable } from "./invoices";

export const invoiceLineItemsTable = pgTable("invoice_line_items", {
  id:           serial("id").primaryKey(),
  invoice_id:   uuid("invoice_id").notNull().references(() => invoicesTable.id, { onDelete: "cascade" }),
  product_name: text("product_name"),
  barcode:      text("barcode"),
  sku:          text("sku"),
  quantity:     numeric("quantity",   { precision: 10, scale: 3 }),
  unit:         text("unit"),
  unit_price:   numeric("unit_price", { precision: 12, scale: 4 }),
  line_total:   numeric("line_total", { precision: 12, scale: 2 }),
  discount:     numeric("discount",   { precision: 5,  scale: 2 }),
  vat_rate:     numeric("vat_rate",   { precision: 5,  scale: 2 }),
  item_confidence: numeric("item_confidence", { precision: 4, scale: 3 }),
  sort_order:   integer("sort_order").default(0),
});

export type InvoiceLineItem = typeof invoiceLineItemsTable.$inferSelect;
export type InsertInvoiceLineItem = typeof invoiceLineItemsTable.$inferInsert;
