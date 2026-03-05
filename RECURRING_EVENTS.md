# Recurring Events — Implementation & Planning

## Overview

Recurring events let organizers add events that repeat on a schedule (weekly, monthly) instead of one-off dates. Yearly is not supported. **Recurring events are always single-day** (start_date = end_date). The system expands these into individual occurrences for display. **Each series is capped at 12 occurrences maximum.**

- **List & map view:** Show only the **next occurrence** per recurring event (Recurring tag + next date) to avoid clutter
- **Calendar view:** Show all occurrences

---

## What We Support (Current Model)

| Feature | Supported | Notes |
|---------|-----------|-------|
| **Frequency** | Weekly, Monthly | Uses the start date's day of week (weekly) or ordinal+weekday for monthly |
| **Interval** | Yes | e.g. "every 2 weeks", "every 3 months" |
| **End date (until)** | Yes | Optional; expansion stops at `recurrence_until` |
| **Max occurrences** | Yes | **Hard cap of 12** per series |
| **Day-of-month (monthly)** | Yes | e.g. "3rd Sunday of every month", "last Friday of every 3 months" |
| **Daily** | No | Not implemented |
| **Specific weekdays** | No | e.g. "every Tuesday and Thursday" — not supported |
| **Count (N occurrences)** | No | e.g. "repeat 10 times" — use `recurrence_until` instead |
| **Exception dates** | No | Skip specific dates — not supported |

---

## Monthly Recurrence (Day-of-Week Only)

Monthly recurring events always use a **day-of-week** pattern (e.g. 3rd Sunday of every month). Same-date-each-month (e.g. 15th) is not supported.

### Options
- **Ordinal:** 1st, 2nd, 3rd, 4th, or Last
- **Weekday:** Sunday through Saturday
- **Interval:** Every month, or every N months

### Examples
- "3rd Sunday of every month" → `recurrence_monthly_by: 'weekday'`, `recurrence_ordinal: 3`, `recurrence_weekday: 0`
- "Last Friday of every 3 months" → same + `recurrence_interval: 3`

---

## Recurrence Models We Do *Not* Accommodate

### 1. **Daily recurrence**
- Example: "Every day for a week"
- **Workaround:** Add multiple one-time events or use weekly with a 1-day duration

### 2. **Multi-day weekly (BYDAY)**
- Example: "Every Tuesday and Thursday"
- **Current behavior:** Only repeats on the start date's weekday
- **Workaround:** Create two separate recurring events

### 3. **Count-based end**
- Example: "Repeat 10 times"
- **Current behavior:** Only supports end date (`recurrence_until`); max 12 occurrences
- **Workaround:** Set `recurrence_until` to the date of the 10th occurrence

### 4. **Exception dates (EXDATE)**
- Example: "Every Tuesday except Dec 25"
- **Current behavior:** Not supported
- **Workaround:** None

### 5. **Complex iCalendar-style rules**
- Full RRULE (e.g. `FREQ=WEEKLY;BYDAY=MO,WE,FR;INTERVAL=2`) is not supported
- We use a simplified subset

---

## Technical Implementation Summary

### Data model
- `recurrence_frequency`: `'weekly' | 'monthly' | null`
- `recurrence_interval`: integer (default 1)
- `recurrence_until`: date or null
- `recurrence_ordinal`: 1–4 (1st–4th), 5 (last) — required for monthly
- `recurrence_weekday`: 0–6 (Sunday=0) — required for monthly
- `start_time`, `end_time`: optional "HH:MM" (recurring events are single-day only)

### Expansion logic
- One-time events → single occurrence
- Recurring events → expanded up to **12 occurrences** or `recurrence_until`, whichever comes first
- Monthly-by-weekday: uses `getNthWeekdayOfMonth()` to compute e.g. 3rd Sunday of each month
- Uses `date-fns` for date math

### Display
- Lists and calendars show expanded occurrences (each date as a separate row/card)
- Map shows one marker per event (deduped by venue)
- Event detail page shows recurrence description (e.g. "3rd Sunday of every month")

---

## Future Enhancements (If Needed)

| Enhancement | Effort | Use case |
|-------------|--------|----------|
| Daily recurrence | Low | Short daily events |
| BYDAY (multi-day weekly) | Medium | "Every Tue & Thu" |
| Count-based end | Low | "Repeat N times" |
| Exception dates | Medium | Skip holidays |
| Full RRULE support | High | Calendar app parity |

---

## Files Touched

- `add-events-recurrence.sql` — DB migration
- `lib/types.ts` — Event & EventFormData
- `lib/utils.ts` — `expandRecurringEvents`, `formatRecurrenceDescription`, `getNthWeekdayOfMonth`, `MAX_RECURRENCE_OCCURRENCES`
- `app/add-event/page.tsx` — Recurrence form fields (including day-of-month UI)
- `app/events/page.tsx` — Expansion and filtering
- `app/event/[permalink]/EventDetailClient.tsx` — Recurrence display
- `app/page.tsx` — Homepage expansion and display
