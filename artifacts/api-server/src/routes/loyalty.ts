import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { loyaltyMembers } from "@workspace/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import twilio from "twilio";

const router: IRouter = Router();

// ── Twilio helper ─────────────────────────────────────────────────────────────
function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  return twilio(accountSid, authToken);
}

const FROM = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) {
    return "972" + digits.slice(1);
  }
  return digits;
}

function isConfirmation(msg: string): boolean {
  const t = msg.trim().toLowerCase();
  return t === "55" || t === "מאשר" || t === "מאשרת" || t === "ok" || t === "אישור";
}

// ── Step messages ─────────────────────────────────────────────────────────────
function step0Message(name: string): string {
  const firstName = name.trim().split(/\s+/)[0];
  return (
    `שלום ${firstName}! 🎉\n\n` +
    `ברוך הבא למועדון הלקוחות שלנו!\n\n` +
    `כדי לסיים את הרישום ולקבל הטבות ועדכונים בלעדיים ב-WhatsApp,\n` +
    `אנא אשר/י את הצטרפותך.\n\n` +
    `👉 כתוב/י *מאשר* או *55* לאישור`
  );
}

function step1Message(): string {
  return (
    `מעולה! 🎊 הרישום אושר!\n\n` +
    `שלב אחרון: כדי שנוכל להיות בקשר ולשלוח הטבות, הוסיפ/י אותנו לאנשי הקשר שלך.\n\n` +
    `שמור/י את המספר הזה ולאחר מכן כתוב/י שוב *מאשר* או *55* לאישור סופי.`
  );
}

function step2Message(): string {
  return (
    `תודה רבה! ✅\n\n` +
    `אתה/את עכשיו חבר/ת רשמי/ת במועדון!\n\n` +
    `נשלח לך עדכונים ומבצעים בלעדיים ישירות ב-WhatsApp 🎁\n\n` +
    `נתראה בקרוב! 😊`
  );
}

async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const client = getTwilioClient();
  if (!client) {
    console.warn("[loyalty] Twilio not configured, skipping WhatsApp send");
    return false;
  }
  const toNumber = `whatsapp:+${to}`;
  try {
    await client.messages.create({ from: FROM, to: toNumber, body });
    return true;
  } catch (err) {
    console.error("[loyalty] Twilio send error:", err);
    return false;
  }
}

// ── POST /loyalty/members — register a new member ────────────────────────────
router.post("/members", async (req, res) => {
  try {
    const { fullName, phone, email, birthDate, notes } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ error: "שם מלא וטלפון הם שדות חובה" });
    }

    const normalizedPhone = normalizePhone(phone);

    // Upsert — if phone exists, update step if already onboarded
    const existing = await db
      .select()
      .from(loyaltyMembers)
      .where(eq(loyaltyMembers.phone, normalizedPhone))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: "מספר טלפון זה כבר רשום במועדון" });
    }

    const [member] = await db
      .insert(loyaltyMembers)
      .values({
        fullName,
        phone: normalizedPhone,
        email: email || null,
        birthDate: birthDate || null,
        notes: notes || null,
        onboardingStep: 0,
        whatsappOptIn: false,
      })
      .returning();

    // Send step-0 WhatsApp
    const sent = await sendWhatsApp(normalizedPhone, step0Message(fullName));
    if (sent) {
      await db
        .update(loyaltyMembers)
        .set({ whatsappSentAt: new Date() })
        .where(eq(loyaltyMembers.id, member.id));
    }

    return res.status(201).json({ success: true, member, whatsappSent: sent });
  } catch (err) {
    console.error("[loyalty] POST /members error:", err);
    return res.status(500).json({ error: "שגיאה פנימית בשרת" });
  }
});

// ── GET /loyalty/members — admin list all members ─────────────────────────────
router.get("/members", async (_req, res) => {
  try {
    const members = await db
      .select()
      .from(loyaltyMembers)
      .orderBy(desc(loyaltyMembers.joinedAt));
    return res.json(members);
  } catch (err) {
    console.error("[loyalty] GET /members error:", err);
    return res.status(500).json({ error: "שגיאה פנימית בשרת" });
  }
});

