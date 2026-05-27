"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  generateOccurrenceDatesFromRule,
  getRecurrenceRuleSignature,
  normalizeOccurrenceDates,
  type RecurrenceRuleInput,
} from "@/lib/utils"

type UseOccurrenceDateSelectionOptions = {
  /** When false, clears dates and skips rule sync */
  enabled: boolean
  rule: RecurrenceRuleInput | null
  /** Initial dates (e.g. from DB on edit) */
  initialDates?: string[]
}

export function useOccurrenceDateSelection({
  enabled,
  rule,
  initialDates,
}: UseOccurrenceDateSelectionOptions) {
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [datesDirty, setDatesDirty] = useState(false)
  const [showRegenerateWarning, setShowRegenerateWarning] = useState(false)
  const [pendingRuleSignature, setPendingRuleSignature] = useState<string | null>(null)
  const lastRuleSignatureRef = useRef<string | null>(null)
  const initializedRef = useRef(false)

  const applyGeneratedDates = useCallback((dates: string[]) => {
    setSelectedDates(normalizeOccurrenceDates(dates))
    setDatesDirty(false)
  }, [])

  const regenerateFromRule = useCallback(() => {
    if (!rule) return
    applyGeneratedDates(generateOccurrenceDatesFromRule(rule))
    lastRuleSignatureRef.current = getRecurrenceRuleSignature(rule)
  }, [rule, applyGeneratedDates])

  const initialDatesKey = initialDates?.join(",") ?? ""

  // Load initial dates from DB when provided (e.g. edit page async load)
  useEffect(() => {
    if (!enabled || !initialDatesKey) return
    const parsed = initialDatesKey.split(",").filter(Boolean)
    if (parsed.length >= 2) {
      applyGeneratedDates(parsed)
      initializedRef.current = true
      if (rule) lastRuleSignatureRef.current = getRecurrenceRuleSignature(rule)
    }
  }, [enabled, initialDatesKey, applyGeneratedDates, rule])

  // Enable recurring: generate when rule is ready and no dates yet
  useEffect(() => {
    if (!enabled || !rule?.start_date || !rule.recurrence_frequency) return
    const sig = getRecurrenceRuleSignature(rule)
    if (lastRuleSignatureRef.current === null) {
      if (selectedDates.length === 0) {
        regenerateFromRule()
      } else {
        lastRuleSignatureRef.current = sig
      }
      initializedRef.current = true
      return
    }
    if (sig === lastRuleSignatureRef.current) return

    if (datesDirty) {
      setPendingRuleSignature(sig)
      setShowRegenerateWarning(true)
      return
    }

    regenerateFromRule()
  }, [enabled, rule, datesDirty, selectedDates.length, regenerateFromRule])

  const handleDatesChange = useCallback((dates: string[]) => {
    setSelectedDates(normalizeOccurrenceDates(dates))
    setDatesDirty(true)
  }, [])

  const confirmRegenerate = useCallback(() => {
    if (rule) {
      applyGeneratedDates(generateOccurrenceDatesFromRule(rule))
      lastRuleSignatureRef.current = pendingRuleSignature ?? getRecurrenceRuleSignature(rule)
    }
    setPendingRuleSignature(null)
    setShowRegenerateWarning(false)
  }, [rule, pendingRuleSignature, applyGeneratedDates])

  const cancelRegenerate = useCallback(() => {
    if (pendingRuleSignature) {
      lastRuleSignatureRef.current = pendingRuleSignature
    }
    setPendingRuleSignature(null)
    setShowRegenerateWarning(false)
  }, [pendingRuleSignature])

  const resetForOneTime = useCallback(() => {
    setSelectedDates([])
    setDatesDirty(false)
    lastRuleSignatureRef.current = null
    initializedRef.current = false
    setShowRegenerateWarning(false)
    setPendingRuleSignature(null)
  }, [])

  return {
    selectedDates,
    setSelectedDates: handleDatesChange,
    datesDirty,
    showRegenerateWarning,
    confirmRegenerate,
    cancelRegenerate,
    resetForOneTime,
    regenerateFromRule,
  }
}
