import { pgTable, text, uuid, timestamp, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { invoicesTable } from "./invoices";

export const invoiceExtractionJobsTable = pgTable(
  "invoice_extraction_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoice_id: uuid("invoice_id")
      .notNull()
      .references(() => invoicesTable.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("queued"),
    priority: integer("priority").notNull().default(100),
    attempts: integer("attempts").notNull().default(0),
    max_attempts: integer("max_attempts").notNull().default(3),
    last_error: text("last_error"),
    last_error_code: text("last_error_code"),
    locked_at: timestamp("locked_at", { withTimezone: true }),
    locked_by: text("locked_by"),
    next_run_at: timestamp("next_run_at", { withTimezone: true }).defaultNow(),
    started_at: timestamp("started_at", { withTimezone: true }),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("iej_status_idx").on(t.status),
    nextRunIdx: index("iej_next_run_at_idx").on(t.next_run_at),
    invoiceIdx: index("iej_invoice_id_idx").on(t.invoice_id),
    lockedAtIdx: index("iej_locked_at_idx").on(t.locked_at),
    statusNextRunIdx: index("iej_status_next_run_idx").on(t.status, t.next_run_at),
    // Partial unique index: at most one ACTIVE job per invoice.
    // Enforced at DB level so concurrent enqueuers cannot create duplicates.
    activePerInvoiceUniq: uniqueIndex("iej_active_per_invoice_uniq")
      .on(t.invoice_id)
      .where(sql`status IN ('queued','processing','retrying')`),
  })
);

export type InvoiceExtractionJob = typeof invoiceExtractionJobsTable.$inferSelect;
export type InsertInvoiceExtractionJob = typeof invoiceExtractionJobsTable.$inferInsert;

export type ExtractionJobStatus =
  | "queued"
  | "processing"
  | "retrying"
  | "completed"
  | "failed"
  | "poisoned";

export type ExtractionErrorCode =
  | "FILE_NOT_FOUND"
  | "AI_RATE_LIMITED"
  | "AI_PROVIDER_ERROR"
  | "AI_INVALID_JSON"
  | "EXTRACTION_SCHEMA_INVALID"
  | "DB_UPDATE_FAILED"
  | "UNKNOWN_EXTRACTION_ERROR";
