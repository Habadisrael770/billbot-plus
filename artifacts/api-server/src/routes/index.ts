import { Router, type IRouter } from "express";
import healthRouter from "./health";
import invoicesRouter from "./invoices";
import invoiceExtractionRouter from "./invoiceExtraction.js";
import vendorsRouter from "./vendors";
import openrouterRouter from "./openrouter/index.js";
import telegramRouter from "./telegram.js";
import whatsappRouter from "./whatsapp.js";
import emailConnectorsRouter from "./email-connectors.js";
import externalApiRouter from "./external-api.js";
import categoriesRouter from "./categories.js";
import entitiesRouter from "./entities.js";
import businessProfileRouter from "./businessProfile.js";
import gmailAuthRouter from "./gmail-auth.js";
import { publicRouter, internalApiKeysRouter } from "./public-api.js";
import invoice4uRouter from "./invoice4u.js";
import vatReportRouter from "./vat-report.js";
import authRouter from "./auth.js";
import imapAuthRouter from "./imap-auth.js";
import inboundEmailRouter from "./inbound-email.js";
import twilioWhatsappRouter from "./twilio-whatsapp.js";
import loyaltyRouter from "./loyalty.js";
import automationsRouter from "./automations.js";
import adminRouter from "./admin.js";
import { requireAuth, readSessionUserId } from "../middleware/auth.js";
import { createHermesRouter, type ResolvedUser } from "../hermes/routes.js";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// ── Hermes AI chat — resolves the logged-in user from the session cookie ────
// Admin (infinite credits) is granted to the email in HERMES_ADMIN_EMAIL, if set.
async function resolveHermesUser(req: Parameters<typeof readSessionUserId>[0]): Promise<ResolvedUser | null> {
  const userId = readSessionUserId(req);
  if (!userId) return null;
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user) return null;
  const adminEmail = process.env.HERMES_ADMIN_EMAIL?.trim().toLowerCase();
  const isAdmin = !!adminEmail && user.email.toLowerCase() === adminEmail;
  return { id: user.id, isAdmin };
}

// ── Public routes (no session required) ────────────────────────────────────
// Health checks, auth endpoints, OAuth callbacks, and inbound webhooks must
// remain reachable without a logged-in cookie. Public-API routes have their
// own X-API-Key authentication.
router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/gmail-auth", gmailAuthRouter);          // /login-url, /url, /callback are public; /status & /disconnect self-check session
router.use("/public", publicRouter);                  // X-API-Key auth
router.use("/inbound-email", inboundEmailRouter);     // POST / is an email provider webhook (handlers below need their own auth where mutating)
router.use("/twilio-whatsapp", twilioWhatsappRouter); // Twilio signature webhook
router.use("/telegram", telegramRouter);              // Telegram bot webhook
router.use("/whatsapp", whatsappRouter);              // Meta WhatsApp webhook
router.use("/loyalty", loyaltyRouter);                // Twilio webhook + member signup (own validation)
router.use("/hermes", createHermesRouter(resolveHermesUser)); // /health public; others self-guard via resolveUser
router.use("/admin", adminRouter);                    // guarded internally by ADMIN_RESET_TOKEN header

// ── Authenticated routes (require valid session cookie) ────────────────────
// Every protected mount goes through `requireAuth`, which rejects requests
// with a 401 when no valid session cookie is present.
router.use("/invoices/extraction", requireAuth, invoiceExtractionRouter);
router.use("/invoices",            requireAuth, invoicesRouter);
router.use("/vendors",             requireAuth, vendorsRouter);
router.use("/openrouter",          requireAuth, openrouterRouter);
router.use("/email-connectors",    requireAuth, emailConnectorsRouter);
router.use("/external-api",        requireAuth, externalApiRouter);
router.use("/categories",          requireAuth, categoriesRouter);
router.use("/entities",            requireAuth, entitiesRouter);
router.use("/business-profile",    requireAuth, businessProfileRouter);
router.use("/internal/api-keys",   requireAuth, internalApiKeysRouter);
router.use("/invoice4u",           requireAuth, invoice4uRouter);
router.use("/vat-report",          requireAuth, vatReportRouter);
router.use("/imap-auth",           requireAuth, imapAuthRouter);
router.use("/automations",         requireAuth, automationsRouter);

export default router;
