# BillBOT+ — Invoice Automation System

Production-grade Hebrew Invoice Automation SaaS — Gmail scanning, AI-powered OCR (Gemini Flash via OpenRouter), DeepSeek AI chat, accountant sharing, WhatsApp & Telegram invoice intake.

## Run & Operate

```bash
pnpm --filter @workspace/api-server run dev        # API on port 8080
pnpm --filter @workspace/invoice-dashboard run dev # Frontend on port 19180
pnpm run typecheck                                  # Full TS typecheck
psql "$DATABASE_URL" -c "\dt"                       # Inspect DB tables
```

Required secrets: `OPENROUTER_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`,
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `IMAP_ENCRYPTION_KEY`.

## Stack

- **Monorepo**: pnpm workspaces, TypeScript 5.9, Node 24
- **API**: Express 5, tsx dev server, port 8080
- **DB**: PostgreSQL + Drizzle ORM (`@workspace/db` at `lib/db/src/`)
- **Frontend**: React + Vite + Tailwind v4, port 19180
- **Validation**: Zod `zod/v4`, drizzle-zod
- **pdf-parse**: MUST stay at v1.1.1 — v2 breaks createRequire pattern

## Where things live

```
artifacts/api-server/src/
  routes/         auth.ts, invoices.ts, whatsapp.ts, telegram.ts,
                  gmail-auth.ts, imap-auth.ts, email-connectors.ts
  services/       aiExtractService.ts, invoiceProcessingService.ts,
                  lineItemParser.ts, vendorService.ts, imapService.ts
lib/db/src/schema/
  users.ts        + whatsapp_phone (TEXT UNIQUE) — added May 2026
  invoices.ts     source_type, final_category, extraction pipeline cols
  categories.ts   name, color, deduction_pct, sort_order
```

Schema source of truth: `lib/db/src/schema/`  
API routes registered in: `artifacts/api-server/src/index.ts`

## Architecture decisions

- **Single-tenant** — no `user_id` on invoices (shared pool). WhatsApp phone identifies the sender for future multi-user expansion.
- **IMAP fallback** — AES-256 encrypted app-password storage in `imap_accounts` table (raw SQL, not Drizzle) for Gmail OAuth workaround.
- **pdf-parse v1.1.1** — locked; import via `createRequire(import.meta.url)`. Do NOT upgrade.
- **AI model** — `deepseek/deepseek-chat` via OpenRouter for extraction & chat; Gemini Flash 1.5 for scanned PDF OCR.
- **WhatsApp phone normalization** — Israeli local (05X → 972...) normalized on save; stored without `+`.

## Product

- Upload / Gmail scan / IMAP scan / WhatsApp / Telegram → invoice auto-extracted & categorized
- Smart vendor dedup, fuzzy alias matching, foreign supplier detection
- Category management, business profile, accountant share link
- DeepSeek AI chat with persistent memory per conversation
- WhatsApp: register personal phone → send photo/PDF → auto-categorized; caption sets category
- WhatsApp bot commands: `?` help menu, `קטגוריות` list, caption-based routing

## User preferences

- Hebrew UI, RTL layout everywhere
- Dark theme (stored in localStorage `invoice-theme`)
- Toast notifications for all async actions

## Gotchas

- `gmail.readonly` is a **restricted Google scope** — only approved test users can use OAuth. Use IMAP App Password as workaround.
- WhatsApp webhook must reply `200` immediately (before async work) — already done with `res.sendStatus(200)` first.
- IMAP `imap_accounts` table created via raw SQL in `imapService.ts` on first use (not in Drizzle schema).
- `processInvoice` does NOT accept `final_category` in `extracted` — override via DB `UPDATE` after the call.

## Pointers

- Drizzle schema: `lib/db/src/schema/`
- WhatsApp webhook: `artifacts/api-server/src/routes/whatsapp.ts`
- IMAP service: `artifacts/api-server/src/services/imapService.ts`
- Settings UI: `artifacts/invoice-dashboard/src/pages/settings.tsx`
- Gmail scan dialog: `artifacts/invoice-dashboard/src/components/gmail-scan-dialog.tsx`
