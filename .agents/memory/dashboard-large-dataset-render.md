---
name: Dashboard/expenses large-dataset render freeze
description: Why the invoice-dashboard froze on mobile with many invoices, and the render-cap fix
---

# Symptom
On mobile the home page (and expenses page) becomes completely unresponsive — clicks do nothing — once the dataset is large (observed with ~14k invoices). Login page is fine; freeze happens only after auth when the lists render.

# Root cause
`useInvoices()` (GET /api/invoices) returns the FULL invoice set unpaginated, and the pages render every row with `.map(...)`. The default date preset is `"all"`, so nothing is filtered out on load. Worse: the mobile card list and the desktop table are BOTH mounted in the DOM (only hidden via `hidden sm:block` / `block sm:hidden`), so the browser builds ~2× the row count in DOM nodes. With thousands of rows this hangs the main thread.

# Fix applied
Client-side render cap (pagination) in `dashboard.tsx` and `expenses.tsx`: keep a `visibleCount` (PAGE_SIZE 50), slice the filtered array to `visible`, render only that, and show a "טען עוד" (load more) button that bumps the count. Reset `visibleCount` when filters/search/date-range change. Summary cards/totals still compute over the full filtered array (cheap arithmetic) — only the DOM render is capped.

**Why:** arithmetic over 14k objects is fast; mounting 14k+ DOM nodes is what freezes mobile. Capping the render is enough to unfreeze without touching the API or stats.

# Follow-up worth considering
Server-side pagination on GET /api/invoices would also cut the multi-MB JSON payload, but that touches the generated api-client and the client-side summary computation — larger change, deferred.
