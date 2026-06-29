import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { apiConnectionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Known service definitions
const SERVICES: Record<string, { name: string; baseUrl: string; testPath: string; authHeader: string }> = {
  green_invoice: {
    name: "חשבונית ירוקה",
    baseUrl: "https://api.greeninvoice.co.il/api/v1",
    testPath: "/businesses/me",
    authHeader: "Bearer",
  },
  icount: {
    name: "iCount",
    baseUrl: "https://api.icount.co.il/api/v3.php",
    testPath: "",
    authHeader: "Basic",
  },
  priority: {
    name: "Priority",
    baseUrl: "",
    testPath: "",
    authHeader: "Basic",
  },
  monday: {
    name: "Monday.com",
    baseUrl: "https://api.monday.com/v2",
    testPath: "",
    authHeader: "Bearer",
  },
  quickbooks: {
    name: "QuickBooks",
    baseUrl: "https://quickbooks.api.intuit.com",
    testPath: "",
    authHeader: "Bearer",
  },
  custom: {
    name: "מותאם אישית",
    baseUrl: "",
    testPath: "",
    authHeader: "Bearer",
  },
};

type ApiConnectionRow = typeof apiConnectionsTable.$inferSelect;

function redactConnection(row: ApiConnectionRow) {
  return {
    ...row,
    api_key: row.api_key ? "********" : null,
    api_secret: row.api_secret ? "********" : null,
  };
}

function getAllowedCustomApiHosts(): Set<string> {
  return new Set(
    (process.env.EXTERNAL_API_ALLOWED_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean)
  );
}

function resolveServiceBaseUrl(service: string, requestedBaseUrl?: string): string {
  const svcDef = SERVICES[service];
  if (!svcDef) throw new Error("Unknown service");

  if (service !== "custom") {
    return svcDef.baseUrl;
  }

  const rawUrl = requestedBaseUrl?.trim();
  if (!rawUrl) return "";

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid base_url");
  }

  const allowedHosts = getAllowedCustomApiHosts();
  if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname.toLowerCase())) {
    throw new Error("Custom base_url is not allowed");
  }

  return parsed.origin + parsed.pathname.replace(/\/$/, "");
}

// GET /api/external-api/connections
router.get("/connections", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(apiConnectionsTable)
      .orderBy(apiConnectionsTable.created_at);
    res.json({ connections: rows.map(redactConnection) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/external-api/connections — save or update
router.post("/connections", async (req, res) => {
  try {
    const { id, service, api_key, api_secret, base_url, display_name } = req.body as {
      id?: string;
      service: string;
      api_key: string;
      api_secret?: string;
      base_url?: string;
      display_name?: string;
    };

    if (!service || !api_key) {
      res.status(400).json({ error: "service ו-api_key נדרשים" });
      return;
    }

    const svcDef = SERVICES[service];
    if (!svcDef) {
      res.status(400).json({ error: "service לא מוכר" });
      return;
    }
    const name = display_name || svcDef?.name || service;
    const resolvedUrl = resolveServiceBaseUrl(service, base_url);

    if (id) {
      await db
        .update(apiConnectionsTable)
        .set({
          service,
          display_name: name,
          api_key,
          api_secret: api_secret ?? null,
          base_url: resolvedUrl,
          updated_at: new Date(),
        })
        .where(eq(apiConnectionsTable.id, id));
      res.json({ ok: true, action: "updated" });
    } else {
      const [row] = await db
        .insert(apiConnectionsTable)
        .values({
          service,
          display_name: name,
          api_key,
          api_secret: api_secret ?? null,
          base_url: resolvedUrl,
          is_active: true,
        })
        .returning({ id: apiConnectionsTable.id });
      res.json({ ok: true, action: "created", id: row.id });
    }
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/external-api/connections/:id
router.delete("/connections/:id", async (req, res) => {
  try {
    await db
      .delete(apiConnectionsTable)
      .where(eq(apiConnectionsTable.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/external-api/test
router.post("/test", async (req, res) => {
  try {
    const { service, api_key, api_secret, base_url } = req.body as {
      service: string;
      api_key: string;
      api_secret?: string;
      base_url?: string;
    };

    const svcDef = SERVICES[service];
    if (!svcDef) {
      res.status(400).json({ ok: false, error: "שירות לא מוכר" });
      return;
    }

    const resolvedBase = resolveServiceBaseUrl(service, base_url);
    if (!resolvedBase) {
      // Can't auto-test without a URL — mark as untested success
      res.json({ ok: true, message: "לא ניתן לבדוק אוטומטית — נשמר בהצלחה" });
      return;
    }

    let testUrl = resolvedBase + svcDef.testPath;
    let authValue = "";

    if (svcDef.authHeader === "Bearer") {
      authValue = `Bearer ${api_key}`;
    } else if (svcDef.authHeader === "Basic") {
      const creds = api_secret
        ? Buffer.from(`${api_key}:${api_secret}`).toString("base64")
        : Buffer.from(api_key).toString("base64");
      authValue = `Basic ${creds}`;
    }

    const testRes = await fetch(testUrl, {
      method: "GET",
      headers: {
        Authorization: authValue,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const ok = testRes.status < 400;

    // Update last_tested_at in DB if we have a record
    const { connectionId } = req.body as { connectionId?: string };
    if (connectionId) {
      await db
        .update(apiConnectionsTable)
        .set({
          last_tested_at: new Date(),
          last_test_ok: ok,
          last_test_error: ok ? null : `HTTP ${testRes.status}`,
          updated_at: new Date(),
        })
        .where(eq(apiConnectionsTable.id, connectionId));
    }

    res.json({
      ok,
      status: testRes.status,
      message: ok ? "החיבור הצליח!" : `שגיאה: HTTP ${testRes.status}`,
    });
  } catch (err) {
    res.json({ ok: false, error: String(err) });
  }
});

// GET /api/external-api/services — list available services
router.get("/services", (_req, res) => {
  res.json({
    services: Object.entries(SERVICES).map(([id, def]) => ({
      id,
      name: def.name,
      hasBaseUrl: !!def.baseUrl,
    })),
  });
});

export default router;
