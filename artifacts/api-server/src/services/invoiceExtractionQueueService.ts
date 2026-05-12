/**
 * invoiceExtractionQueueService.ts
 * Durable, resumable, idempotent DB-backed extraction job queue.
 */
import { db } from "@workspace/db";
import {
  type ExtractionJobStatus,
  type ExtractionErrorCode,
} from "@workspace/db/schema";
import { sql } from "drizzle-orm";

// Retry backoff in milliseconds, by attempt number (1-based).
const BACKOFF_MS = [
  60 * 1000,        // attempt 1 → +1 minute
  5 * 60 * 1000,    // attempt 2 → +5 minutes
  15 * 60 * 1000,   // attempt 3 → +15 minutes
];

function nextRunAtFor(attempts: number): Date {
  const idx = Math.min(Math.max(attempts - 1, 0), BACKOFF_MS.length - 1);
  return new Date(Date.now() + BACKOFF_MS[idx]!);
}

export interface ClaimedJob {
  jobId: string;
  invoiceId: string;
  attempts: number;
  maxAttempts: number;
}

/**
 * Insert queued jobs for invoices that have no current active job
 * AND have extraction_status NULL (or 'failed' that you want to retry — opt-in).
 */
export async function enqueuePendingInvoices(limit = 500): Promise<{
  enqueued: number;
  skipped: number;
  scanned: number;
}> {
  // Use raw SQL for atomic insert-from-select with NOT EXISTS guard.
  // Only enqueue invoices whose extraction_status IS NULL and which have
  // no active (queued/processing/retrying) job.
  const result = await db.execute(sql`
    WITH candidates AS (
      SELECT i.id
      FROM invoices i
      WHERE i.extraction_status IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM invoice_extraction_jobs j
          WHERE j.invoice_id = i.id
            AND j.status IN ('queued','processing','retrying')
        )
      ORDER BY i.created_at DESC
      LIMIT ${limit}
    ),
    inserted AS (
      INSERT INTO invoice_extraction_jobs (invoice_id, status, next_run_at)
      SELECT id, 'queued', now() FROM candidates
      ON CONFLICT DO NOTHING
      RETURNING 1
    )
    SELECT
      (SELECT COUNT(*)::int FROM inserted) AS enqueued,
      (SELECT COUNT(*)::int FROM candidates) AS scanned
  `);
  const row = result.rows[0] as { enqueued: number; scanned: number };
  const enqueued = row?.enqueued ?? 0;
  const scanned = row?.scanned ?? 0;
  return { enqueued, skipped: scanned - enqueued, scanned };
}

/**
 * Enqueue a single invoice. If an active job exists, no new row is created.
 */
export async function enqueueInvoice(
  invoiceId: string,
  priority = 100
): Promise<{ created: boolean }> {
  // Race-safe: relies on partial unique index iej_active_per_invoice_uniq
  // which forbids more than one active job per invoice_id.
  const result = await db.execute(sql`
    INSERT INTO invoice_extraction_jobs (invoice_id, status, priority, next_run_at)
    SELECT ${invoiceId}::uuid, 'queued', ${priority}, now()
    WHERE NOT EXISTS (
      SELECT 1 FROM invoice_extraction_jobs
      WHERE invoice_id = ${invoiceId}::uuid
        AND status IN ('queued','processing','retrying')
    )
    RETURNING id
  `);
  return { created: result.rows.length > 0 };
}

/**
 * Atomically claim up to `limit` jobs for a worker.
 * Sets locked_by + locked_at + status='processing'.
 * Uses SKIP LOCKED so multiple workers won't grab the same row.
 */
export async function claimNextJobs(
  workerId: string,
  limit: number
): Promise<ClaimedJob[]> {
  const now = new Date();
  const result = await db.execute(sql`
    WITH picked AS (
      SELECT id
      FROM invoice_extraction_jobs
      WHERE status IN ('queued','retrying')
        AND (next_run_at IS NULL OR next_run_at <= ${now})
      ORDER BY priority ASC, next_run_at ASC NULLS FIRST, created_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE invoice_extraction_jobs j
    SET status = 'processing',
        locked_by = ${workerId},
        locked_at = ${now},
        started_at = COALESCE(j.started_at, ${now}),
        updated_at = ${now}
    FROM picked
    WHERE j.id = picked.id
    RETURNING j.id, j.invoice_id, j.attempts, j.max_attempts
  `);

  return result.rows.map((r: any) => ({
    jobId: r.id as string,
    invoiceId: r.invoice_id as string,
    attempts: r.attempts as number,
    maxAttempts: r.max_attempts as number,
  }));
}

export async function markJobCompleted(
  jobId: string,
  invoiceId: string,
  workerId?: string
): Promise<void> {
  const now = new Date();
  // Guard: only the worker that owns the lock and whose job is still 'processing'
  // may mark it completed. Prevents stale-reset races from clobbering another
  // worker's in-flight job.
  await db.execute(sql`
    UPDATE invoice_extraction_jobs
    SET status = 'completed',
        completed_at = ${now},
        locked_by = NULL,
        locked_at = NULL,
        last_error = NULL,
        last_error_code = NULL,
        updated_at = ${now}
    WHERE id = ${jobId}
      AND status = 'processing'
      ${workerId ? sql`AND locked_by = ${workerId}` : sql``}
  `);
  await db.execute(sql`
    UPDATE invoices
    SET extracted_at = ${now},
        extraction_error = NULL,
        updated_at = ${now}
    WHERE id = ${invoiceId}
  `);
  console.log(`[queue] job=${jobId} invoice=${invoiceId} → completed`);
}

