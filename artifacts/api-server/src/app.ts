import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

// Trust the deployment proxy so req.protocol / req.hostname / req.get("host")
// reflect the original request (e.g. billibot.net) instead of the internal
// localhost forwarding hop. Critical for OAuth callbacks that need to redirect
// the popup back to the same origin the user is on.
app.set("trust proxy", true);

// CORS allowlist for credentialed (cookie-bearing) requests. Reflecting an
// arbitrary `Origin` header while sending `Access-Control-Allow-Credentials`
// would let any site read authenticated responses, so we only permit:
//   • same-origin / non-browser callers (no Origin header)
//   • the configured production domain(s) (CORS_ALLOWED_ORIGINS, comma list)
//   • the public deployment domain (https://billibot.net)
//   • Replit dev preview hostnames (https://*.replit.dev / .replit.app)
const explicitOrigins = new Set<string>([
  "https://billibot.net",
  "https://www.billibot.net",
  ...((process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)),
]);
function isAllowedOrigin(origin: string): boolean {
  if (explicitOrigins.has(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host.endsWith(".replit.dev")
        || host.endsWith(".replit.app")
        || host.endsWith(".repl.co");
  } catch {
    return false;
  }
}
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);          // non-browser / same-origin
    if (isAllowedOrigin(origin)) return cb(null, true);
    return cb(null, false);                       // block — no ACAO header sent
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
