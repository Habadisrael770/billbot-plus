/**
 * Routes for the durable invoice extraction queue.
 * Mounted at /api/invoices/extraction
 */
import { Router, type IRouter } from "express";
import {
  enqueuePendingInvoices,
  enqueueInvoice,
  getQueueStats,
  resetStaleProcessingJobs,
} from "../services/invoiceExtractionQueueService.js";
import { runWorkerBatch } from "../services/invoiceExtractionWorker.js";

const router: IRouter = Router();

/**
 * POST /api/invoices/extraction/enqueue-pending
 * Body: { limit?: number }
 */
router.post("/enqueue-pending", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.body?.limit ?? 500), 5000));
    const result = await enqueuePendingInvoices(limit);
    res.json(result);
  } catch (err) {
    console.error("[extraction] enqueue-pending failed:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/invoices/extraction/enqueue
 * Body: { invoiceId: string, priority?: number }
 */
router.post("/enqueue", async (req, res) => {
  try {
    const invoiceId = String(req.body?.invoiceId ?? "");
    if (!invoiceId) {
      res.status(400).json({ error: "invoiceId is required" });
      return;
    }
    const priority = Number(req.body?.priority ?? 100);
    const r = await enqueueInvoice(invoiceId, priority);
    res.json(r);
  } catch (err) {
    console.error("[extraction] enqueue failed:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/invoices/extraction/run-worker
 * Body: { limit?: number, concurrency?: number }
 */
router.post("/run-worker", async (req, res) => {
  try {
    const limit = Number(req.body?.limit ?? 50);
    const concurrency = Number(req.body?.concurrency ?? 3);
    const result = await runWorkerBatch({ limit, concurrency });
    res.json(result);
  } catch (err) {
    console.error("[extraction] run-worker failed:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/invoices/extraction/queue-stats
 */
router.get("/queue-stats", async (_req, res) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch (err) {
    console.error("[extraction] queue-stats failed:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/invoices/extraction/reset-stale
 * Body: { staleMinutes?: number }
 */
router.post("/reset-stale", async (req, res) => {
  try {
    const staleMinutes = Math.max(1, Number(req.body?.staleMinutes ?? 30));
    const reset = await resetStaleProcessingJobs(staleMinutes);
    res.json({ reset });
  } catch (err) {
    console.error("[extraction] reset-stale failed:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