export async function markJobFailed(
  jobId: string,
  invoiceId: string,
  errorCode: ExtractionErrorCode,
  errorMessage: string,
  retryable: boolean,
  workerId?: string
): Promise<{ status: ExtractionJobStatus }> {
  const now = new Date();
  // Same ownership guard as markJobCompleted.
  const updated = await db.execute(sql`
    UPDATE invoice_extraction_jobs
    SET attempts = attempts + 1,
        last_error = ${errorMessage.slice(0, 1000)},
        last_error_code = ${errorCode},
        locked_by = NULL,
        locked_at = NULL,
        updated_at = ${now}
    WHERE id = ${jobId}
      AND status = 'processing'
      ${workerId ? sql`AND locked_by = ${workerId}` : sql``}
    RETURNING attempts, max_attempts
  `);
  const row = updated.rows[0] as { attempts: number; max_attempts: number } | undefined;
  if (!row) return { status: "failed" };

  let nextStatus: ExtractionJobStatus;
  let nextRunAt: Date | null = null;

  if (!retryable) {
    nextStatus = "poisoned";
  } else if (row.attempts >= row.max_attempts) {
    nextStatus = "poisoned";
  } else {
    nextStatus = "retrying";
    nextRunAt = nextRunAtFor(row.attempts);
  }

  await db.execute(sql`
    UPDATE invoice_extraction_jobs
    SET status = ${nextStatus},
        next_run_at = ${nextRunAt},
        completed_at = ${nextStatus === "poisoned" ? now : null},
        updated_at = ${now}
    WHERE id = ${jobId}
  `);

  // Mirror final state to invoices.extraction_status when poisoned (not on retries).
  if (nextStatus === "poisoned") {
    await db.execute(sql`
      UPDATE invoices
      SET extraction_status = 'failed',
          extraction_error = ${errorCode + ': ' + errorMessage.slice(0, 500)},
          extraction_attempts = ${row.attempts},
          updated_at = ${now}
      WHERE id = ${invoiceId}
    `);
  } else {
    await db.execute(sql`
      UPDATE invoices
      SET extraction_attempts = ${row.attempts},
          extraction_error = ${errorCode + ': ' + errorMessage.slice(0, 500)},
          updated_at = ${now}
      WHERE id = ${invoiceId}
    `);
  }

  console.log(
    `[queue] job=${jobId} invoice=${invoiceId} → ${nextStatus} (attempt ${row.attempts}/${row.max_attempts}, code=${errorCode})`
  );
  return { status: nextStatus };
}

/**
 * Force a job to poisoned (e.g. unrecoverable error code).
 */
export async function markJobPoisoned(
  jobId: string,
  invoiceId: string,
  errorCode: ExtractionErrorCode,
  errorMessage: string,
  workerId?: string
): Promise<void> {
  await markJobFailed(jobId, invoiceId, errorCode, errorMessage, false, workerId);
}

/**
 * Stale processing jobs (worker crashed / process killed) are returned to retrying.
 */
export async function resetStaleProcessingJobs(staleMinutes = 30): Promise<number> {
  const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000);
  const now = new Date();
  const result = await db.execute(sql`
    UPDATE invoice_extraction_jobs
    SET status = 'retrying',
        locked_by = NULL,
        locked_at = NULL,
        next_run_at = ${now},
        updated_at = ${now}
    WHERE status = 'processing'
      AND locked_at IS NOT NULL
      AND locked_at < ${cutoff}
    RETURNING id
  `);
  const count = result.rows.length;
  if (count > 0) console.log(`[queue] reset ${count} stale processing job(s)`);
  return count;
}

export interface QueueStats {
  queued: number;
  processing: number;
  retrying: number;
  completed: number;
  failed: number;
  poisoned: number;
  pendingInvoicesWithoutJobs: number;
}

export async function getQueueStats(): Promise<QueueStats> {
  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE status='queued')::int     AS queued,
      COUNT(*) FILTER (WHERE status='processing')::int AS processing,
      COUNT(*) FILTER (WHERE status='retrying')::int   AS retrying,
      COUNT(*) FILTER (WHERE status='completed')::int  AS completed,
      COUNT(*) FILTER (WHERE status='failed')::int     AS failed,
      COUNT(*) FILTER (WHERE status='poisoned')::int   AS poisoned
    FROM invoice_extraction_jobs
  `);
  const row = (result.rows[0] ?? {}) as Partial<QueueStats>;

  const pending = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt
    FROM invoices i
    WHERE i.extraction_status IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM invoice_extraction_jobs j
        WHERE j.invoice_id = i.id
          AND j.status IN ('queued','processing','retrying')
      )
  `);
  const pendingCount = (pending.rows[0] as { cnt: number })?.cnt ?? 0;

  return {
    queued: row.queued ?? 0,
    processing: row.processing ?? 0,
    retrying: row.retrying ?? 0,
    completed: row.completed ?? 0,
    failed: row.failed ?? 0,
    poisoned: row.poisoned ?? 0,
    pendingInvoicesWithoutJobs: pendingCount,
  };
}
