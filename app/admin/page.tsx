"use client"

import { useEffect, useState } from "react"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Flag,
  Wrench,
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Event, Library, Store, Tag } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  expandRecurringEvents,
  formatDateReadable,
  formatRecurrenceDescription,
  getEventCategoryDisplay,
  isRecurringEvent,
  normalizeOccurrenceDates,
  getTagCategoryDisplay,
} from "@/lib/utils"
import { PageLoader } from "@/components/loading/PageLoader"

type ListingType = "store" | "library" | "event"
type ModerationStatus = "pending" | "approved" | "flagged"
type ReviewAction = "approve" | "quick_fix" | "flag"

type StoreWithTags = Store & {
  moderation_status?: ModerationStatus
  admin_note?: string | null
  moderated_by?: string | null
  moderated_at?: string | null
  review_action?: ReviewAction | null
  store_tags?: Array<{
    tag_id: string
    tags?: Tag | null
    tag?: Tag | null
  }>
}

type LibraryWithTags = Library & {
  moderation_status?: ModerationStatus
  admin_note?: string | null
  moderated_by?: string | null
  moderated_at?: string | null
  review_action?: ReviewAction | null
  library_tags?: Array<{
    tag_id: string
    tags?: Tag | null
    tag?: Tag | null
  }>
}

type EventWithModeration = Event & {
  moderation_status?: ModerationStatus
  admin_note?: string | null
  moderated_by?: string | null
  moderated_at?: string | null
  review_action?: ReviewAction | null
}

type ModerationHistoryItem = {
  id: string
  listingType: ListingType
  name: string
  city: string
  state?: string | null
  country: string
  permalink?: string | null
  address?: string | null
  email?: string | null
  website?: string | null
  notes?: string | null
  start_date?: string | null
  end_date?: string | null
  moderated_at?: string | null
  moderated_by?: string | null
  review_action?: ReviewAction | null
  admin_note?: string | null
  created_at?: string | null
}

type LocaleEditRow = {
  id: string
  store_id?: string | null
  library_id?: string | null
  event_id?: string | null
  user_id: string
  edit_summary: string
  edit_payload?: Record<string, unknown> | null
  created_at: string
  stores?: { name?: string; city?: string; country?: string } | null
  libraries?: { name?: string; city?: string; country?: string } | null
  events?: { name?: string; city?: string; country?: string } | null
}

type StoreQuickFixForm = {
  name: string
  city: string
  state: string
  country: string
  address: string
  email: string
  website: string
  notes: string
  selectedTagIds: string[]
  adminNote: string
}

type LibraryQuickFixForm = {
  name: string
  city: string
  state: string
  country: string
  address: string
  email: string
  website: string
  notes: string
  selectedTagIds: string[]
  adminNote: string
}

type EventQuickFixForm = {
  name: string
  venue_name: string
  city: string
  state: string
  country: string
  address: string
  email: string
  website: string
  social: string
  category: "festival" | "swap" | "workshop"
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  application_open: string
  application_deadline: string
  notes: string
  occurrence_dates: string
  poster_image: string
  adminNote: string
}

const getListingKey = (listingType: ListingType, id: string) => `${listingType}:${id}`
const toShortId = (id?: string | null) => (id ? `${id.slice(0, 8)}...` : "N/A")

const getStoreTagLabels = (store: StoreWithTags) =>
  (store.store_tags || [])
    .map((item) => (item as { tags?: Tag | null; tag?: Tag | null }).tags?.label || item.tag?.label)
    .filter((label): label is string => Boolean(label))

const getLibraryTagLabels = (library: LibraryWithTags) =>
  (library.library_tags || [])
    .map((item) => (item as { tags?: Tag | null; tag?: Tag | null }).tags?.label || item.tag?.label)
    .filter((label): label is string => Boolean(label))

const listingLabel = (listingType: ListingType) => {
  if (listingType === "store") return "Store"
  if (listingType === "library") return "Library"
  return "Event"
}

const getListingHref = (item: ModerationHistoryItem) => {
  if (item.listingType === "store") return `/store/${item.permalink || item.id}`
  if (item.listingType === "library") return `/library/${item.permalink || item.id}`
  return `/event/${item.permalink || item.id}`
}

const STORE_TAG_CATEGORIES = ["shop_type", "split", "payment", "method", "limits", "pricing", "returns"]
const LIBRARY_TAG_CATEGORIES = ["library_type", "service", "access"]

