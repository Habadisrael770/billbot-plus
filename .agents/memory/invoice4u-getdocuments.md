---
name: Invoice4U GetDocuments API quirks
description: Non-obvious behavior of the Invoice4U GetDocuments endpoint that caused a false "empty account" bug.
---

# Invoice4U GetDocuments contract

Endpoint: `https://api.invoice4u.co.il/Services/ApiService.svc/GetDocuments`.
Request body MUST be `{ dr: { Token, FromDate, ToDate, PageNumber, PageSize, DocumentType }, token }`.

## Quirks that bite

- **`DocumentType` is REQUIRED.** Omitting it makes the API return `{"d":null}`, which
  reads as a false "empty account". Loop over the needed types explicitly
  (income 1,2,3,6 / expense 8,9) and merge.
- **The API IGNORES `FromDate`/`ToDate`/`PageSize` entirely.** Every call returns the
  same full set regardless of range (verified by probing multiple ranges → identical
  count + identical min/max dates). **Client-side date filtering is mandatory** — never
  trust the API to honor the requested window.
- **The document `ID` field is a GUID string** (e.g. `"70db8846-f3f2-..."`), NOT a number.
  Parsing it with `Number(id) || 0` collapses every doc to `0`; any dedup-by-id then
  throws away all but one record. Keep IDs as strings; dedup with `Set<string>` and a
  `num:<DocumentNumber>` fallback.
- Dates come back as `/Date(<ms>+0300)/`; parse the ms with a regex.

**Why:** all three quirks together produced a dashboard that looked like an empty Invoice4U
account when the account actually had hundreds of documents. The root cause was the GUID-vs-number
ID bug; the date-param-ignored quirk is why client-side filtering can't be removed.

**How to apply:** when touching `artifacts/api-server/src/services/invoice4uService.ts`, keep
`I4UDocument.ID` typed as string, keep the per-type fetch loop, and keep the client-side date
filter in `getDocuments`.
