# Invoice Automation System

## Overview

Production-grade Invoice Automation System with Smart Vendor Detection and Duplicate Invoice Detection.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + Tailwind CSS
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/             # Express API server
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── invoices.ts       # Invoice CRUD + processing
│   │       │   ├── vendors.ts        # Vendor list with aliases
│   │       │   └── health.ts
│   │       ├── services/
│   │       │   ├── invoiceProcessingService.ts   # Full processing pipeline
│   │       │   ├── vendorService.ts              # findOrCreateVendor
│   │       │   └── deduplicationService.ts       # detectDuplicate
│   │       └── utils/
│   │           ├── normalizeVendorName.ts        # Hebrew + English normalization
│   │           └── hashFile.ts                   # SHA-256 file hashing
│   └── invoice-dashboard/      # React + Vite frontend
│       └── src/
│           ├── pages/dashboard.tsx    # Main invoice dashboard
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
│           └── invoices.ts
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
- extraction_confidence

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
- `GET /api/invoices` — List all invoices with vendor info
- `POST /api/invoices/process` — Full processing pipeline
- `PATCH /api/invoices/:id/approve` — Approve invoice
- `PATCH /api/invoices/:id/mark-not-duplicate` — Override duplicate flag
- `PATCH /api/invoices/:id/merge-alias` — Merge vendor alias
- `GET /api/vendors` — List vendors with aliases

## Development Commands

- `pnpm --filter @workspace/api-server run dev` — Start API server
- `pnpm --filter @workspace/invoice-dashboard run dev` — Start frontend
- `pnpm --filter @workspace/db run push` — Push schema changes
- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API client + Zod schemas
- `pnpm run typecheck` — Full TypeScript typecheck
