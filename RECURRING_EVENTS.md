# Recurring Events

## Overview

Recurring events are stored as an explicit **`occurrence_dates`** array on `public.events` (max 12 dates). One-time events have `occurrence_dates` NULL. Series have length >= 2.

- **List & map:** Next occurrence only per series
- **Calendar:** All occurrences

## Create / edit UI

Weekly/monthly controls on `/add-event` and suggest-edit are a **generator only** — they produce dates for the calendar picker; rules are **not** saved to the database.

## Database

| Column | Purpose |
|--------|---------|
| `occurrence_dates DATE[]` | Source of truth for series |
| `start_date` / `end_date` | Earliest occurrence for series; range for one-time |

Legacy `recurrence_*` columns are removed after backfill (see migrations below).

## Migrations (run in order)

1. [`add-events-occurrence-dates.sql`](add-events-occurrence-dates.sql) — add column
2. Deploy app code that reads `occurrence_dates`
3. Backfill + null legacy rules — **SQL (recommended)** or Node:
   - [`backfill-occurrence-dates.sql`](backfill-occurrence-dates.sql) — run preview `SELECT` first, then full file in Supabase SQL editor
   - [`scripts/backfill-occurrence-dates.mjs`](scripts/backfill-occurrence-dates.mjs) — alternative (`--dry-run` first); needs service role env vars
4. Verify in SQL:

```sql
SELECT id, name FROM public.events WHERE recurrence_frequency IS NOT NULL;
SELECT id, name, occurrence_dates FROM public.events
WHERE occurrence_dates IS NOT NULL AND cardinality(occurrence_dates) < 2;
```

Both should return 0 rows before step 5.

5. [`drop-events-recurrence-columns.sql`](drop-events-recurrence-columns.sql) — drop legacy columns
6. Deploy app code without legacy selects/read paths

## Key files

- `lib/utils.ts` — `expandRecurringEvents`, `generateOccurrenceDatesFromRule`, `isRecurringEvent`
- `components/OccurrenceDatePicker.tsx`, `hooks/useOccurrenceDateSelection.ts`
- `scripts/backfill-occurrence-dates.mjs`
