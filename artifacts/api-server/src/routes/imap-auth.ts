import { Router, type IRouter } from "express";
import {
  saveImapAccount,
  deleteImapAccount,
  listImapAccounts,
  testImapConnection,
} from "../services/imapService.js";

const router: IRouter = Router();

// ── Test + save IMAP App Password ───────────────────────────────────────────
router.post("/connect", async (req, res) => {
  const { email, appPassword, host, port } = req.body ?? {};
  if (!email || !appPassword) {
    return res.status(400).json({ ok: false, error: "נדרש מייל וסיסמת אפליקציה" });
  }
  const h = host ?? "imap.gmail.com";
  const p = Number(port) || 993;
  try {
    await testImapConnection(email, appPassword, h, p);
    await saveImapAccount(email, appPassword, h, p);
    return res.json({ ok: true, email });
  } catch (err) {
    const msg = String(err);
    let heMsg = "לא ניתן להתחבר. בדוק מייל וסיסמת אפליקציה.";
    if (msg.includes("AUTHENTICATIONFAILED") || msg.includes("Invalid credentials")) {
      heMsg = "סיסמת האפליקציה שגויה. וודא שאימות דו-שלבי מופעל ושהסיסמה נוצרה עבור 'Mail'.";
    } else if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
      heMsg = "לא ניתן להגיע לשרת IMAP. בדוק את פרטי החיבור.";
    } else if (msg.includes("ECONNRESET") || msg.includes("timeout")) {
      heMsg = "פג זמן החיבור. בדוק חיבור האינטרנט.";
    }
    return res.status(400).json({ ok: false, error: heMsg });
  }
});

// ── List connected IMAP accounts ────────────────────────────────────────────
router.get("/accounts", async (_req, res) => {
  try {
    const accounts = await listImapAccounts();
    return res.json({ ok: true, accounts });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// ── Disconnect IMAP account ─────────────────────────────────────────────────
router.delete("/accounts/:email", async (req, res) => {
  try {
    await deleteImapAccount(decodeURIComponent(req.params.email));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