// ── GET /loyalty/stats — admin dashboard stats ────────────────────────────────
router.get("/stats", async (_req, res) => {
  try {
    const members = await db.select().from(loyaltyMembers);
    const total = members.length;
    const fullyOnboarded = members.filter((m) => m.onboardingStep === 2).length;
    const pendingStep1 = members.filter((m) => m.onboardingStep === 0).length;
    const pendingStep2 = members.filter((m) => m.onboardingStep === 1).length;
    const optedIn = members.filter((m) => m.whatsappOptIn).length;

    // Recent (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = members.filter(
      (m) => m.joinedAt && new Date(m.joinedAt) > sevenDaysAgo
    ).length;

    return res.json({
      total,
      fullyOnboarded,
      pendingStep1,
      pendingStep2,
      optedIn,
      recentCount,
    });
  } catch (err) {
    console.error("[loyalty] GET /stats error:", err);
    return res.status(500).json({ error: "שגיאה פנימית בשרת" });
  }
});

// ── DELETE /loyalty/members/:id — remove a member ────────────────────────────
router.delete("/members/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(loyaltyMembers).where(eq(loyaltyMembers.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error("[loyalty] DELETE /members/:id error:", err);
    return res.status(500).json({ error: "שגיאה פנימית בשרת" });
  }
});

// ── POST /loyalty/resend/:id — resend WhatsApp to member ─────────────────────
router.post("/resend/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [member] = await db
      .select()
      .from(loyaltyMembers)
      .where(eq(loyaltyMembers.id, id))
      .limit(1);

    if (!member) return res.status(404).json({ error: "חבר לא נמצא" });

    let message: string;
    if (member.onboardingStep === 0) {
      message = step0Message(member.fullName);
    } else if (member.onboardingStep === 1) {
      message = step1Message();
    } else {
      message = step2Message();
    }

    const sent = await sendWhatsApp(member.phone, message);
    if (sent) {
      await db
        .update(loyaltyMembers)
        .set({ whatsappSentAt: new Date() })
        .where(eq(loyaltyMembers.id, id));
    }

    return res.json({ success: sent });
  } catch (err) {
    console.error("[loyalty] POST /resend/:id error:", err);
    return res.status(500).json({ error: "שגיאה פנימית בשרת" });
  }
});

// ── POST /loyalty/webhook — Twilio incoming WhatsApp for opt-in flow ──────────
router.post("/webhook", async (req, res) => {
  res.set("Content-Type", "text/xml");

  const from: string = req.body?.From || "";
  const body: string = req.body?.Body || "";

  // Phone: whatsapp:+972XXXXXXX → 972XXXXXXX
  const rawPhone = from.replace(/^whatsapp:\+?/, "");

  if (!isConfirmation(body)) {
    return res.send(`<Response><Message>שלום! כדי לאשר רישום למועדון, שלח/י *מאשר* או *55*.</Message></Response>`);
  }

  try {
    const [member] = await db
      .select()
      .from(loyaltyMembers)
      .where(eq(loyaltyMembers.phone, rawPhone))
      .limit(1);

    if (!member) {
      return res.send(`<Response><Message>לא מצאנו אותך במועדון. פנה/י לנציג שלנו להרשמה 😊</Message></Response>`);
    }

    if (member.onboardingStep === 0) {
      await db
        .update(loyaltyMembers)
        .set({ onboardingStep: 1 })
        .where(eq(loyaltyMembers.id, member.id));
      return res.send(`<Response><Message>${step1Message()}</Message></Response>`);
    }

    if (member.onboardingStep === 1) {
      await db
        .update(loyaltyMembers)
        .set({
          onboardingStep: 2,
          whatsappOptIn: true,
          optInAt: new Date(),
          contactSavedAt: new Date(),
        })
        .where(eq(loyaltyMembers.id, member.id));
      return res.send(`<Response><Message>${step2Message()}</Message></Response>`);
    }

    // Already fully onboarded
    return res.send(`<Response><Message>אתה/את כבר רשום/ה במועדון! תודה 🎁</Message></Response>`);
  } catch (err) {
    console.error("[loyalty] webhook error:", err);
    return res.send(`<Response><Message>שגיאה זמנית, נסה/י שוב מאוחר יותר.</Message></Response>`);
  }
});

export default router;
