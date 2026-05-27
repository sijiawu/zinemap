#!/usr/bin/env node
/**
 * Backfill events.occurrence_dates from legacy recurrence_* columns, then null rule columns.
 *
 * Usage:
 *   node scripts/backfill-occurrence-dates.mjs           # live run
 *   node scripts/backfill-occurrence-dates.mjs --dry-run # preview only
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (recommended)
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { addMonths, addWeeks, addYears, endOfMonth, format, isBefore, parseISO } from 'date-fns'

const MAX_OCCURRENCES = 12
const dryRun = process.argv.includes('--dry-run')

const NULL_RULES = {
  recurrence_frequency: null,
  recurrence_interval: null,
  recurrence_until: null,
  recurrence_ordinal: null,
  recurrence_weekday: null,
}

function getNthWeekdayOfMonth(year, month, weekday, ordinal) {
  const last = endOfMonth(new Date(year, month, 1))
  const lastDay = last.getDate()
  if (ordinal === 5) {
    for (let d = lastDay; d >= 1; d--) {
      const date = new Date(year, month, d)
      if (date.getDay() === weekday) return date
    }
  } else {
    let count = 0
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d)
      if (date.getDay() === weekday) {
        count++
        if (count === ordinal) return date
      }
    }
  }
  return last
}

function expandLegacyEvent(event) {
  const freq = event.recurrence_frequency
  if (!freq) return null

  const interval = event.recurrence_interval ?? 1
  const startDate = parseISO(event.start_date)
  const untilDate = event.recurrence_until ? parseISO(event.recurrence_until) : null
  const ordinal = event.recurrence_ordinal ?? 3
  const weekday = event.recurrence_weekday ?? 0

  let currentStart
  if (freq === 'monthly' && ordinal >= 1 && ordinal <= 5) {
    currentStart = getNthWeekdayOfMonth(startDate.getFullYear(), startDate.getMonth(), weekday, ordinal)
  } else {
    currentStart = startDate
  }

  const dates = []
  const oneYearFromStart = addYears(currentStart, 1)
  let count = 0

  while (count < MAX_OCCURRENCES) {
    if (untilDate && isBefore(untilDate, currentStart)) break
    if (isBefore(oneYearFromStart, currentStart)) break

    dates.push(format(currentStart, 'yyyy-MM-dd'))
    count++

    if (freq === 'weekly') {
      currentStart = addWeeks(currentStart, interval)
    } else if (freq === 'monthly') {
      if (ordinal >= 1 && ordinal <= 5) {
        let y = currentStart.getFullYear()
        let m = currentStart.getMonth()
        m += interval
        if (m > 11) {
          y += Math.floor(m / 12)
          m = m % 12
        }
        currentStart = getNthWeekdayOfMonth(y, m, weekday, ordinal)
      } else {
        currentStart = addMonths(currentStart, interval)
      }
    } else {
      break
    }
  }

  return dates.length >= 2 ? dates : null
}

function hasLegacyRules(event) {
  return event.recurrence_frequency != null
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (recommended)')
  process.exit(1)
}

const supabase = createClient(url, key)

const { data: events, error } = await supabase
  .from('events')
  .select('id, name, start_date, recurrence_frequency, recurrence_interval, recurrence_until, recurrence_ordinal, recurrence_weekday, occurrence_dates')

if (error) {
  console.error('Fetch failed:', error)
  process.exit(1)
}

const stats = {
  backfilled: 0,
  cleanedRulesOnly: 0,
  skipped: 0,
  failed: [],
}

for (const event of events ?? []) {
  const hasDates = event.occurrence_dates?.length >= 2
  const hasRules = hasLegacyRules(event)

  if (hasDates && !hasRules) {
    stats.skipped++
    continue
  }

  if (hasDates && hasRules) {
    if (dryRun) {
      console.log(`[dry-run] Would null recurrence_* for ${event.id} (${event.name})`)
      stats.cleanedRulesOnly++
      continue
    }
    const { error: upErr } = await supabase.from('events').update(NULL_RULES).eq('id', event.id)
    if (upErr) {
      stats.failed.push({ id: event.id, name: event.name, reason: upErr.message })
    } else {
      stats.cleanedRulesOnly++
      console.log(`Nulled recurrence_* for ${event.id}`)
    }
    continue
  }

  if (!hasRules) continue

  const dates = expandLegacyEvent(event)
  if (!dates || dates.length < 2) {
    stats.failed.push({
      id: event.id,
      name: event.name,
      reason: dates?.length === 1 ? 'only 1 date expanded' : 'could not expand',
    })
    continue
  }

  if (dryRun) {
    console.log(`[dry-run] Would backfill ${event.id}: ${dates.length} dates`)
    stats.backfilled++
    continue
  }

  const { error: upErr } = await supabase
    .from('events')
    .update({ occurrence_dates: dates, ...NULL_RULES })
    .eq('id', event.id)

  if (upErr) {
    stats.failed.push({ id: event.id, name: event.name, reason: upErr.message })
  } else {
    stats.backfilled++
    console.log(`Backfilled ${event.id}: ${dates.length} dates`)
  }
}

console.log('\n--- Summary ---')
console.log(`Mode: ${dryRun ? 'dry-run' : 'live'}`)
console.log(`Backfilled: ${stats.backfilled}`)
console.log(`Cleaned rules only: ${stats.cleanedRulesOnly}`)
console.log(`Skipped (already clean): ${stats.skipped}`)
console.log(`Failed: ${stats.failed.length}`)

if (stats.failed.length > 0) {
  const reportPath = 'scripts/backfill-occurrence-dates-failed.json'
  if (!dryRun) {
    writeFileSync(reportPath, JSON.stringify(stats.failed, null, 2))
    console.log(`Wrote ${reportPath}`)
  }
  for (const f of stats.failed) {
    console.error(`  ${f.id} (${f.name}): ${f.reason}`)
  }
  process.exit(1)
}
