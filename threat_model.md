# Threat Model

## Project Overview

BillBOT+ is a production invoice-automation SaaS for Israeli businesses. It exposes an Express 5 API in `artifacts/api-server/src/`, a React/Vite dashboard in `artifacts/invoice-dashboard/src/`, and PostgreSQL-backed shared libraries in `lib/db/src/`. The system ingests invoices from direct upload, Gmail OAuth, IMAP app passwords, WhatsApp, Telegram, and inbound email; stores invoice metadata and files; and offers chat, reporting, automation, and third-party integration features.

This scan treats only production-reachable code as in scope. `artifacts/mockup-sandbox` is dev-only and out of scope unless separately proven reachable in production. Replit deployment TLS is assumed.

## Assets

- **Invoice documents and extracted accounting data** — uploaded PDFs/images, vendor names, tax IDs, totals, VAT, line items, and export artifacts. Disclosure or tampering affects financial records and privacy.
- **User accounts and identity links** — user emails, password hashes, Google identities, WhatsApp phone mappings, Telegram chat IDs, and forwarding tokens. Compromise enables impersonation and message routing abuse.
- **Connected mailbox credentials** — Gmail OAuth tokens and IMAP app passwords used to scan inboxes. These can grant access to business email.
- **Third-party API credentials and accounting integrations** — external API keys/secrets and Invoice4U connectivity. Exposure enables unauthorized access to upstream business systems.
- **Business profile and automation settings** — tax IDs, business names, revenue estimates, VAT status, reminder content, and delivery channels. Integrity matters because these settings drive notifications and reporting.
- **Application secrets and local files** — environment-backed keys plus files readable from the server filesystem. Disclosure can lead to wider compromise.

## Trust Boundaries

- **Browser / API** — every dashboard action crosses from an untrusted client into the Express API. Client state such as `localStorage` is untrusted and cannot establish identity on its own.
- **Public internet / webhook endpoints** — WhatsApp, Telegram, Twilio, Gmail OAuth callbacks, and inbound email endpoints are internet-exposed and must validate source authenticity.
- **API / database** — the API can read and write all business records and credentials. Missing authorization or unsafe file-path handling at the API layer has high impact.
- **API / external providers** — Gmail, IMAP, OpenRouter, Invoice4U, Telegram, WhatsApp, and arbitrary external APIs are called with privileged secrets or stored credentials.
- **Production / dev-only artifacts** — `.agents`, `.local/skills`, and `artifacts/mockup-sandbox` are not production application surfaces and should not drive findings unless reachable from the deployed app.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/index.ts`
- **Highest-risk areas:** `artifacts/api-server/src/routes/`, `artifacts/api-server/src/services/`, `lib/db/src/schema/`
- **Public vs authenticated vs admin surfaces:** many routes currently appear mounted without server-side auth middleware; validate route-by-route rather than assuming protection
- **Dev-only areas usually ignored:** `artifacts/mockup-sandbox/`, `.agents/`, `.local/skills/`, build outputs under `dist/`

## Threat Categories

### Spoofing

The system must not treat client-local state, query parameters, or email addresses supplied in request bodies as proof of identity. All non-public routes that access invoices, user settings, chat history, credentials, or automations MUST require a server-validated identity. OAuth callbacks and inbound webhooks MUST verify the originating provider and bind resulting state changes to the correct user.

### Tampering

Attackers can modify invoice records, categories, vendors, automations, integration settings, and connected credentials if write routes are exposed without authorization. Server-side business actions MUST be authorized per caller, and filesystem paths used for processing or download MUST be constrained to approved storage locations rather than trusted from request input or database state.

### Information Disclosure

Invoices, business profile data, chat memories, connected mailbox accounts, API credentials, and accounting exports are highly sensitive. API responses MUST be scoped to an authenticated principal, secrets MUST never be returned to unauthorized callers, and file-download paths MUST not allow arbitrary reads from the server filesystem.

### Denial of Service

Public upload, OCR, email scanning, AI chat, and external-API test endpoints can trigger expensive compute, I/O, or third-party calls. Production endpoints that perform OCR, mailbox scans, chat streaming, or external connectivity tests SHOULD enforce authentication, reasonable rate limits, and bounded input sizes/timeouts.

### Elevation of Privilege

The highest-risk privilege failures in this project are broken function-level access control and unsafe file-path handling. All invoice management, credential management, business settings, automation triggers, chat memory operations, and internal API-key management MUST be protected by server-side authorization. File-processing and file-serving routes MUST not accept arbitrary paths or permit access outside the intended uploads directory.