export default function AdminPage() {
  const { user, loading } = useSupabaseUser()
  const router = useRouter()

  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  const [activeTab, setActiveTab] = useState("stores")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [pendingStores, setPendingStores] = useState<StoreWithTags[]>([])
  const [pendingLibraries, setPendingLibraries] = useState<LibraryWithTags[]>([])
  const [pendingEvents, setPendingEvents] = useState<EventWithModeration[]>([])

  const [recentApproved, setRecentApproved] = useState<ModerationHistoryItem[]>([])
  const [recentFlagged, setRecentFlagged] = useState<ModerationHistoryItem[]>([])

  const [storeEdits, setStoreEdits] = useState<LocaleEditRow[]>([])
  const [libraryEdits, setLibraryEdits] = useState<LocaleEditRow[]>([])
  const [eventEdits, setEventEdits] = useState<LocaleEditRow[]>([])

  const [loadingStores, setLoadingStores] = useState(false)
  const [loadingLibraries, setLoadingLibraries] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [loadingApproved, setLoadingApproved] = useState(false)
  const [loadingFlagged, setLoadingFlagged] = useState(false)
  const [loadingStoreEdits, setLoadingStoreEdits] = useState(false)
  const [loadingLibraryEdits, setLoadingLibraryEdits] = useState(false)
  const [loadingEventEdits, setLoadingEventEdits] = useState(false)

  const [processingListingKey, setProcessingListingKey] = useState<string | null>(null)
  const [flagNotes, setFlagNotes] = useState<Record<string, string>>({})

  const [allTags, setAllTags] = useState<Tag[]>([])
  const [quickFixOpen, setQuickFixOpen] = useState(false)
  const [quickFixTarget, setQuickFixTarget] = useState<{ listingType: ListingType; id: string } | null>(null)

  const [storeQuickFix, setStoreQuickFix] = useState<StoreQuickFixForm>({
    name: "",
    city: "",
    state: "",
    country: "",
    address: "",
    email: "",
    website: "",
    notes: "",
    selectedTagIds: [],
    adminNote: "",
  })
  const [libraryQuickFix, setLibraryQuickFix] = useState<LibraryQuickFixForm>({
    name: "",
    city: "",
    state: "",
    country: "",
    address: "",
    email: "",
    website: "",
    notes: "",
    selectedTagIds: [],
    adminNote: "",
  })
  const [eventQuickFix, setEventQuickFix] = useState<EventQuickFixForm>({
    name: "",
    venue_name: "",
    city: "",
    state: "",
    country: "",
    address: "",
    email: "",
    website: "",
    social: "",
    category: "festival",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    application_open: "",
    application_deadline: "",
    notes: "",
    occurrence_dates: "",
    poster_image: "",
    adminNote: "",
  })

  const [processingStoreEdit, setProcessingStoreEdit] = useState<string | null>(null)
  const [processingLibraryEdit, setProcessingLibraryEdit] = useState<string | null>(null)
  const [processingEventEdit, setProcessingEventEdit] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [loading, router, user])

  useEffect(() => {
    const fetchAdminStatus = async () => {
      if (!user?.id) {
        setIsAdmin(false)
        setCheckingAdmin(false)
        return
      }
      setCheckingAdmin(true)
      const { data, error: adminError } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
      if (adminError) {
        console.error("Failed to read admin role:", adminError)
        setIsAdmin(false)
      } else {
        setIsAdmin(Boolean(data?.is_admin))
      }
      setCheckingAdmin(false)
    }
    fetchAdminStatus()
  }, [user?.id])

  const fetchTags = async () => {
    const { data, error: tagsError } = await supabase.from("tags").select("*").order("label")
    if (tagsError) {
      console.error("Failed to load tags:", tagsError)
      setError("Failed to load tags")
      return
    }
    setAllTags((data || []) as Tag[])
  }

  const fetchPendingStores = async () => {
    setLoadingStores(true)
    const { data, error: pendingError } = await supabase
      .from("stores")
      .select(
        `
        *,
        store_tags(
          tag_id,
          tags(id, label, category)
        )
      `
      )
      .eq("moderation_status", "pending")
      .order("created_at", { ascending: false })
    if (pendingError) {
      console.error("Failed to load pending stores:", pendingError)
      setError("Failed to load pending stores")
      setLoadingStores(false)
      return
    }
    setPendingStores((data || []) as StoreWithTags[])
    setLoadingStores(false)
  }

  const fetchPendingLibraries = async () => {
    setLoadingLibraries(true)
    const { data, error: pendingError } = await supabase
      .from("libraries")
      .select(
        `
        *,
        library_tags(
          tag_id,
          tags(id, label, category)
        )
      `
      )
      .eq("moderation_status", "pending")
      .order("created_at", { ascending: false })
    if (pendingError) {
      console.error("Failed to load pending libraries:", pendingError)
      setError("Failed to load pending libraries")
      setLoadingLibraries(false)
      return
    }
    setPendingLibraries((data || []) as LibraryWithTags[])
    setLoadingLibraries(false)
  }

  const fetchPendingEvents = async () => {
    setLoadingEvents(true)
    const { data, error: pendingError } = await supabase
      .from("events")
      .select("*")
      .eq("moderation_status", "pending")
      .order("created_at", { ascending: false })
    if (pendingError) {
      console.error("Failed to load pending events:", pendingError)
      setError("Failed to load pending events")
      setLoadingEvents(false)
      return
    }
    setPendingEvents((data || []) as EventWithModeration[])
    setLoadingEvents(false)
  }

  const fetchRecentModeration = async (status: ModerationStatus) => {
    const setLoading = status === "approved" ? setLoadingApproved : setLoadingFlagged
    const setData = status === "approved" ? setRecentApproved : setRecentFlagged
    setLoading(true)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoIso = sevenDaysAgo.toISOString()

    const buildHistoryQuery = (table: "stores" | "libraries" | "events") => {
      const baseSelect = "id, name, city, state, country, address, email, website, notes, permalink, moderated_at, moderated_by, review_action, admin_note, created_at"
      const selectColumns =
        table === "events"
          ? `${baseSelect}, start_date, end_date`
          : baseSelect

      let query = supabase
        .from(table)
        .select(selectColumns)
        .eq("moderation_status", status)
        .order("moderated_at", { ascending: false })

      if (status === "approved") {
        query = query.gte("moderated_at", sevenDaysAgoIso).limit(50)
      }

      return query
    }

    const [storesRes, librariesRes, eventsRes] = await Promise.all([
      buildHistoryQuery("stores"),
      buildHistoryQuery("libraries"),
      buildHistoryQuery("events"),
    ])

    const historyErrors = [storesRes.error, librariesRes.error, eventsRes.error].filter(Boolean)
    if (historyErrors.length > 0) {
      console.error(`Failed to load recent ${status} listings:`, historyErrors)
      setError(`Failed to load recently ${status} listings`)
      setLoading(false)
      return
    }

    const stores = ((storesRes.data || []) as any[]).map(
      (item): ModerationHistoryItem => ({
        ...item,
        listingType: "store",
      })
    )
    const libraries = ((librariesRes.data || []) as any[]).map(
      (item): ModerationHistoryItem => ({
        ...item,
        listingType: "library",
      })
    )
    const events = ((eventsRes.data || []) as any[]).map(
      (item): ModerationHistoryItem => ({
        ...item,
        listingType: "event",
      })
    )

    const merged = [...stores, ...libraries, ...events].sort((a, b) => {
      const dateA = a.moderated_at || a.created_at || ""
      const dateB = b.moderated_at || b.created_at || ""
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })

    setData(status === "approved" ? merged.slice(0, 50) : merged)
    setLoading(false)
  }

  const fetchStoreEdits = async () => {
    setLoadingStoreEdits(true)
    const { data, error: editsError } = await supabase
      .from("locale_edits")
      .select(
        `
        *,
        stores!inner(name, city, country)
      `
      )
      .eq("status", "pending")
      .not("store_id", "is", null)
      .order("created_at", { ascending: false })
    if (editsError) {
      console.error("Failed to load store edits:", editsError)
      setError("Failed to load store edits")
      setLoadingStoreEdits(false)
      return
    }
    setStoreEdits((data || []) as LocaleEditRow[])
    setLoadingStoreEdits(false)
  }

  const fetchLibraryEdits = async () => {
    setLoadingLibraryEdits(true)
    const { data, error: editsError } = await supabase
      .from("locale_edits")
      .select(
        `
        *,
        libraries!inner(name, city, country)
      `
      )
      .eq("status", "pending")
      .not("library_id", "is", null)
      .order("created_at", { ascending: false })
    if (editsError) {
      console.error("Failed to load library edits:", editsError)
      setError("Failed to load library edits")
      setLoadingLibraryEdits(false)
      return
    }
    setLibraryEdits((data || []) as LocaleEditRow[])
    setLoadingLibraryEdits(false)
  }

  const fetchEventEdits = async () => {
    setLoadingEventEdits(true)
    const { data, error: editsError } = await supabase
      .from("locale_edits")
      .select(
        `
        *,
        events!inner(name, city, country)
      `
      )
      .eq("status", "pending")
      .not("event_id", "is", null)
      .order("created_at", { ascending: false })
    if (editsError) {
      console.error("Failed to load event edits:", editsError)
      setError("Failed to load event edits")
      setLoadingEventEdits(false)
      return
    }
    setEventEdits((data || []) as LocaleEditRow[])
    setLoadingEventEdits(false)
  }

  const fetchEverything = async () => {
    setError(null)
    await Promise.all([
      fetchTags(),
      fetchPendingStores(),
      fetchPendingLibraries(),
      fetchPendingEvents(),
      fetchRecentModeration("approved"),
      fetchRecentModeration("flagged"),
      fetchStoreEdits(),
      fetchLibraryEdits(),
      fetchEventEdits(),
    ])
  }

  useEffect(() => {
    if (isAdmin) {
      fetchEverything()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  const removePendingListingLocally = (listingType: ListingType, id: string) => {
    if (listingType === "store") {
      setPendingStores((prev) => prev.filter((item) => item.id !== id))
      return
    }
    if (listingType === "library") {
      setPendingLibraries((prev) => prev.filter((item) => item.id !== id))
      return
    }
    setPendingEvents((prev) => prev.filter((item) => item.id !== id))
  }

  const handleApproveListing = async (listingType: ListingType, id: string) => {
    if (!user?.id) return
    const listingKey = getListingKey(listingType, id)
    setProcessingListingKey(listingKey)
    setError(null)
    setSuccess(null)

    const table = listingType === "store" ? "stores" : listingType === "library" ? "libraries" : "events"
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from(table)
      .update({
        approved: true,
        moderation_status: "approved",
        review_action: "approve",
        moderated_by: user.id,
        moderated_at: now,
        updated_at: now,
      })
      .eq("id", id)

    if (updateError) {
      console.error("Failed to approve listing:", updateError)
      setError(`Failed to approve ${listingLabel(listingType).toLowerCase()}`)
      setProcessingListingKey(null)
      return
    }

    removePendingListingLocally(listingType, id)
    setSuccess(`${listingLabel(listingType)} approved successfully`)
    await fetchRecentModeration("approved")
    setProcessingListingKey(null)
  }

  const handleFlagListing = async (listingType: ListingType, id: string) => {
    if (!user?.id) return
    const listingKey = getListingKey(listingType, id)
    const note = (flagNotes[listingKey] || "").trim()
    if (!note) {
      setError("Flag requires an admin note")
      return
    }

    setProcessingListingKey(listingKey)
    setError(null)
    setSuccess(null)

    const table = listingType === "store" ? "stores" : listingType === "library" ? "libraries" : "events"
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from(table)
      .update({
        approved: false,
        moderation_status: "flagged",
        review_action: "flag",
        admin_note: note,
        moderated_by: user.id,
        moderated_at: now,
        updated_at: now,
      })
      .eq("id", id)

    if (updateError) {
      console.error("Failed to flag listing:", updateError)
      setError(`Failed to flag ${listingLabel(listingType).toLowerCase()}`)
      setProcessingListingKey(null)
      return
    }

    removePendingListingLocally(listingType, id)
    setFlagNotes((prev) => ({ ...prev, [listingKey]: "" }))
    setSuccess(`${listingLabel(listingType)} flagged`)
    await fetchRecentModeration("flagged")
    setProcessingListingKey(null)
  }

  const handleUnapproveListing = async (listingType: ListingType, id: string) => {
    const listingKey = getListingKey(listingType, id)
    setProcessingListingKey(listingKey)
    setError(null)
    setSuccess(null)

    const table = listingType === "store" ? "stores" : listingType === "library" ? "libraries" : "events"
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from(table)
      .update({
        approved: false,
        moderation_status: "pending",
        review_action: null,
        moderated_at: now,
        updated_at: now,
      })
      .eq("id", id)

    if (updateError) {
      console.error("Failed to unapprove listing:", updateError)
      setError(`Failed to unapprove ${listingLabel(listingType).toLowerCase()}`)
      setProcessingListingKey(null)
      return
    }

    setSuccess(`${listingLabel(listingType)} moved back to pending`)
    await Promise.all([
      fetchRecentModeration("approved"),
      fetchPendingStores(),
      fetchPendingLibraries(),
      fetchPendingEvents(),
    ])
    setProcessingListingKey(null)
  }

  const openStoreQuickFix = (store: StoreWithTags) => {
    setQuickFixTarget({ listingType: "store", id: store.id })
    setStoreQuickFix({
      name: store.name || "",
      city: store.city || "",
      state: store.state || "",
      country: store.country || "",
      address: store.address || "",
      email: store.email || "",
      website: store.website || "",
      notes: store.notes || "",
      selectedTagIds: (store.store_tags || []).map((item) => item.tag_id),
      adminNote: store.admin_note || "",
    })
    setQuickFixOpen(true)
  }

  const openLibraryQuickFix = (library: LibraryWithTags) => {
    setQuickFixTarget({ listingType: "library", id: library.id })
    setLibraryQuickFix({
      name: library.name || "",
      city: library.city || "",
      state: library.state || "",
      country: library.country || "",
      address: library.address || "",
      email: library.email || "",
      website: library.website || "",
      notes: library.notes || "",
      selectedTagIds: (library.library_tags || []).map((item) => item.tag_id),
      adminNote: library.admin_note || "",
    })
    setQuickFixOpen(true)
  }

  const openEventQuickFix = (event: EventWithModeration) => {
    setQuickFixTarget({ listingType: "event", id: event.id })
    setEventQuickFix({
      name: event.name || "",
      venue_name: event.venue_name || "",
      city: event.city || "",
      state: event.state || "",
      country: event.country || "",
      address: event.address || "",
      email: event.email || "",
      website: event.website || "",
      social: event.social || "",
      category: event.category || "festival",
      start_date: event.start_date || "",
      end_date: event.end_date || "",
      start_time: event.start_time || "",
      end_time: event.end_time || "",
      application_open: event.application_open || "",
      application_deadline: event.application_deadline || "",
      notes: event.notes || "",
      occurrence_dates: event.occurrence_dates?.length
        ? event.occurrence_dates.join("\n")
        : "",
      poster_image: event.poster_image || "",
      adminNote: event.admin_note || "",
    })
    setQuickFixOpen(true)
  }

  const saveStoreQuickFix = async () => {
    if (!quickFixTarget || !user?.id || quickFixTarget.listingType !== "store") return
    const listingKey = getListingKey("store", quickFixTarget.id)
    setProcessingListingKey(listingKey)
    setError(null)
    setSuccess(null)
    const now = new Date().toISOString()

    const { error: updateError } = await supabase
      .from("stores")
      .update({
        name: storeQuickFix.name,
        city: storeQuickFix.city,
        state: storeQuickFix.state || null,
        country: storeQuickFix.country,
        address: storeQuickFix.address,
        email: storeQuickFix.email || null,
        website: storeQuickFix.website || null,
        notes: storeQuickFix.notes || null,
        admin_note: storeQuickFix.adminNote || null,
        approved: true,
        moderation_status: "approved",
        review_action: "quick_fix",
        moderated_by: user.id,
        moderated_at: now,
        updated_at: now,
      })
      .eq("id", quickFixTarget.id)
    if (updateError) {
      console.error("Failed to quick-fix store:", updateError)
      setError("Failed to save quick fix for store")
      setProcessingListingKey(null)
      return
    }

    const { error: deleteTagError } = await supabase.from("store_tags").delete().eq("store_id", quickFixTarget.id)
    if (deleteTagError) {
      console.error("Failed to clear store tags:", deleteTagError)
      setError("Failed to update store tags")
      setProcessingListingKey(null)
      return
    }

    if (storeQuickFix.selectedTagIds.length > 0) {
      const { error: insertTagError } = await supabase
        .from("store_tags")
        .insert(storeQuickFix.selectedTagIds.map((tagId) => ({ store_id: quickFixTarget.id, tag_id: tagId })))
      if (insertTagError) {
        console.error("Failed to save store tags:", insertTagError)
        setError("Failed to update store tags")
        setProcessingListingKey(null)
        return
      }
    }

    removePendingListingLocally("store", quickFixTarget.id)
    await fetchRecentModeration("approved")
    setQuickFixOpen(false)
    setQuickFixTarget(null)
    setSuccess("Store quick fix saved and approved")
    setProcessingListingKey(null)
  }

  const saveLibraryQuickFix = async () => {
    if (!quickFixTarget || !user?.id || quickFixTarget.listingType !== "library") return
    const listingKey = getListingKey("library", quickFixTarget.id)
    setProcessingListingKey(listingKey)
    setError(null)
    setSuccess(null)
    const now = new Date().toISOString()

    const { error: updateError } = await supabase
      .from("libraries")
      .update({
        name: libraryQuickFix.name,
        city: libraryQuickFix.city,
        state: libraryQuickFix.state || null,
        country: libraryQuickFix.country,
        address: libraryQuickFix.address,
        email: libraryQuickFix.email || null,
        website: libraryQuickFix.website || null,
        notes: libraryQuickFix.notes || null,
        admin_note: libraryQuickFix.adminNote || null,
        approved: true,
        moderation_status: "approved",
        review_action: "quick_fix",
        moderated_by: user.id,
        moderated_at: now,
        updated_at: now,
      })
      .eq("id", quickFixTarget.id)
    if (updateError) {
      console.error("Failed to quick-fix library:", updateError)
      setError("Failed to save quick fix for library")
      setProcessingListingKey(null)
      return
    }

    const { error: deleteTagError } = await supabase.from("library_tags").delete().eq("library_id", quickFixTarget.id)
    if (deleteTagError) {
      console.error("Failed to clear library tags:", deleteTagError)
      setError("Failed to update library tags")
      setProcessingListingKey(null)
      return
    }

    if (libraryQuickFix.selectedTagIds.length > 0) {
      const { error: insertTagError } = await supabase
        .from("library_tags")
        .insert(libraryQuickFix.selectedTagIds.map((tagId) => ({ library_id: quickFixTarget.id, tag_id: tagId })))
      if (insertTagError) {
        console.error("Failed to save library tags:", insertTagError)
        setError("Failed to update library tags")
        setProcessingListingKey(null)
        return
      }
    }

    removePendingListingLocally("library", quickFixTarget.id)
    await fetchRecentModeration("approved")
    setQuickFixOpen(false)
    setQuickFixTarget(null)
    setSuccess("Library quick fix saved and approved")
    setProcessingListingKey(null)
  }

  const saveEventQuickFix = async () => {
    if (!quickFixTarget || !user?.id || quickFixTarget.listingType !== "event") return
    const listingKey = getListingKey("event", quickFixTarget.id)
    setProcessingListingKey(listingKey)
    setError(null)
    setSuccess(null)
    const now = new Date().toISOString()

    const parsedOccurrenceDates = eventQuickFix.occurrence_dates
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const occurrenceDates =
      parsedOccurrenceDates.length >= 2 ? normalizeOccurrenceDates(parsedOccurrenceDates) : null
    const seriesStart =
      occurrenceDates?.[0] ?? eventQuickFix.start_date

    const { error: updateError } = await supabase
      .from("events")
      .update({
        name: eventQuickFix.name,
        venue_name: eventQuickFix.venue_name || null,
        city: eventQuickFix.city,
        state: eventQuickFix.state || null,
        country: eventQuickFix.country,
        address: eventQuickFix.address,
        email: eventQuickFix.email || null,
        website: eventQuickFix.website || null,
        social: eventQuickFix.social || null,
        category: eventQuickFix.category,
        start_date: seriesStart,
        end_date: occurrenceDates ? seriesStart : eventQuickFix.end_date,
        start_time: eventQuickFix.start_time || null,
        end_time: eventQuickFix.end_time || null,
        application_open: eventQuickFix.application_open || null,
        application_deadline: eventQuickFix.application_deadline || null,
        notes: eventQuickFix.notes || null,
        occurrence_dates: occurrenceDates,
        poster_image: eventQuickFix.poster_image || null,
        admin_note: eventQuickFix.adminNote || null,
        approved: true,
        moderation_status: "approved",
        review_action: "quick_fix",
        moderated_by: user.id,
        moderated_at: now,
        updated_at: now,
      })
      .eq("id", quickFixTarget.id)
    if (updateError) {
      console.error("Failed to quick-fix event:", updateError)
      setError("Failed to save quick fix for event")
      setProcessingListingKey(null)
      return
    }

    removePendingListingLocally("event", quickFixTarget.id)
    await fetchRecentModeration("approved")
    setQuickFixOpen(false)
    setQuickFixTarget(null)
    setSuccess("Event quick fix saved and approved")
    setProcessingListingKey(null)
  }

  const handleApproveStoreEdit = async (edit: LocaleEditRow) => {
    try {
      setProcessingStoreEdit(edit.id)
      setError(null)
      setSuccess(null)

      const payload = edit.edit_payload as
        | {
            name?: string
            city?: string
            state?: string | null
            country?: string
            address?: string
            email?: string | null
            website?: string | null
            notes?: string | null
            tag_ids?: string[]
          }
        | undefined

      if (payload && edit.store_id) {
        const { name, city, state, country, address, email, website, notes, tag_ids } = payload
        const { error: updateError } = await supabase
          .from("stores")
          .update({
            ...(name != null && { name }),
            ...(city != null && { city }),
            ...(state !== undefined && { state }),
            ...(country != null && { country }),
            ...(address != null && { address }),
            ...(email !== undefined && { email }),
            ...(website !== undefined && { website }),
            ...(notes !== undefined && { notes }),
            updated_at: new Date().toISOString(),
          })
          .eq("id", edit.store_id)

        if (updateError) {
          setError("Failed to apply store changes")
          return
        }

        if (Array.isArray(tag_ids)) {
          const { error: deleteTagError } = await supabase.from("store_tags").delete().eq("store_id", edit.store_id)
          if (deleteTagError) {
            setError("Failed to remove existing store tags")
            return
          }

          if (tag_ids.length > 0) {
            const { error: insertTagError } = await supabase
              .from("store_tags")
              .insert(tag_ids.map((tag_id) => ({ store_id: edit.store_id, tag_id })))
            if (insertTagError) {
              setError("Failed to add store tags")
              return
            }
          }
        }
      }

      const { error: localeEditError } = await supabase.from("locale_edits").update({ status: "approved" }).eq("id", edit.id)
      if (localeEditError) {
        setError("Failed to approve edit")
        return
      }
      setStoreEdits((prev) => prev.filter((item) => item.id !== edit.id))
      setSuccess("Store edit approved and applied")
    } catch (approveError) {
      console.error("Failed to approve store edit:", approveError)
      setError("Failed to approve store edit")
    } finally {
      setProcessingStoreEdit(null)
    }
  }

  const handleApproveLibraryEdit = async (edit: LocaleEditRow) => {
    try {
      setProcessingLibraryEdit(edit.id)
      setError(null)
      setSuccess(null)

      const payload = edit.edit_payload as
        | {
            name?: string
            city?: string
            state?: string | null
            country?: string
            address?: string
            email?: string | null
            website?: string | null
            notes?: string | null
            tag_ids?: string[]
          }
        | undefined

      if (payload && edit.library_id) {
        const { name, city, state, country, address, email, website, notes, tag_ids } = payload
        const { error: updateError } = await supabase
          .from("libraries")
          .update({
            ...(name != null && { name }),
            ...(city != null && { city }),
            ...(state !== undefined && { state }),
            ...(country != null && { country }),
            ...(address != null && { address }),
            ...(email !== undefined && { email }),
            ...(website !== undefined && { website }),
            ...(notes !== undefined && { notes }),
            updated_at: new Date().toISOString(),
          })
          .eq("id", edit.library_id)

        if (updateError) {
          setError("Failed to apply library changes")
          return
        }

        if (Array.isArray(tag_ids)) {
          const { error: deleteTagError } = await supabase.from("library_tags").delete().eq("library_id", edit.library_id)
          if (deleteTagError) {
            setError("Failed to remove existing library tags")
            return
          }

          if (tag_ids.length > 0) {
            const { error: insertTagError } = await supabase
              .from("library_tags")
              .insert(tag_ids.map((tag_id) => ({ library_id: edit.library_id, tag_id })))
            if (insertTagError) {
              setError("Failed to add library tags")
              return
            }
          }
        }
      }

      const { error: localeEditError } = await supabase.from("locale_edits").update({ status: "approved" }).eq("id", edit.id)
      if (localeEditError) {
        setError("Failed to approve edit")
        return
      }
      setLibraryEdits((prev) => prev.filter((item) => item.id !== edit.id))
      setSuccess("Library edit approved and applied")
    } catch (approveError) {
      console.error("Failed to approve library edit:", approveError)
      setError("Failed to approve library edit")
    } finally {
      setProcessingLibraryEdit(null)
    }
  }

  const handleApproveEventEdit = async (edit: LocaleEditRow) => {
    try {
      setProcessingEventEdit(edit.id)
      setError(null)
      setSuccess(null)

      const payload = edit.edit_payload as
        | {
            name?: string
            venue_name?: string | null
            city?: string
            state?: string | null
            country?: string
            address?: string
            email?: string | null
            website?: string | null
            social?: string | null
            category?: "festival" | "swap" | "workshop"
            start_date?: string
            end_date?: string
            start_time?: string | null
            end_time?: string | null
            application_open?: string | null
            application_deadline?: string | null
            notes?: string | null
            poster_image?: string | null
            occurrence_dates?: string[] | null
          }
        | undefined

      if (payload && edit.event_id) {
        const { error: updateError } = await supabase
          .from("events")
          .update({
            ...(payload.name != null && { name: payload.name }),
            ...(payload.venue_name !== undefined && { venue_name: payload.venue_name }),
            ...(payload.city != null && { city: payload.city }),
            ...(payload.state !== undefined && { state: payload.state }),
            ...(payload.country != null && { country: payload.country }),
            ...(payload.address != null && { address: payload.address }),
            ...(payload.email !== undefined && { email: payload.email }),
            ...(payload.website !== undefined && { website: payload.website }),
            ...(payload.social !== undefined && { social: payload.social }),
            ...(payload.category != null && { category: payload.category }),
            ...(payload.start_date != null && { start_date: payload.start_date }),
            ...(payload.end_date != null && { end_date: payload.end_date }),
            ...(payload.start_time !== undefined && { start_time: payload.start_time }),
            ...(payload.end_time !== undefined && { end_time: payload.end_time }),
            ...(payload.application_open !== undefined && { application_open: payload.application_open }),
            ...(payload.application_deadline !== undefined && { application_deadline: payload.application_deadline }),
            ...(payload.notes !== undefined && { notes: payload.notes }),
            ...(payload.poster_image !== undefined && { poster_image: payload.poster_image }),
            ...(payload.occurrence_dates !== undefined && { occurrence_dates: payload.occurrence_dates }),
            updated_at: new Date().toISOString(),
          })
          .eq("id", edit.event_id)
        if (updateError) {
          setError("Failed to apply event changes")
          return
        }
      }

      const { error: localeEditError } = await supabase.from("locale_edits").update({ status: "approved" }).eq("id", edit.id)
      if (localeEditError) {
        setError("Failed to approve edit")
        return
      }
      setEventEdits((prev) => prev.filter((item) => item.id !== edit.id))
      setSuccess("Event edit approved and applied")
    } catch (approveError) {
      console.error("Failed to approve event edit:", approveError)
      setError("Failed to approve event edit")
    } finally {
      setProcessingEventEdit(null)
    }
  }

  const groupedStoreQuickFixTags = allTags
    .filter((tag) => STORE_TAG_CATEGORIES.includes(tag.category))
    .reduce((acc, tag) => {
      if (!acc[tag.category]) {
        acc[tag.category] = []
      }
      acc[tag.category].push(tag)
      return acc
    }, {} as Record<string, Tag[]>)

  const groupedLibraryQuickFixTags = allTags
    .filter((tag) => LIBRARY_TAG_CATEGORIES.includes(tag.category))
    .reduce((acc, tag) => {
      if (!acc[tag.category]) {
        acc[tag.category] = []
      }
      acc[tag.category].push(tag)
      return acc
    }, {} as Record<string, Tag[]>)

  if (loading || checkingAdmin || !user) {
    return <PageLoader />
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 font-serif">
        <div className="text-center">
          <h1 className="font-gloria text-2xl font-bold text-stone-800 mb-4">Access Denied</h1>
          <p className="text-stone-600 mb-4">You do not have permission to access the admin panel.</p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 font-serif">
      <div className="bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-stone-600 hover:text-stone-800 hover:bg-stone-100">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to map
                </Button>
              </Link>
              <h1 className="font-gloria text-2xl font-bold text-stone-800">Admin Panel</h1>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Admin
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full mb-8 overflow-x-auto">
            <TabsTrigger value="stores">Stores ({pendingStores.length})</TabsTrigger>
            <TabsTrigger value="libraries">Libraries ({pendingLibraries.length})</TabsTrigger>
            <TabsTrigger value="events">Events ({pendingEvents.length})</TabsTrigger>
            <TabsTrigger value="approved">Recently Approved ({recentApproved.length})</TabsTrigger>
            <TabsTrigger value="flagged">Flagged ({recentFlagged.length})</TabsTrigger>
            <TabsTrigger value="edits">Edit Suggestions ({storeEdits.length + libraryEdits.length + eventEdits.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="stores" className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="font-gloria text-xl text-stone-800">Store Pending Queue</h2>
                <p className="text-stone-600">{pendingStores.length} pending stores</p>
              </div>
              <Button variant="outline" onClick={fetchPendingStores} disabled={loadingStores}>
                Refresh
              </Button>
            </div>

            {loadingStores ? (
              <div className="text-stone-500">Loading pending stores...</div>
            ) : pendingStores.length === 0 ? (
              <Card className="bg-white border-stone-200">
                <CardContent className="py-10 text-center text-stone-600">No pending stores.</CardContent>
              </Card>
            ) : (
              pendingStores.map((store) => {
                const listingKey = getListingKey("store", store.id)
                const tagLabels = getStoreTagLabels(store)
                return (
                  <Card key={store.id} className="bg-white border-stone-200">
                    <CardHeader>
                      <CardTitle className="text-stone-800 flex items-center justify-between">
                        <span>{store.name}</span>
                        <Badge variant="outline">Store</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong className="text-stone-700">Location:</strong>
                          <p className="text-stone-600">{store.city}{store.state ? `, ${store.state}` : ""}, {store.country}</p>
                        </div>
                        <div>
                          <strong className="text-stone-700">Address:</strong>
                          <p className="text-stone-600">{store.address}</p>
                        </div>
                        <div>
                          <strong className="text-stone-700">Email:</strong>
                          <p className="text-stone-600">{store.email || "N/A"}</p>
                        </div>
                        <div>
                          <strong className="text-stone-700">Website:</strong>
                          <p className="text-stone-600 break-all">{store.website || "N/A"}</p>
                        </div>
                        <div>
                          <strong className="text-stone-700">Submitted by:</strong>
                          <p className="text-stone-600">{toShortId(store.submitted_by)}</p>
                        </div>
                        <div>
                          <strong className="text-stone-700">Submitted at:</strong>
                          <p className="text-stone-600">{new Date(store.created_at).toLocaleString()}</p>
                        </div>
                      </div>

                      {store.notes && (
                        <div>
                          <strong className="text-stone-700 text-sm">Listing Notes:</strong>
                          <p className="text-stone-600 text-sm mt-1 whitespace-pre-wrap">{store.notes}</p>
                        </div>
                      )}

                      <div>
                        <strong className="text-stone-700 text-sm">Tags:</strong>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {tagLabels.length > 0 ? tagLabels.map((label) => <Badge key={`${store.id}-${label}`} variant="secondary">{label}</Badge>) : <span className="text-stone-500 text-sm">No tags</span>}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`store-flag-note-${store.id}`}>Admin note</Label>
                        <Textarea
                          id={`store-flag-note-${store.id}`}
                          value={flagNotes[listingKey] || ""}
                          onChange={(event) => setFlagNotes((prev) => ({ ...prev, [listingKey]: event.target.value }))}
                          placeholder="Required when flagging"
                          className="mt-2"
                        />
                      </div>

                      <div className="flex flex-wrap gap-3 pt-2">
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleApproveListing("store", store.id)}
                          disabled={processingListingKey === listingKey}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => openStoreQuickFix(store)}
                          disabled={processingListingKey === listingKey}
                        >
                          <Wrench className="h-4 w-4 mr-2" />
                          Quick Fix
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleFlagListing("store", store.id)}
                          disabled={processingListingKey === listingKey}
                        >
                          <Flag className="h-4 w-4 mr-2" />
                          Flag
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </TabsContent>

          <TabsContent value="libraries" className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="font-gloria text-xl text-stone-800">Library Pending Queue</h2>
                <p className="text-stone-600">{pendingLibraries.length} pending libraries</p>
              </div>
              <Button variant="outline" onClick={fetchPendingLibraries} disabled={loadingLibraries}>
                Refresh
              </Button>
            </div>

            {loadingLibraries ? (
              <div className="text-stone-500">Loading pending libraries...</div>
            ) : pendingLibraries.length === 0 ? (
              <Card className="bg-white border-stone-200">
                <CardContent className="py-10 text-center text-stone-600">No pending libraries.</CardContent>
              </Card>
            ) : (
              pendingLibraries.map((library) => {
                const listingKey = getListingKey("library", library.id)
                const tagLabels = getLibraryTagLabels(library)
                return (
                  <Card key={library.id} className="bg-white border-stone-200">
                    <CardHeader>
                      <CardTitle className="text-stone-800 flex items-center justify-between">
                        <span>{library.name}</span>
                        <Badge variant="outline">Library</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong className="text-stone-700">Location:</strong>
                          <p className="text-stone-600">{library.city}{library.state ? `, ${library.state}` : ""}, {library.country}</p>
                        </div>
                        <div>
                          <strong className="text-stone-700">Address:</strong>
                          <p className="text-stone-600">{library.address}</p>
                        </div>
                        <div>
                          <strong className="text-stone-700">Email:</strong>
                          <p className="text-stone-600">{library.email || "N/A"}</p>
                        </div>
                        <div>
                          <strong className="text-stone-700">Website:</strong>
                          <p className="text-stone-600 break-all">{library.website || "N/A"}</p>
                        </div>
                        <div>
                          <strong className="text-stone-700">Submitted by:</strong>
                          <p className="text-stone-600">{toShortId(library.submitted_by)}</p>
                        </div>
                        <div>
                          <strong className="text-stone-700">Submitted at:</strong>
                          <p className="text-stone-600">{new Date(library.created_at).toLocaleString()}</p>
                        </div>
                      </div>

                      {library.notes && (
                        <div>
                          <strong className="text-stone-700 text-sm">Listing Notes:</strong>
                          <p className="text-stone-600 text-sm mt-1 whitespace-pre-wrap">{library.notes}</p>
                        </div>
                      )}

                      <div>
                        <strong className="text-stone-700 text-sm">Tags:</strong>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {tagLabels.length > 0 ? tagLabels.map((label) => <Badge key={`${library.id}-${label}`} variant="secondary">{label}</Badge>) : <span className="text-stone-500 text-sm">No tags</span>}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`library-flag-note-${library.id}`}>Admin note</Label>
                        <Textarea
                          id={`library-flag-note-${library.id}`}
                          value={flagNotes[listingKey] || ""}
                          onChange={(event) => setFlagNotes((prev) => ({ ...prev, [listingKey]: event.target.value }))}
                          placeholder="Required when flagging"
                          className="mt-2"
                        />
                      </div>

                      <div className="flex flex-wrap gap-3 pt-2">
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleApproveListing("library", library.id)}
                          disabled={processingListingKey === listingKey}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => openLibraryQuickFix(library)}
                          disabled={processingListingKey === listingKey}
                        >
                          <Wrench className="h-4 w-4 mr-2" />
                          Quick Fix
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleFlagListing("library", library.id)}
                          disabled={processingListingKey === listingKey}
                        >
                          <Flag className="h-4 w-4 mr-2" />
                          Flag
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="font-gloria text-xl text-stone-800">Event Pending Queue</h2>
                <p className="text-stone-600">{pendingEvents.length} pending events</p>
              </div>
              <Button variant="outline" onClick={fetchPendingEvents} disabled={loadingEvents}>
                Refresh
              </Button>
            </div>

            {loadingEvents ? (
              <div className="text-stone-500">Loading pending events...</div>
            ) : pendingEvents.length === 0 ? (
              <Card className="bg-white border-stone-200">
                <CardContent className="py-10 text-center text-stone-600">No pending events.</CardContent>
              </Card>
            ) : (
              pendingEvents.map((event) => {
                const listingKey = getListingKey("event", event.id)
                const today = new Date().toISOString().split("T")[0]
                const futureOccurrenceDates = isRecurringEvent(event)
                  ? expandRecurringEvents([event]).filter((item) => item.occurrence_start >= today).map((item) => item.occurrence_start)
                  : []
                return (
                  <Card key={event.id} className="bg-white border-stone-200">
                    <CardHeader>
                      <CardTitle className="text-stone-800 flex items-center justify-between">
                        <span>{event.name}</span>
                        <Badge variant="outline">Event</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong className="text-stone-700">Category + date:</strong>
                          <p className="text-stone-600">
                            {getEventCategoryDisplay(event.category)} - {new Date(event.start_date).toLocaleDateString()}
                            {event.start_date !== event.end_date ? ` to ${new Date(event.end_date).toLocaleDateString()}` : ""}
                          </p>
                        </div>
                        <div>
                          <strong className="text-stone-700">Venue:</strong>
                          <p className="text-stone-600">{event.venue_name || "N/A"}</p>
                        </div>
                        <div>
                          <strong className="text-stone-700">Location:</strong>
                          <p className="text-stone-600">{event.city}{event.state ? `, ${event.state}` : ""}, {event.country}</p>
                        </div>
                        <div>
                          <strong className="text-stone-700">Address:</strong>
                          <p className="text-stone-600">{event.address}</p>
                        </div>
                        <div>
                          <strong className="text-stone-700">Email:</strong>
                          <p className="text-stone-600">{event.email || "N/A"}</p>
                        </div>
                        <div>
                          <strong className="text-stone-700">Website:</strong>
                          <p className="text-stone-600 break-all">{event.website || "N/A"}</p>
                        </div>
                      </div>

                      {isRecurringEvent(event) && (
                        <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-4">
                          <strong className="text-stone-700 text-sm">Recurrence</strong>
                          <p className="text-stone-600 text-sm mt-1">{formatRecurrenceDescription(event)}</p>
                          {futureOccurrenceDates.length > 0 && (
                            <ul className="mt-2 text-sm text-stone-600 list-disc list-inside space-y-1">
                              {futureOccurrenceDates.map((date) => (
                                <li key={date}>{formatDateReadable(date)}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {event.notes && (
                        <div>
                          <strong className="text-stone-700 text-sm">Listing Notes:</strong>
                          <p className="text-stone-600 text-sm mt-1 whitespace-pre-wrap">{event.notes}</p>
                        </div>
                      )}

                      <div>
                        <Label htmlFor={`event-flag-note-${event.id}`}>Admin note</Label>
                        <Textarea
                          id={`event-flag-note-${event.id}`}
                          value={flagNotes[listingKey] || ""}
                          onChange={(e) => setFlagNotes((prev) => ({ ...prev, [listingKey]: e.target.value }))}
                          placeholder="Required when flagging"
                          className="mt-2"
                        />
                      </div>

                      <div className="flex flex-wrap gap-3 pt-2">
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleApproveListing("event", event.id)}
                          disabled={processingListingKey === listingKey}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => openEventQuickFix(event)}
                          disabled={processingListingKey === listingKey}
                        >
                          <Wrench className="h-4 w-4 mr-2" />
                          Quick Fix
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleFlagListing("event", event.id)}
                          disabled={processingListingKey === listingKey}
                        >
                          <Flag className="h-4 w-4 mr-2" />
                          Flag
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="font-gloria text-xl text-stone-800">Recently Approved</h2>
                <p className="text-stone-600">Listings approved in the past 7 days (max 50)</p>
              </div>
              <Button variant="outline" onClick={() => fetchRecentModeration("approved")} disabled={loadingApproved}>
                Refresh
              </Button>
            </div>

            {loadingApproved ? (
              <div className="text-stone-500">Loading recent approvals...</div>
            ) : recentApproved.length === 0 ? (
              <Card className="bg-white border-stone-200">
                <CardContent className="py-10 text-center text-stone-600">No recently approved listings.</CardContent>
              </Card>
            ) : (
              recentApproved.map((item) => (
                <Card key={`approved-${item.listingType}-${item.id}`} className="bg-white border-stone-200">
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{listingLabel(item.listingType)}</Badge>
                          <Link href={getListingHref(item)} className="font-semibold text-stone-800 underline underline-offset-2 hover:text-rose-600">
                            {item.name}
                          </Link>
                        </div>
                        <p className="text-sm text-stone-600 mt-1">
                          {item.city}
                          {item.state ? `, ${item.state}` : ""}, {item.country}
                        </p>
                        {item.listingType === "event" && item.start_date && (
                          <p className="text-sm text-stone-600 mt-1">
                            Dates: {new Date(item.start_date).toLocaleDateString()}
                            {item.end_date && item.end_date !== item.start_date
                              ? ` to ${new Date(item.end_date).toLocaleDateString()}`
                              : ""}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm text-stone-600">
                        <p>Action: {item.review_action || "approve"}</p>
                        <p>Moderator: {toShortId(item.moderated_by)}</p>
                        <p>{item.moderated_at ? new Date(item.moderated_at).toLocaleString() : "No timestamp"}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-stone-600">
                      <div>
                        <strong className="text-stone-700">Address:</strong>
                        <p className="mt-1">{item.address || "N/A"}</p>
                      </div>
                      <div>
                        <strong className="text-stone-700">Email:</strong>
                        <p className="mt-1">{item.email || "N/A"}</p>
                      </div>
                      <div>
                        <strong className="text-stone-700">Website:</strong>
                        <p className="mt-1 break-all">{item.website || "N/A"}</p>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-stone-600">
                      <strong className="text-stone-700">Description:</strong>
                      <p className="mt-1 whitespace-pre-wrap">{item.notes || "N/A"}</p>
                    </div>
                    {item.admin_note && <p className="text-sm text-stone-700 mt-3"><strong>Admin note:</strong> {item.admin_note}</p>}
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        onClick={() => handleUnapproveListing(item.listingType, item.id)}
                        disabled={processingListingKey === getListingKey(item.listingType, item.id)}
                        className="border-amber-300 text-amber-800 hover:bg-amber-50"
                      >
                        {processingListingKey === getListingKey(item.listingType, item.id) ? "Unapproving..." : "Unapprove"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="flagged" className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="font-gloria text-xl text-stone-800">Flagged</h2>
                <p className="text-stone-600">All currently flagged listings</p>
              </div>
              <Button variant="outline" onClick={() => fetchRecentModeration("flagged")} disabled={loadingFlagged}>
                Refresh
              </Button>
            </div>

            {loadingFlagged ? (
              <div className="text-stone-500">Loading flagged listings...</div>
            ) : recentFlagged.length === 0 ? (
              <Card className="bg-white border-stone-200">
                <CardContent className="py-10 text-center text-stone-600">No flagged listings.</CardContent>
              </Card>
            ) : (
              recentFlagged.map((item) => (
                <Card key={`flagged-${item.listingType}-${item.id}`} className="bg-white border-stone-200">
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{listingLabel(item.listingType)}</Badge>
                          <span className="font-semibold text-stone-800">{item.name}</span>
                        </div>
                        <p className="text-sm text-stone-600 mt-1">{item.city}, {item.country}</p>
                      </div>
                      <div className="text-right text-sm text-stone-600">
                        <p>Action: {item.review_action || "flag"}</p>
                        <p>Moderator: {toShortId(item.moderated_by)}</p>
                        <p>{item.moderated_at ? new Date(item.moderated_at).toLocaleString() : "No timestamp"}</p>
                      </div>
                    </div>
                    <p className="text-sm text-stone-700 mt-3"><strong>Admin note:</strong> {item.admin_note || "No note captured"}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="edits" className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="font-gloria text-xl text-stone-800">Edit Suggestions</h2>
                <p className="text-stone-600">
                  {storeEdits.length + libraryEdits.length + eventEdits.length} pending suggestion(s)
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  fetchStoreEdits()
                  fetchLibraryEdits()
                  fetchEventEdits()
                }}
                disabled={loadingStoreEdits || loadingLibraryEdits || loadingEventEdits}
              >
                Refresh All
              </Button>
            </div>

            {loadingStoreEdits || loadingLibraryEdits || loadingEventEdits ? (
              <div className="text-stone-500">Loading edit suggestions...</div>
            ) : (storeEdits.length + libraryEdits.length + eventEdits.length) === 0 ? (
              <Card className="bg-white border-stone-200">
                <CardContent className="py-10 text-center text-stone-600">No pending edit suggestions.</CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {storeEdits.map((edit) => (
                  <Card key={`store-edit-${edit.id}`} className="bg-white border-stone-200">
                    <CardHeader>
                      <CardTitle className="text-stone-800 flex items-center gap-2">
                        <Badge variant="outline">Store Edit</Badge>
                        {edit.stores?.name || "Unknown Store"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-stone-600">
                        Suggested by {toShortId(edit.user_id)} on {new Date(edit.created_at).toLocaleString()}
                      </p>
                      <pre className="text-sm text-stone-700 bg-stone-50 border border-stone-200 p-3 rounded-md whitespace-pre-wrap">
                        {edit.edit_summary}
                      </pre>
                      <Button onClick={() => handleApproveStoreEdit(edit)} disabled={processingStoreEdit === edit.id} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Check className="h-4 w-4 mr-2" />
                        {processingStoreEdit === edit.id ? "Applying..." : "Approve Edit"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                {libraryEdits.map((edit) => (
                  <Card key={`library-edit-${edit.id}`} className="bg-white border-stone-200">
                    <CardHeader>
                      <CardTitle className="text-stone-800 flex items-center gap-2">
                        <Badge variant="outline">Library Edit</Badge>
                        {edit.libraries?.name || "Unknown Library"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-stone-600">
                        Suggested by {toShortId(edit.user_id)} on {new Date(edit.created_at).toLocaleString()}
                      </p>
                      <pre className="text-sm text-stone-700 bg-stone-50 border border-stone-200 p-3 rounded-md whitespace-pre-wrap">
                        {edit.edit_summary}
                      </pre>
                      <Button onClick={() => handleApproveLibraryEdit(edit)} disabled={processingLibraryEdit === edit.id} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Check className="h-4 w-4 mr-2" />
                        {processingLibraryEdit === edit.id ? "Applying..." : "Approve Edit"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                {eventEdits.map((edit) => (
                  <Card key={`event-edit-${edit.id}`} className="bg-white border-stone-200">
                    <CardHeader>
                      <CardTitle className="text-stone-800 flex items-center gap-2">
                        <Badge variant="outline">Event Edit</Badge>
                        {edit.events?.name || "Unknown Event"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-stone-600">
                        Suggested by {toShortId(edit.user_id)} on {new Date(edit.created_at).toLocaleString()}
                      </p>
                      <pre className="text-sm text-stone-700 bg-stone-50 border border-stone-200 p-3 rounded-md whitespace-pre-wrap">
                        {edit.edit_summary}
                      </pre>
                      <Button onClick={() => handleApproveEventEdit(edit)} disabled={processingEventEdit === edit.id} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Check className="h-4 w-4 mr-2" />
                        {processingEventEdit === edit.id ? "Applying..." : "Approve Edit"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={quickFixOpen} onOpenChange={setQuickFixOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Quick Fix {quickFixTarget ? listingLabel(quickFixTarget.listingType) : ""}
            </DialogTitle>
            <DialogDescription>
              Save edits directly to the listing and auto-approve without creating an edit payload.
            </DialogDescription>
          </DialogHeader>

          {quickFixTarget?.listingType === "store" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={storeQuickFix.name} onChange={(e) => setStoreQuickFix((prev) => ({ ...prev, name: e.target.value }))} /></div>
                <div><Label>Country</Label><Input value={storeQuickFix.country} onChange={(e) => setStoreQuickFix((prev) => ({ ...prev, country: e.target.value }))} /></div>
                <div><Label>City</Label><Input value={storeQuickFix.city} onChange={(e) => setStoreQuickFix((prev) => ({ ...prev, city: e.target.value }))} /></div>
                <div><Label>State</Label><Input value={storeQuickFix.state} onChange={(e) => setStoreQuickFix((prev) => ({ ...prev, state: e.target.value }))} /></div>
                <div className="md:col-span-2"><Label>Address</Label><Input value={storeQuickFix.address} onChange={(e) => setStoreQuickFix((prev) => ({ ...prev, address: e.target.value }))} /></div>
                <div><Label>Email</Label><Input value={storeQuickFix.email} onChange={(e) => setStoreQuickFix((prev) => ({ ...prev, email: e.target.value }))} /></div>
                <div><Label>Website</Label><Input value={storeQuickFix.website} onChange={(e) => setStoreQuickFix((prev) => ({ ...prev, website: e.target.value }))} /></div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={storeQuickFix.notes} onChange={(e) => setStoreQuickFix((prev) => ({ ...prev, notes: e.target.value }))} />
              </div>
              <div>
                <Label>Tags</Label>
                <div className="space-y-3 mt-2">
                  {Object.entries(groupedStoreQuickFixTags).map(([category, tags]) => (
                    <div key={`store-tag-group-${category}`} className="space-y-2">
                      <p className="text-xs text-stone-500 uppercase tracking-wide">
                        {getTagCategoryDisplay(category)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => {
                          const selected = storeQuickFix.selectedTagIds.includes(tag.id)
                          return (
                            <Badge
                              key={`store-tag-option-${tag.id}`}
                              variant={selected ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() =>
                                setStoreQuickFix((prev) => ({
                                  ...prev,
                                  selectedTagIds: selected
                                    ? prev.selectedTagIds.filter((id) => id !== tag.id)
                                    : [...prev.selectedTagIds, tag.id],
                                }))
                              }
                            >
                              {tag.label}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Admin note</Label>
                <Textarea value={storeQuickFix.adminNote} onChange={(e) => setStoreQuickFix((prev) => ({ ...prev, adminNote: e.target.value }))} />
              </div>
            </div>
          )}

          {quickFixTarget?.listingType === "library" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={libraryQuickFix.name} onChange={(e) => setLibraryQuickFix((prev) => ({ ...prev, name: e.target.value }))} /></div>
                <div><Label>Country</Label><Input value={libraryQuickFix.country} onChange={(e) => setLibraryQuickFix((prev) => ({ ...prev, country: e.target.value }))} /></div>
                <div><Label>City</Label><Input value={libraryQuickFix.city} onChange={(e) => setLibraryQuickFix((prev) => ({ ...prev, city: e.target.value }))} /></div>
                <div><Label>State</Label><Input value={libraryQuickFix.state} onChange={(e) => setLibraryQuickFix((prev) => ({ ...prev, state: e.target.value }))} /></div>
                <div className="md:col-span-2"><Label>Address</Label><Input value={libraryQuickFix.address} onChange={(e) => setLibraryQuickFix((prev) => ({ ...prev, address: e.target.value }))} /></div>
                <div><Label>Email</Label><Input value={libraryQuickFix.email} onChange={(e) => setLibraryQuickFix((prev) => ({ ...prev, email: e.target.value }))} /></div>
                <div><Label>Website</Label><Input value={libraryQuickFix.website} onChange={(e) => setLibraryQuickFix((prev) => ({ ...prev, website: e.target.value }))} /></div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={libraryQuickFix.notes} onChange={(e) => setLibraryQuickFix((prev) => ({ ...prev, notes: e.target.value }))} />
              </div>
              <div>
                <Label>Tags</Label>
                <div className="space-y-3 mt-2">
                  {Object.entries(groupedLibraryQuickFixTags).map(([category, tags]) => (
                    <div key={`library-tag-group-${category}`} className="space-y-2">
                      <p className="text-xs text-stone-500 uppercase tracking-wide">
                        {getTagCategoryDisplay(category)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => {
                          const selected = libraryQuickFix.selectedTagIds.includes(tag.id)
                          return (
                            <Badge
                              key={`library-tag-option-${tag.id}`}
                              variant={selected ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() =>
                                setLibraryQuickFix((prev) => ({
                                  ...prev,
                                  selectedTagIds: selected
                                    ? prev.selectedTagIds.filter((id) => id !== tag.id)
                                    : [...prev.selectedTagIds, tag.id],
                                }))
                              }
                            >
                              {tag.label}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Admin note</Label>
                <Textarea value={libraryQuickFix.adminNote} onChange={(e) => setLibraryQuickFix((prev) => ({ ...prev, adminNote: e.target.value }))} />
              </div>
            </div>
          )}

          {quickFixTarget?.listingType === "event" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={eventQuickFix.name} onChange={(e) => setEventQuickFix((prev) => ({ ...prev, name: e.target.value }))} /></div>
                <div><Label>Venue</Label><Input value={eventQuickFix.venue_name} onChange={(e) => setEventQuickFix((prev) => ({ ...prev, venue_name: e.target.value }))} /></div>
                <div><Label>Country</Label><Input value={eventQuickFix.country} onChange={(e) => setEventQuickFix((prev) => ({ ...prev, country: e.target.value }))} /></div>
                <div><Label>City</Label><Input value={eventQuickFix.city} onChange={(e) => setEventQuickFix((prev) => ({ ...prev, city: e.target.value }))} /></div>
                <div><Label>State</Label><Input value={eventQuickFix.state} onChange={(e) => setEventQuickFix((prev) => ({ ...prev, state: e.target.value }))} /></div>
                <div><Label>Address</Label><Input value={eventQuickFix.address} onChange={(e) => setEventQuickFix((prev) => ({ ...prev, address: e.target.value }))} /></div>
                <div><Label>Email</Label><Input value={eventQuickFix.email} onChange={(e) => setEventQuickFix((prev) => ({ ...prev, email: e.target.value }))} /></div>
                <div><Label>Website</Label><Input value={eventQuickFix.website} onChange={(e) => setEventQuickFix((prev) => ({ ...prev, website: e.target.value }))} /></div>
                <div><Label>Social</Label><Input value={eventQuickFix.social} onChange={(e) => setEventQuickFix((prev) => ({ ...prev, social: e.target.value }))} /></div>
                <div>
                  <Label>Category</Label>
                  <select
                    className="w-full border border-stone-300 rounded-md h-10 px-3"
                    value={eventQuickFix.category}
                    onChange={(e) => setEventQuickFix((prev) => ({ ...prev, category: e.target.value as EventQuickFixForm["category"] }))}
                  >
                    <option value="festival">Festival</option>
                    <option value="swap">Swap</option>
                    <option value="workshop">Workshop</option>
                  </select>
                </div>
                <div><Label>Start date</Label><Input type="date" value={eventQuickFix.start_date} onChange={(e) => setEventQuickFix((prev) => ({ ...prev, start_date: e.target.value }))} /></div>
                <div><Label>End date</Label><Input type="date" value={eventQuickFix.end_date} onChange={(e) => setEventQuickFix((prev) => ({ ...prev, end_date: e.target.value }))} /></div>
                <div><Label>Start time</Label><Input type="time" value={eventQuickFix.start_time} onChange={(e) => setEventQuickFix((prev) => ({ ...prev, start_time: e.target.value }))} /></div>
                <div><Label>End time</Label><Input type="time" value={eventQuickFix.end_time} onChange={(e) => setEventQuickFix((prev) => ({ ...prev, end_time: e.target.value }))} /></div>
                <div><Label>Application open</Label><Input type="date" value={eventQuickFix.application_open} onChange={(e) => setEventQuickFix((prev) => ({ ...prev, application_open: e.target.value }))} /></div>
                <div><Label>Application deadline</Label><Input type="date" value={eventQuickFix.application_deadline} onChange={(e) => setEventQuickFix((prev) => ({ ...prev, application_deadline: e.target.value }))} /></div>
                <div className="md:col-span-2">
                  <Label>Occurrence dates (one per line or comma-separated, min 2 for series)</Label>
                  <Textarea
                    value={eventQuickFix.occurrence_dates}
                    onChange={(e) => setEventQuickFix((prev) => ({ ...prev, occurrence_dates: e.target.value }))}
                    rows={4}
                    placeholder="2026-06-01&#10;2026-07-01"
                  />
                </div>
                <div className="md:col-span-2"><Label>Poster image URL</Label><Input value={eventQuickFix.poster_image} onChange={(e) => setEventQuickFix((prev) => ({ ...prev, poster_image: e.target.value }))} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={eventQuickFix.notes} onChange={(e) => setEventQuickFix((prev) => ({ ...prev, notes: e.target.value }))} /></div>
              <div><Label>Admin note</Label><Textarea value={eventQuickFix.adminNote} onChange={(e) => setEventQuickFix((prev) => ({ ...prev, adminNote: e.target.value }))} /></div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickFixOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (quickFixTarget?.listingType === "store") void saveStoreQuickFix()
                if (quickFixTarget?.listingType === "library") void saveLibraryQuickFix()
                if (quickFixTarget?.listingType === "event") void saveEventQuickFix()
              }}
            >
              Save Quick Fix
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
