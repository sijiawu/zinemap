"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { RelativeDateWithTooltip } from "@/components/RelativeDateWithTooltip"
import { summarizeEditSummary } from "@/lib/editSummary"

type EntityType = "store" | "library" | "event"

type Submitter = {
  display_name: string | null
  permalink: string | null
}

type HistoryEdit = {
  id: string
  created_at: string
  edit_summary: string
  user_id: string
  display_name: string | null
  permalink: string | null
}

export type EntityEditHistoryProps = {
  entityType: EntityType
  entityId: string
  createdAt: string
  submitter?: Submitter | null
}

function CreditName({ name, permalink }: { name: string | null; permalink: string | null }) {
  if (!name) return null
  if (permalink) {
    return (
      <Link href={`/profile/${permalink}`} className="font-medium text-stone-600 hover:text-stone-800 underline decoration-stone-300 hover:decoration-stone-500">
        {name}
      </Link>
    )
  }
  return <span className="font-medium text-stone-600">{name}</span>
}

export function EntityEditHistory({
  entityType,
  entityId,
  createdAt,
  submitter = null,
}: EntityEditHistoryProps) {
  const [edits, setEdits] = useState<HistoryEdit[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchEdits = async () => {
      if (!entityId) {
        setEdits([])
        setLoaded(true)
        return
      }

      try {
        const fk =
          entityType === "store"
            ? "store_id"
            : entityType === "library"
              ? "library_id"
              : "event_id"

        const { data: editRows, error } = await supabase
          .from("locale_edits")
          .select("id, user_id, edit_summary, created_at, status")
          .eq(fk, entityId)
          .in("status", ["approved", "addressed"])
          .order("created_at", { ascending: false })
          .limit(5)

        if (error || !editRows?.length) {
          if (!cancelled) {
            setEdits([])
            setLoaded(true)
          }
          return
        }

        const userIds = [...new Set(editRows.map((row) => row.user_id).filter(Boolean))]
        const profileMap = new Map<string, { display_name: string | null; permalink: string | null }>()

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name, permalink")
            .in("id", userIds)

          for (const profile of profiles || []) {
            profileMap.set(profile.id, {
              display_name: profile.display_name ?? null,
              permalink: profile.permalink ?? null,
            })
          }
        }

        if (cancelled) return

        setEdits(
          editRows.map((row) => {
            const profile = profileMap.get(row.user_id)
            return {
              id: row.id,
              created_at: row.created_at,
              edit_summary: row.edit_summary || "",
              user_id: row.user_id,
              display_name: profile?.display_name ?? null,
              permalink: profile?.permalink ?? null,
            }
          })
        )
      } catch {
        if (!cancelled) setEdits([])
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }

    setLoaded(false)
    fetchEdits()

    return () => {
      cancelled = true
    }
  }, [entityType, entityId])

  if (!loaded && !submitter) return null
  if (loaded && edits.length === 0 && !submitter) return null

  return (
    <div className="text-center pt-6">
      <div className="max-w-lg w-full mx-auto text-left space-y-3">
        <h3 className="text-sm font-medium text-stone-500 tracking-wide">Page history</h3>
        <ul className="space-y-2.5 text-sm text-stone-500">
          {edits.map((edit) => {
            const summary = summarizeEditSummary(edit.edit_summary)
            return (
              <li key={edit.id} className="leading-snug">
                <div>
                  Edited
                  {edit.display_name ? (
                    <>
                      {" by "}
                      <CreditName name={edit.display_name} permalink={edit.permalink} />
                    </>
                  ) : null}
                  <RelativeDateWithTooltip dateString={edit.created_at} prefix=" · " />
                </div>
                {summary ? (
                  <div className="text-xs text-stone-400 mt-0.5">{summary}</div>
                ) : null}
              </li>
            )
          })}
          {submitter ? (
            <li className="leading-snug">
              Added
              {submitter.display_name ? (
                <>
                  {" by "}
                  <CreditName name={submitter.display_name} permalink={submitter.permalink} />
                </>
              ) : null}
              {createdAt ? <RelativeDateWithTooltip dateString={createdAt} prefix=" · " /> : null}
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  )
}
