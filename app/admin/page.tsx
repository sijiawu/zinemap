"use client"

import { useEffect, useState } from "react"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, X, Store as StoreIcon, MapPin, Clock, User, BookOpen, Edit3, Calendar, Landmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Store, Library, Event } from "@/lib/types"
import { formatDateReadable, getEventCategoryDisplay } from "@/lib/utils"

export default function AdminPage() {
  const { user, loading } = useSupabaseUser()
  const router = useRouter()
  const [unapprovedStores, setUnapprovedStores] = useState<Store[]>([])
  const [unapprovedLibraries, setUnapprovedLibraries] = useState<Library[]>([])
  const [unapprovedEvents, setUnapprovedEvents] = useState<Event[]>([])

  const [storeEdits, setStoreEdits] = useState<any[]>([])
  const [libraryEdits, setLibraryEdits] = useState<any[]>([])
  const [eventEdits, setEventEdits] = useState<any[]>([])
  const [loadingStores, setLoadingStores] = useState(true)
  const [loadingLibraries, setLoadingLibraries] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingStoreEdits, setLoadingStoreEdits] = useState(true)
  const [loadingLibraryEdits, setLoadingLibraryEdits] = useState(true)
  const [loadingEventEdits, setLoadingEventEdits] = useState(true)
  const [processingStore, setProcessingStore] = useState<string | null>(null)
  const [processingLibrary, setProcessingLibrary] = useState<string | null>(null)
  const [processingEvent, setProcessingEvent] = useState<string | null>(null)
  const [processingStoreEdit, setProcessingStoreEdit] = useState<string | null>(null)
  const [processingLibraryEdit, setProcessingLibraryEdit] = useState<string | null>(null)
  const [processingEventEdit, setProcessingEventEdit] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("stores")

  // Check if user is admin using environment variable
  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
      return
    }

    if (!loading && user && !isAdmin) {
      router.replace("/")
      return
    }

    if (isAdmin) {
      fetchUnapprovedStores()
      fetchUnapprovedLibraries()
      fetchUnapprovedEvents()
      fetchStoreEdits()
      fetchLibraryEdits()
      fetchEventEdits()
    }
  }, [user, loading, isAdmin, router])

  const fetchUnapprovedStores = async () => {
    try {
      setLoadingStores(true)
      setError(null)

      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('approved', false)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching unapproved stores:', error)
        setError('Failed to load unapproved stores')
      } else {
        setUnapprovedStores(data || [])
      }
    } catch (error) {
      console.error('Error fetching unapproved stores:', error)
      setError('Failed to load unapproved stores')
    } finally {
      setLoadingStores(false)
    }
  }

  const fetchUnapprovedLibraries = async () => {
    try {
      setLoadingLibraries(true)
      setError(null)

      const { data, error } = await supabase
        .from('libraries')
        .select('*')
        .eq('approved', false)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching unapproved libraries:', error)
        setError('Failed to load unapproved libraries')
      } else {
        setUnapprovedLibraries(data || [])
      }
    } catch (error) {
      console.error('Error fetching unapproved libraries:', error)
      setError('Failed to load unapproved libraries')
    } finally {
      setLoadingLibraries(false)
    }
  }

  const fetchUnapprovedEvents = async () => {
    try {
      setLoadingEvents(true)
      setError(null)

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('approved', false)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching unapproved events:', error)
        setError('Failed to load unapproved events')
      } else {
        setUnapprovedEvents(data || [])
      }
    } catch (error) {
      console.error('Error fetching unapproved events:', error)
      setError('Failed to load unapproved events')
    } finally {
      setLoadingEvents(false)
    }
  }

  const handleApproveStore = async (storeId: string) => {
    try {
      setProcessingStore(storeId)
      setError(null)
      setSuccess(null)

      const { error } = await supabase
        .from('stores')
        .update({ approved: true })
        .eq('id', storeId)

      if (error) {
        console.error('Error approving store:', error)
        setError('Failed to approve store')
      } else {
        setSuccess('Store approved successfully!')
        // Remove the store from the list
        setUnapprovedStores(prev => prev.filter(store => store.id !== storeId))
      }
    } catch (error) {
      console.error('Error approving store:', error)
    } finally {
      setProcessingStore(null)
    }
  }

  const handleRejectStore = async (storeId: string) => {
    try {
      setProcessingStore(storeId)
      setError(null)
      setSuccess(null)

      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId)

      if (error) {
        console.error('Error rejecting store:', error)
        setError('Failed to reject store')
      } else {
        setSuccess('Store rejected and removed')
        // Remove the store from the list
        setUnapprovedStores(prev => prev.filter(store => store.id !== storeId))
      }
    } catch (error) {
      console.error('Error rejecting store:', error)
    } finally {
      setProcessingStore(null)
    }
  }

  const handleApproveLibrary = async (libraryId: string) => {
    try {
      setProcessingLibrary(libraryId)
      setError(null)
      setSuccess(null)

      const { error } = await supabase
        .from('libraries')
        .update({ approved: true })
        .eq('id', libraryId)

      if (error) {
        console.error('Error approving library:', error)
        setError('Failed to approve library')
      } else {
        setSuccess('Library approved successfully!')
        // Remove the library from the list
        setUnapprovedLibraries(prev => prev.filter(library => library.id !== libraryId))
      }
    } catch (error) {
      console.error('Error approving library:', error)
    } finally {
      setProcessingLibrary(null)
    }
  }

  const handleRejectLibrary = async (libraryId: string) => {
    try {
      setProcessingLibrary(libraryId)
      setError(null)
      setSuccess(null)

      const { error } = await supabase
        .from('libraries')
        .delete()
        .eq('id', libraryId)

      if (error) {
        console.error('Error rejecting library:', error)
        setError('Failed to reject library')
      } else {
        setSuccess('Library rejected and removed')
        // Remove the library from the list
        setUnapprovedLibraries(prev => prev.filter(library => library.id !== libraryId))
      }
    } catch (error) {
      console.error('Error rejecting library:', error)
    } finally {
      setProcessingLibrary(null)
    }
  }

  const handleApproveEvent = async (eventId: string) => {
    try {
      setProcessingEvent(eventId)
      setError(null)
      setSuccess(null)

      const { error } = await supabase
        .from('events')
        .update({ approved: true })
        .eq('id', eventId)

      if (error) {
        console.error('Error approving event:', error)
        setError('Failed to approve event')
      } else {
        setSuccess('Event approved successfully!')
        // Remove the event from the list
        setUnapprovedEvents(prev => prev.filter(event => event.id !== eventId))
      }
    } catch (error) {
      console.error('Error approving event:', error)
    } finally {
      setProcessingEvent(null)
    }
  }

  const handleRejectEvent = async (eventId: string) => {
    try {
      setProcessingEvent(eventId)
      setError(null)
      setSuccess(null)

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) {
        console.error('Error rejecting event:', error)
        setError('Failed to reject event')
      } else {
        setSuccess('Event rejected and removed')
        // Remove the event from the list
        setUnapprovedEvents(prev => prev.filter(event => event.id !== eventId))
      }
    } catch (error) {
      console.error('Error rejecting event:', error)
    } finally {
      setProcessingEvent(null)
    }
  }

  const fetchStoreEdits = async () => {
    try {
      setLoadingStoreEdits(true)
      setError(null)

      const { data, error } = await supabase
        .from('locale_edits')
        .select(`
          *,
          stores!inner(name, city, country)
        `)
        .eq('status', 'pending')
        .not('store_id', 'is', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching store edits:', error)
        setError('Failed to load store edits')
      } else {
        setStoreEdits(data || [])
      }
    } catch (error) {
      console.error('Error fetching store edits:', error)
    } finally {
      setLoadingStoreEdits(false)
    }
  }

  const fetchLibraryEdits = async () => {
    try {
      setLoadingLibraryEdits(true)
      setError(null)

      const { data, error } = await supabase
        .from('locale_edits')
        .select(`
          *,
          libraries!inner(name, city, country)
        `)
        .eq('status', 'pending')
        .not('library_id', 'is', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching library edits:', error)
        setError('Failed to load library edits')
      } else {
        setLibraryEdits(data || [])
      }
    } catch (error) {
      console.error('Error fetching library edits:', error)
    } finally {
      setLoadingLibraryEdits(false)
    }
  }

  const fetchEventEdits = async () => {
    try {
      setLoadingEventEdits(true)
      setError(null)

      const { data, error } = await supabase
        .from('locale_edits')
        .select(`
          *,
          events!inner(name, city, country)
        `)
        .eq('status', 'pending')
        .not('event_id', 'is', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching event edits:', error)
        setError('Failed to load event edits')
      } else {
        setEventEdits(data || [])
      }
    } catch (error) {
      console.error('Error fetching event edits:', error)
    } finally {
      setLoadingEventEdits(false)
    }
  }

  const handleApproveStoreEdit = async (edit: { id: string; store_id: string; edit_payload?: Record<string, unknown> | null }) => {
    try {
      setProcessingStoreEdit(edit.id)
      setError(null)
      setSuccess(null)

      const payload = edit.edit_payload as { name?: string; city?: string; state?: string | null; country?: string; address?: string; email?: string | null; website?: string | null; notes?: string | null; tag_ids?: string[] } | undefined
      if (payload && edit.store_id) {
        const { name, city, state, country, address, email, website, notes, tag_ids } = payload
        const { error: updateError } = await supabase
          .from('stores')
          .update({
            ...(name != null && { name }),
            ...(city != null && { city }),
            ...(state !== undefined && { state }),
            ...(country != null && { country }),
            ...(address != null && { address }),
            ...(email !== undefined && { email }),
            ...(website !== undefined && { website }),
            ...(notes !== undefined && { notes }),
            updated_at: new Date().toISOString()
          })
          .eq('id', edit.store_id)
        if (updateError) {
          setError('Failed to apply store changes')
          return
        }
        if (Array.isArray(tag_ids)) {
          const { error: deleteTagError } = await supabase
            .from('store_tags')
            .delete()
            .eq('store_id', edit.store_id)
          if (deleteTagError) {
            setError('Failed to remove existing store tags')
            return
          }
          if (tag_ids.length > 0) {
            const { error: insertTagError } = await supabase
              .from('store_tags')
              .insert(tag_ids.map((tag_id: string) => ({ store_id: edit.store_id, tag_id })))
            if (insertTagError) {
              setError('Failed to add store tags')
              return
            }
          }
        }
      }

      const { error } = await supabase.from('locale_edits').update({ status: 'approved' }).eq('id', edit.id)
      if (error) {
        setError('Failed to approve edit')
      } else {
        setSuccess('Store edit approved and applied!')
        setStoreEdits(prev => prev.filter(e => e.id !== edit.id))
      }
    } catch (err) {
      console.error('Error approving store edit:', err)
      setError('Failed to approve store edit')
    } finally {
      setProcessingStoreEdit(null)
    }
  }

  const handleApproveLibraryEdit = async (edit: { id: string; library_id: string; edit_payload?: Record<string, unknown> | null }) => {
    try {
      setProcessingLibraryEdit(edit.id)
      setError(null)
      setSuccess(null)

      const payload = edit.edit_payload as { name?: string; city?: string; state?: string | null; country?: string; address?: string; email?: string | null; website?: string | null; notes?: string | null; tag_ids?: string[] } | undefined
      if (payload && edit.library_id) {
        const { name, city, state, country, address, email, website, notes, tag_ids } = payload
        const { error: updateError } = await supabase
          .from('libraries')
          .update({
            ...(name != null && { name }),
            ...(city != null && { city }),
            ...(state !== undefined && { state }),
            ...(country != null && { country }),
            ...(address != null && { address }),
            ...(email !== undefined && { email }),
            ...(website !== undefined && { website }),
            ...(notes !== undefined && { notes }),
            updated_at: new Date().toISOString()
          })
          .eq('id', edit.library_id)
        if (updateError) {
          setError('Failed to apply library changes')
          return
        }
        if (Array.isArray(tag_ids)) {
          const { error: deleteTagError } = await supabase
            .from('library_tags')
            .delete()
            .eq('library_id', edit.library_id)
          if (deleteTagError) {
            setError('Failed to remove existing library tags')
            return
          }
          if (tag_ids.length > 0) {
            const { error: insertTagError } = await supabase
              .from('library_tags')
              .insert(tag_ids.map((tag_id: string) => ({ library_id: edit.library_id, tag_id })))
            if (insertTagError) {
              setError('Failed to add library tags')
              return
            }
          }
        }
      }

      const { error } = await supabase.from('locale_edits').update({ status: 'approved' }).eq('id', edit.id)
      if (error) {
        setError('Failed to approve edit')
      } else {
        setSuccess('Library edit approved and applied!')
        setLibraryEdits(prev => prev.filter(e => e.id !== edit.id))
      }
    } catch (err) {
      console.error('Error approving library edit:', err)
      setError('Failed to approve library edit')
    } finally {
      setProcessingLibraryEdit(null)
    }
  }

  const handleApproveEventEdit = async (edit: { id: string; event_id: string; edit_payload?: Record<string, unknown> | null }) => {
    try {
      setProcessingEventEdit(edit.id)
      setError(null)
      setSuccess(null)

      const payload = edit.edit_payload as { name?: string; venue_name?: string | null; city?: string; state?: string | null; country?: string; address?: string; email?: string | null; website?: string | null; social?: string | null; category?: string; start_date?: string; end_date?: string; application_deadline?: string | null; poster_image?: string | null } | undefined
      if (payload && edit.event_id) {
        const { error: updateError } = await supabase
          .from('events')
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
            ...(payload.application_deadline !== undefined && { application_deadline: payload.application_deadline }),
            ...(payload.poster_image !== undefined && { poster_image: payload.poster_image }),
            updated_at: new Date().toISOString()
          })
          .eq('id', edit.event_id)
        if (updateError) {
          setError('Failed to apply event changes')
          return
        }
      }

      const { error } = await supabase.from('locale_edits').update({ status: 'approved' }).eq('id', edit.id)
      if (error) {
        setError('Failed to approve edit')
      } else {
        setSuccess('Event edit approved and applied!')
        setEventEdits(prev => prev.filter(e => e.id !== edit.id))
      }
    } catch (err) {
      console.error('Error approving event edit:', err)
      setError('Failed to approve event edit')
    } finally {
      setProcessingEventEdit(null)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 font-serif">
        <div className="text-stone-500 text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 font-serif">
        <div className="text-center">
          <h1 className="font-gloria text-2xl font-bold text-stone-800 mb-4">Access Denied</h1>
          <p className="text-stone-600 mb-4">You don't have permission to access the admin panel.</p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 font-serif">
      {/* Header */}
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

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Alerts */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full mb-8 overflow-x-auto">
            <TabsTrigger value="stores" className="flex items-center gap-2 whitespace-nowrap">
                              <StoreIcon className="h-4 w-4" />
              Stores ({unapprovedStores.length})
            </TabsTrigger>
            <TabsTrigger value="libraries" className="flex items-center gap-2 whitespace-nowrap">
              <BookOpen className="h-4 w-4" />
              Libraries ({unapprovedLibraries.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2 whitespace-nowrap">
              <Calendar className="h-4 w-4" />
              Events ({unapprovedEvents.length})
            </TabsTrigger>
            <TabsTrigger value="edits" className="flex items-center gap-2 whitespace-nowrap">
              <Edit3 className="h-4 w-4" />
              Edit Suggestions ({storeEdits.length + libraryEdits.length + eventEdits.length})
            </TabsTrigger>
          </TabsList>

          {/* Stores Tab */}
          <TabsContent value="stores" className="space-y-6">
            {/* Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-gloria text-xl font-semibold text-stone-800 mb-2">Store Approval Queue</h2>
                  <p className="text-stone-600">
                    {unapprovedStores.length} store{unapprovedStores.length !== 1 ? 's' : ''} waiting for approval
                  </p>
                </div>
                <Button 
                  onClick={fetchUnapprovedStores} 
                  variant="outline" 
                  disabled={loadingStores}
                  className="border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Refresh
                </Button>
              </div>
            </div>

            {/* Store List */}
            {loadingStores ? (
              <div className="text-center py-12">
                <div className="text-stone-500 text-lg">Loading unapproved stores...</div>
              </div>
            ) : unapprovedStores.length === 0 ? (
              <Card className="bg-white border-stone-200 shadow-sm">
                <CardContent className="p-12 text-center">
                  <StoreIcon className="h-16 w-16 mx-auto mb-4 text-stone-400" />
                  <h3 className="text-xl font-semibold text-stone-800 mb-2">No stores pending approval</h3>
                  <p className="text-stone-600">All submitted stores have been reviewed.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {unapprovedStores.map((store) => (
                  <Card key={store.id} className="bg-white border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl font-semibold text-stone-800 mb-2">{store.name}</CardTitle>
                          <div className="flex items-center text-stone-600 text-sm mb-2">
                            <MapPin className="h-4 w-4 mr-1" />
                            {store.city}, {store.country}
                          </div>
                          <div className="flex items-center text-stone-500 text-sm mb-3">
                            <User className="h-4 w-4 mr-1" />
                            Submitted by: {store.submitted_by ? 'User ID: ' + store.submitted_by.slice(0, 8) + '...' : 'Unknown user'}
                          </div>
                          <div className="flex items-center text-stone-500 text-sm">
                            <Clock className="h-4 w-4 mr-1" />
                            Submitted {new Date(store.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Store Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong className="text-stone-700">Address:</strong>
                            <p className="text-stone-600">{store.address}</p>
                          </div>
                          {store.email && (
                            <div>
                              <strong className="text-stone-700">Email:</strong>
                              <p className="text-stone-600">{store.email}</p>
                            </div>
                          )}
                          {store.website && (
                            <div>
                              <strong className="text-stone-700">Website:</strong>
                              <p className="text-stone-600">
                                <a 
                                  href={store.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-rose-600 hover:text-rose-700 underline"
                                >
                                  {store.website}
                                </a>
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {store.notes && (
                          <div>
                            <strong className="text-stone-700 text-sm">Notes:</strong>
                            <p className="text-stone-600 text-sm mt-1">{store.notes}</p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-stone-100">
                          <Button
                            onClick={() => handleApproveStore(store.id)}
                            disabled={processingStore === store.id}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {processingStore === store.id ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button
                            onClick={() => handleRejectStore(store.id)}
                            disabled={processingStore === store.id}
                            variant="destructive"
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-2" />
                            {processingStore === store.id ? 'Rejecting...' : 'Reject'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Libraries Tab */}
          <TabsContent value="libraries" className="space-y-6">
            {/* Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-gloria text-xl font-semibold text-stone-800 mb-2">Library Approval Queue</h2>
                  <p className="text-stone-600">
                    {unapprovedLibraries.length} librar{unapprovedLibraries.length !== 1 ? 'ies' : 'y'} waiting for approval
                  </p>
                </div>
                <Button 
                  onClick={fetchUnapprovedLibraries} 
                  variant="outline" 
                  disabled={loadingLibraries}
                  className="border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Refresh
                </Button>
              </div>
            </div>

            {/* Library List */}
            {loadingLibraries ? (
              <div className="text-center py-12">
                <div className="text-stone-500 text-lg">Loading unapproved libraries...</div>
              </div>
            ) : unapprovedLibraries.length === 0 ? (
              <Card className="bg-white border-stone-200 shadow-sm">
                <CardContent className="p-12 text-center">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-blue-400" />
                  <h3 className="text-xl font-semibold text-stone-800 mb-2">No libraries pending approval</h3>
                  <p className="text-stone-600">All submitted libraries have been reviewed.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {unapprovedLibraries.map((library) => (
                  <Card key={library.id} className="bg-white border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl font-semibold text-stone-800 mb-2">{library.name}</CardTitle>
                          <div className="flex items-center text-stone-600 text-sm mb-2">
                            <MapPin className="h-4 w-4 mr-1" />
                            {library.city}{library.state && `, ${library.state}`}, {library.country}
                          </div>
                          <div className="flex items-center text-stone-500 text-sm mb-3">
                            <User className="h-4 w-4 mr-1" />
                            Submitted by: {library.submitted_by ? 'User ID: ' + library.submitted_by.slice(0, 8) + '...' : 'Unknown user'}
                          </div>
                          <div className="flex items-center text-stone-500 text-sm">
                            <Clock className="h-4 w-4 mr-1" />
                            Submitted {new Date(library.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Library Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong className="text-stone-700">Address:</strong>
                            <p className="text-stone-600">{library.address}</p>
                          </div>
                          {library.email && (
                            <div>
                              <strong className="text-stone-700">Email:</strong>
                              <p className="text-stone-600">{library.email}</p>
                            </div>
                          )}
                          {library.website && (
                            <div>
                              <strong className="text-stone-700">Website:</strong>
                              <p className="text-stone-600">
                                <a 
                                  href={library.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 underline"
                                >
                                  {library.website}
                                </a>
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {library.notes && (
                          <div>
                            <strong className="text-stone-700 text-sm">Notes:</strong>
                            <p className="text-stone-600 text-sm mt-1">{library.notes}</p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-stone-100">
                          <Button
                            onClick={() => handleApproveLibrary(library.id)}
                            disabled={processingLibrary === library.id}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {processingLibrary === library.id ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button
                            onClick={() => handleRejectLibrary(library.id)}
                            disabled={processingLibrary === library.id}
                            variant="destructive"
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-2" />
                            {processingLibrary === library.id ? 'Rejecting...' : 'Reject'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            {/* Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-gloria text-xl font-semibold text-stone-800 mb-2">Event Approval Queue</h2>
                  <p className="text-stone-600">
                    {unapprovedEvents.length} event{unapprovedEvents.length !== 1 ? 's' : ''} waiting for approval
                  </p>
                </div>
                <Button 
                  onClick={fetchUnapprovedEvents} 
                  variant="outline" 
                  disabled={loadingEvents}
                  className="border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Refresh
                </Button>
              </div>
            </div>

            {/* Event List */}
            {loadingEvents ? (
              <div className="text-center py-12">
                <div className="text-stone-500 text-lg">Loading unapproved events...</div>
              </div>
            ) : unapprovedEvents.length === 0 ? (
              <Card className="bg-white border-stone-200 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Calendar className="h-16 w-16 mx-auto mb-4 text-[#009035]" />
                  <h3 className="text-xl font-semibold text-stone-800 mb-2">No events pending approval</h3>
                  <p className="text-stone-600">All submitted events have been reviewed.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {unapprovedEvents.map((event) => (
                  <Card key={event.id} className="bg-white border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl font-semibold text-stone-800 mb-2">{event.name}</CardTitle>
                          <div className="flex items-center text-stone-600 text-sm mb-2">
                            {event.venue_name && (
                              <div className="flex items-center text-stone-600 text-sm mb-1">
                                <Landmark className="h-4 w-4 mr-1" />
                                <span className="font-medium">{event.venue_name}</span>
                              </div>
                            )}
                            <div className="flex items-center text-stone-600 text-sm mb-2">
                              <MapPin className="h-4 w-4 mr-1" />
                              {event.city}{event.state && `, ${event.state}`}, {event.country}
                            </div>                          </div>
                          <div className="flex items-center text-stone-500 text-sm mb-2">
                            <Calendar className="h-4 w-4 mr-1" />
                            {getEventCategoryDisplay(event.category)} • {new Date(event.start_date).toLocaleDateString()}
                            {event.start_date !== event.end_date && ` - ${new Date(event.end_date).toLocaleDateString()}`}
                          </div>
                          <div className="flex items-center text-stone-500 text-sm mb-3">
                            <User className="h-4 w-4 mr-1" />
                            Submitted by: {event.submitted_by ? 'User ID: ' + event.submitted_by.slice(0, 8) + '...' : 'Unknown user'}
                          </div>
                          <div className="flex items-center text-stone-500 text-sm">
                            <Clock className="h-4 w-4 mr-1" />
                            Submitted {new Date(event.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Event Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong className="text-stone-700">Address:</strong>
                            <p className="text-stone-600">{event.address}</p>
                          </div>
                          {event.email && (
                            <div>
                              <strong className="text-stone-700">Email:</strong>
                              <p className="text-stone-600">{event.email}</p>
                            </div>
                          )}
                          {event.website && (
                            <div>
                              <strong className="text-stone-700">Website:</strong>
                              <p className="text-stone-600">
                                <a 
                                  href={event.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 underline"
                                >
                                  {event.website}
                                </a>
                              </p>
                            </div>
                          )}
                          {event.social && (
                            <div>
                              <strong className="text-stone-700">Social Media:</strong>
                              <p className="text-stone-600">{event.social}</p>
                            </div>
                          )}
                          {event.application_deadline && (
                            <div>
                              <strong className="text-stone-700">Application Deadline:</strong>
                              <p className="text-stone-600">{new Date(event.application_deadline).toLocaleDateString()}</p>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {event.notes && (
                          <div>
                            <strong className="text-stone-700 text-sm">Notes:</strong>
                            <p className="text-stone-600 text-sm mt-1">{event.notes}</p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-stone-100">
                          <Button
                            onClick={() => handleApproveEvent(event.id)}
                            disabled={processingEvent === event.id}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {processingEvent === event.id ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button
                            onClick={() => handleRejectEvent(event.id)}
                            disabled={processingEvent === event.id}
                            variant="destructive"
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-2" />
                            {processingEvent === event.id ? 'Rejecting...' : 'Reject'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Edits Tab */}
          <TabsContent value="edits" className="space-y-6">
            {/* Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-gloria text-xl font-semibold text-stone-800 mb-2">Edit Suggestions</h2>
                  <p className="text-stone-600">
                    {storeEdits.length + libraryEdits.length + eventEdits.length} edit suggestion{storeEdits.length + libraryEdits.length + eventEdits.length !== 1 ? 's' : ''} waiting for review
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    fetchStoreEdits();
                    fetchLibraryEdits();
                    fetchEventEdits();
                  }} 
                  variant="outline" 
                  disabled={loadingStoreEdits || loadingLibraryEdits || loadingEventEdits}
                  className="border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Refresh All
                </Button>
              </div>
            </div>

            {/* Edit List */}
            {loadingStoreEdits || loadingLibraryEdits || loadingEventEdits ? (
              <div className="text-center py-12">
                <div className="text-stone-500 text-lg">Loading edit suggestions...</div>
              </div>
            ) : (storeEdits.length + libraryEdits.length + eventEdits.length) === 0 ? (
              <Card className="bg-white border-stone-200 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Edit3 className="h-16 w-16 mx-auto mb-4 text-stone-400" />
                  <h3 className="text-xl font-semibold text-stone-800 mb-2">No edit suggestions</h3>
                  <p className="text-stone-600">All edit suggestions have been reviewed.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Store Edits */}
                {storeEdits.map((edit) => (
                  <Card key={`store-${edit.id}`} className="bg-white border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl font-semibold text-stone-800 mb-2">
                            <Badge variant="outline" className="mr-2 text-xs">Store</Badge>
                            Edit for: {edit.stores?.name || 'Unknown Store'}
                          </CardTitle>
                          <div className="flex items-center text-stone-600 text-sm mb-2">
                            <MapPin className="h-4 w-4 mr-1" />
                            {edit.stores?.city}, {edit.stores?.country}
                          </div>
                          <div className="flex items-center text-stone-500 text-sm mb-3">
                            <User className="h-4 w-4 mr-1" />
                            Suggested by: User ID: {edit.user_id?.slice(0, 8)}...
                          </div>
                          <div className="flex items-center text-stone-500 text-sm">
                            <Clock className="h-4 w-4 mr-1" />
                            Suggested {new Date(edit.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Edit Summary */}
                        <div>
                          <strong className="text-stone-700 text-sm">Suggested Changes:</strong>
                          <div className="mt-2 p-3 bg-stone-50 rounded-lg border border-stone-200">
                            <pre className="text-sm text-stone-700 whitespace-pre-wrap font-mono">{edit.edit_summary}</pre>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-stone-100">
                          <Button
                            onClick={() => handleApproveStoreEdit(edit)}
                            disabled={processingStoreEdit === edit.id}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {processingStoreEdit === edit.id ? 'Applying...' : 'Approve Edit'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Library Edits */}
                {libraryEdits.map((edit) => (
                  <Card key={`library-${edit.id}`} className="bg-white border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl font-semibold text-stone-800 mb-2">
                            <Badge variant="outline" className="mr-2 text-xs">Library</Badge>
                            Edit for: {edit.libraries?.name || 'Unknown Library'}
                          </CardTitle>
                          <div className="flex items-center text-stone-600 text-sm mb-2">
                            <MapPin className="h-4 w-4 mr-1" />
                            {edit.libraries?.city}, {edit.libraries?.country}
                          </div>
                          <div className="flex items-center text-stone-500 text-sm mb-3">
                            <User className="h-4 w-4 mr-1" />
                            Suggested by: User ID: {edit.user_id?.slice(0, 8)}...
                          </div>
                          <div className="flex items-center text-stone-500 text-sm">
                            <Clock className="h-4 w-4 mr-1" />
                            Suggested {new Date(edit.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Edit Summary */}
                        <div>
                          <strong className="text-stone-700 text-sm">Suggested Changes:</strong>
                          <div className="mt-2 p-3 bg-stone-50 rounded-lg border border-stone-200">
                            <pre className="text-sm text-stone-700 whitespace-pre-wrap font-mono">{edit.edit_summary}</pre>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-stone-100">
                          <Button
                            onClick={() => handleApproveLibraryEdit(edit)}
                            disabled={processingLibraryEdit === edit.id}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {processingLibraryEdit === edit.id ? 'Applying...' : 'Approve Edit'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Event Edits */}
                {eventEdits.map((edit) => (
                  <Card key={`event-${edit.id}`} className="bg-white border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl font-semibold text-stone-800 mb-2">
                            <Badge variant="outline" className="mr-2 text-xs">Event</Badge>
                            Edit for: {edit.events?.name || 'Unknown Event'}
                          </CardTitle>
                          <div className="flex items-center text-stone-600 text-sm mb-2">
                            <MapPin className="h-4 w-4 mr-1" />
                            {edit.events?.city}, {edit.events?.country}
                          </div>
                          <div className="flex items-center text-stone-500 text-sm mb-3">
                            <User className="h-4 w-4 mr-1" />
                            Suggested by: User ID: {edit.user_id?.slice(0, 8)}...
                          </div>
                          <div className="flex items-center text-stone-500 text-sm">
                            <Clock className="h-4 w-4 mr-1" />
                            Suggested {new Date(edit.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Edit Summary */}
                        <div>
                          <strong className="text-stone-700 text-sm">Suggested Changes:</strong>
                          <div className="mt-2 p-3 bg-stone-50 rounded-lg border border-stone-200">
                            <pre className="text-sm text-stone-700 whitespace-pre-wrap font-mono">{edit.edit_summary}</pre>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-stone-100">
                          <Button
                            onClick={() => handleApproveEventEdit(edit)}
                            disabled={processingEventEdit === edit.id}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {processingEventEdit === edit.id ? 'Applying...' : 'Approve Edit'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 