# BillBOT+ — Invoice Automation System

## Overview

Production-grade Invoice Automation System with Hebrew UI, RTL layout. Features:
- Gmail scanning for invoice extraction
- AI-powered OCR (Google Gemini Flash 1.5 via OpenRouter) for scanned PDFs
- DeepSeek AI chat with persistent memory
- Smart Vendor Detection + Duplicate Invoice Detection
- Accountant email sharing
- CTO-grade PDF pipeline: 4-way classification, line item extraction, deterministic confidence model

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + Tailwind CSS v4
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **pdf-parse**: MUST be v1.1.1 (NOT v2 — v2 changed to class-based API, breaks `createRequire` pattern)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/             # Express API server
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── invoices.ts              # Invoice CRUD, upload, line-items endpoint
│   │       │   ├── vendors.ts               # Vendor list with aliases
│   │       │   └── health.ts
│   │       ├── services/
│   │       │   ├── aiExtractService.ts      # Full PDF pipeline: classifyPdf→extractFromTextPdf/Scanned/failed
│   │       │   ├── lineItemParser.ts        # Deterministic validator: parseAndValidateLineItems, computeHeaderConfidence
│   │       │   ├── invoiceProcessingService.ts  # Extended with ExtractionMetadata, saves line items
│   │       │   ├── vendorService.ts         # findOrCreateVendor
│   │       │   └── deduplicationService.ts  # detectDuplicate
│   │       └── utils/
│   │           ├── normalizeVendorName.ts   # Hebrew + English normalization
│   │           └── hashFile.ts              # SHA-256 file hashing
│   └── invoice-dashboard/      # React + Vite frontend
│       └── src/
│           ├── pages/dashboard.tsx    # Main invoice dashboard (MonthlyExpenseRow with line items display)
│           ├── hooks/
│           │   ├── use-invoices.ts
│           │   └── use-vendors.ts
│           └── components/
│               ├── stat-card.tsx
│               ├── merge-alias-dialog.tsx
│               └── layout.tsx
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/
│           ├── vendors.ts
│           ├── vendorAliases.ts
│           ├── invoices.ts           # + extraction_source, extraction_status, review_reason, pdf_type, line_items_count
│           └── invoiceLineItems.ts   # NEW: product_name, barcode, sku, quantity, unit_price, line_total, etc.
```

## Database Schema

### vendors
- id UUID PK, canonical_name, tax_id, created_at, updated_at

### vendor_aliases
- id UUID PK, vendor_id FK, alias_name, normalized_alias, created_at
- Index on normalized_alias for fast lookup

### invoices
- id UUID PK, vendor_id FK, raw_vendor_name, normalized_vendor_name
- tax_id, invoice_number, invoice_date, subtotal, vat, total, currency
- file_path, file_sha256 (SHA-256 hash for exact duplicate detection)
- duplicate_status (unique/exact_duplicate/probable_duplicate)
- duplicate_of_invoice_id FK (self-referential)
- status (pending_review/approved/flagged_duplicate)
- extraction_confidence (overall deterministic confidence)
- **NEW**: extraction_source (pdf_text/pdf_ocr/image/failed)
- **NEW**: extraction_status (success/partial/failed)
- **NEW**: review_reason (HEADER_ONLY/LOW_CONFIDENCE/NO_TOTAL/NO_VENDOR/NO_DATE/PDF_ENCRYPTED/PDF_CORRUPTED/OCR_REQUIRED/SCANNED_EMPTY)
- **NEW**: pdf_type (text_pdf/scanned_pdf/encrypted_pdf/corrupted_pdf)
- **NEW**: line_items_count (integer, default 0)

### invoice_line_items (NEW)
- id SERIAL PK, invoice_id FK (CASCADE), product_name, barcode, sku
- quantity NUMERIC, unit_price NUMERIC, line_total NUMERIC
- discount NUMERIC, vat_rate NUMERIC
- item_confidence NUMERIC, sort_order INTEGER
- created_at TIMESTAMP

## CTO Protocol PDF Pipeline

`aiExtractService.ts` — 4-way PDF classification:
1. `text_pdf` → text.length >= 40 → extract via DeepSeek text analysis
2. `scanned_pdf` → text.length < 40 → OCR via Gemini Flash 1.5 (base64 PDF, max 8MB)
3. `encrypted_pdf` → parse throws `/password|encrypt/i` error
4. `corrupted_pdf` → parse throws other error

`lineItemParser.ts` — Deterministic confidence model:
- `computeHeaderConfidence()` = vendor×0.25 + total×0.30 + date×0.20 + invoice_number×0.15 + tax_id×0.10
- `computeLineItemsConfidence()` = average of per-item scores
- `overall = header_conf × 0.7 + line_items_conf × 0.3`

**CRITICAL**: pdf-parse must be v1.1.1. Import via `createRequire(import.meta.url)`. Do NOT upgrade.

## Smart Vendor Detection

`normalizeVendorName(name)` — Normalizes Hebrew and English vendor names:
- Lowercase, trim, collapse spaces
- Normalizes Hebrew suffixes: בע"מ / בעמ => bvm
- Normalizes English suffixes: limited => ltd, incorporated => inc, etc.
- Removes punctuation (preserving Hebrew Unicode block)

`findOrCreateVendor(rawVendorName, taxId)` — Matching priority:
1. Exact tax_id match
2. Exact normalized alias match
3. Exact canonical vendor name match (normalized)
4. Create new vendor + first alias

## Duplicate Detection

`detectDuplicate(invoice)` — Detection logic:
1. Same file_sha256 → exact_duplicate (confidence: 1.0)
2. Same vendor + same invoice_number → exact_duplicate (confidence: 0.98)
3. Same vendor + same invoice_date + same total → probable_duplicate (confidence: 0.85)
4. Otherwise → unique (confidence: 1.0)

## API Endpoints

- `GET /api/healthz` — Health check
- `GET /api/invoices` — List all invoices (includes extraction_source, extraction_status, reviewReason, pdfType, lineItemsCount)
- `POST /api/invoices/upload` — Upload PDF + full extraction pipeline
- `GET /api/invoices/:id/line-items` — Get line items for a specific invoice
- `POST /api/invoices/process` — Full processing pipeline
- `PATCH /api/invoices/:id/approve` — Approve invoice
- `PATCH /api/invoices/:id/mark-not-duplicate` — Override duplicate flag
- `PATCH /api/invoices/:id/merge-alias` — Merge vendor alias
- `GET /api/vendors` — List vendors with aliases
- `POST /api/invoices/scan-email` — Extract invoice from email text/EML file

## Development Commands

- `pnpm --filter @workspace/api-server run dev` — Start API server
- `pnpm --filter @workspace/invoice-dashboard run dev` — Start frontend
- `pnpm --filter @workspace/db run push` — Push schema changes
- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API client + Zod schemas
- `pnpm run typecheck` — Full TypeScript typecheck
