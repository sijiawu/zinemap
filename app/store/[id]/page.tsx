"use client"

import { ArrowLeft, MapPin, Mail, Globe, CheckCircle, AlertCircle, MessageSquare, User, Calendar, Edit, X, Save, FileText, Trash2, Heart, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useParams } from "next/navigation"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"

interface Store {
  id: string
  name: string
  state: string
  city: string
  country: string
  address: string
  email?: string
  website?: string
  notes?: string
  has_stocked_before: boolean
  submitted_by: string
  created_at: string
  updated_at: string
  permalink?: string
  latitude?: number
  longitude?: number
}

interface StoreTag {
  id: string
  store_id: string
  tag_id: string
  tag: {
    id: string
    label: string
    category: string
  }
}

interface CommunityNote {
  id: string
  store_id: string
  user_id: string | null
  text: string
  anonymous: boolean
  has_stocked_here: boolean
  submitted_at: string
  user?: {
    display_name: string | null
    email: string
  }
}

export default function StoreDetailPage() {
  console.log('StoreDetailPage rendering')
  const params = useParams()
  const { user } = useSupabaseUser()
  const [store, setStore] = useState<Store | null>(null)
  const [storeTags, setStoreTags] = useState<StoreTag[]>([])
  const [notes, setNotes] = useState<CommunityNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  
  // Note form state
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [hasStockedHere, setHasStockedHere] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [noteSubmitted, setNoteSubmitted] = useState(false)
  const [userHasNote, setUserHasNote] = useState(false)
  
  // Edit note state
  const [editingNote, setEditingNote] = useState<CommunityNote | null>(null)
  const [editText, setEditText] = useState("")
  const [editAnonymous, setEditAnonymous] = useState(false)
  const [editHasStockedHere, setEditHasStockedHere] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  
  // Delete note state
  const [deletingNote, setDeletingNote] = useState<CommunityNote | null>(null)
  
  // Store submitter state
  const [storeSubmitter, setStoreSubmitter] = useState<{ display_name: string | null; email: string } | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    const fetchStore = async () => {
      if (!params.id) return

      try {
        setLoading(true)
        setError(null)

        // First try to find by permalink (approved stores only)
        let { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('permalink', params.id)
          .eq('approved', true)
          .single()

        // If not found by permalink, try by ID (approved stores only)
        if (!storeData && storeError) {
          const { data: storeById, error: storeByIdError } = await supabase
            .from('stores')
            .select('*')
            .eq('id', params.id)
            .eq('approved', true)
            .single()

          if (storeByIdError) {
            throw new Error('Store not found')
          }
          storeData = storeById
        }

        if (storeData) {
          console.log('Store data fetched:', storeData)
          console.log('Store ID from database:', storeData.id)
          console.log('Store ID type:', typeof storeData.id)
          setStore(storeData)

          // Fetch store submitter's information
          if (storeData.submitted_by) {
            const { data: submitterData, error: submitterError } = await supabase
              .from('profiles')
              .select('display_name, email')
              .eq('id', storeData.submitted_by)
              .single()

            if (!submitterError && submitterData) {
              setStoreSubmitter(submitterData)
              
              // Check if submitter is the owner (email matches store email)
              if (storeData.email && submitterData.email === storeData.email) {
                setIsOwner(true)
              }
            }
          }

          // Fetch store tags
          const { data: tagsData, error: tagsError } = await supabase
            .from('store_tags')
            .select(`
              id,
              store_id,
              tag_id,
              tags!inner(id, label, category)
            `)
            .eq('store_id', storeData.id)

          if (!tagsError && tagsData) {
            // Transform the data to match our interface
            const transformedTags = tagsData.map((item: any) => ({
              id: item.id,
              store_id: item.store_id,
              tag_id: item.tag_id,
              tag: item.tags
            }))
            setStoreTags(transformedTags)
          }

          // Fetch store notes
          const { data: notesData, error: notesError } = await supabase
            .from('community_notes')
            .select(`
              id,
              store_id,
              user_id,
              text,
              anonymous,
              has_stocked_here,
              submitted_at
            `)
            .eq('store_id', storeData.id)
            .order('submitted_at', { ascending: false })

          console.log('Notes query result:', { notesData, notesError, storeId: storeData.id })

          if (notesError) {
            console.warn('Error fetching notes (table may not exist yet):', notesError)
            // Continue without notes if table doesn't exist
            setNotes([])
          } else if (notesData) {
            console.log('Raw notes data:', notesData)
            
            // Fetch user profiles for notes that have user_id
            const userIds = notesData
              .filter((note: any) => note.user_id && !note.anonymous)
              .map((note: any) => note.user_id)
            
            let userProfiles: any = {}
            if (userIds.length > 0) {
              const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, display_name, email')
                .in('id', userIds)
              
              if (profilesData) {
                userProfiles = profilesData.reduce((acc: any, profile: any) => {
                  acc[profile.id] = profile
                  return acc
                }, {})
              }
            }
            
            const transformedNotes = notesData.map((note: any) => ({
              id: note.id,
              store_id: note.store_id,
              user_id: note.user_id,
              text: note.text,
              anonymous: note.anonymous,
              has_stocked_here: note.has_stocked_here || false,
              submitted_at: note.submitted_at,
              user: note.user_id && !note.anonymous ? userProfiles[note.user_id] : null
            }))
            console.log('Transformed notes:', transformedNotes)
            setNotes(transformedNotes)
          }

          // Check if current user has already submitted a note
          if (user) {
            const { data: userNote } = await supabase
              .from('community_notes')
              .select('id')
              .eq('store_id', storeData.id)
              .eq('user_id', user.id)
              .single()

            setUserHasNote(!!userNote)
          }
        }
      } catch (error) {
        console.error('Error fetching store:', error)
        setError('Store not found')
      } finally {
        setLoading(false)
      }
    }

    fetchStore()
  }, [params.id, user?.id])

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('handleNoteSubmit called')
    console.log('Form state:', {
      noteText: noteText,
      isAnonymous: isAnonymous,
      hasStockedHere: hasStockedHere,
      store: store?.id,
      user: user?.id
    })
    
    setNoteError(null)

    if (!noteText.trim()) {
      console.log('No note text provided')
      setNoteError('Please share your experience')
      return
    }

    if (!store) {
      console.log('No store found')
      return
    }

    console.log('About to submit to Supabase...')
    console.log('Store object:', store)
    console.log('Store ID being used:', store.id)
    console.log('Store ID type:', typeof store.id)

    try {
      const { error } = await supabase
        .from('community_notes')
        .insert({
          store_id: store.id,
          user_id: user?.id || null,
          text: noteText.trim(),
          anonymous: isAnonymous,
          has_stocked_here: hasStockedHere
        })

      if (error) {
        console.error('Error submitting note:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        console.error('Submission data:', {
          store_id: store.id,
          user_id: user?.id || null,
          text: noteText.trim(),
          anonymous: isAnonymous,
          has_stocked_here: hasStockedHere
        })
        setNoteError('Failed to submit note. Please try again.')
        return
      }

      setNoteSubmitted(true)
      setShowNoteForm(false)
      setNoteText("")
      setIsAnonymous(false)
      setHasStockedHere(false)
      setUserHasNote(true)

      // Refresh notes
      const { data: notesData } = await supabase
        .from('community_notes')
        .select(`
          id,
          store_id,
          user_id,
          text,
          anonymous,
          has_stocked_here,
          submitted_at
        `)
        .eq('store_id', store.id)
        .order('submitted_at', { ascending: false })

      if (notesData) {
        // Fetch user profiles for notes that have user_id
        const userIds = notesData
          .filter((note: any) => note.user_id && !note.anonymous)
          .map((note: any) => note.user_id)
        
        let userProfiles: any = {}
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, display_name, email')
            .in('id', userIds)
          
          if (profilesData) {
            userProfiles = profilesData.reduce((acc: any, profile: any) => {
              acc[profile.id] = profile
              return acc
            }, {})
          }
        }
        
        const transformedNotes = notesData.map((note: any) => ({
          id: note.id,
          store_id: note.store_id,
          user_id: note.user_id,
          text: note.text,
          anonymous: note.anonymous,
          has_stocked_here: note.has_stocked_here || false,
          submitted_at: note.submitted_at,
          user: note.user_id && !note.anonymous ? userProfiles[note.user_id] : null
        }))
        setNotes(transformedNotes)
      }
    } catch (err) {
      console.error('Error submitting note:', err)
      console.error('Catch block error details:', {
        error: err,
        errorType: typeof err,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        errorStack: err instanceof Error ? err.stack : 'No stack trace'
      })
      console.error('Submission data at time of error:', {
        store_id: store?.id,
        user_id: user?.id || null,
        text: noteText.trim(),
        anonymous: isAnonymous,
        has_stocked_here: hasStockedHere
      })
      setNoteError('Failed to submit note. Please try again.')
    }
  }

  const handleEditNote = (note: CommunityNote) => {
    setEditingNote(note)
    setEditText(note.text)
    setEditAnonymous(note.anonymous)
    setEditHasStockedHere(note.has_stocked_here)
    setEditError(null)
  }

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditError(null)

    if (!editingNote || !editText.trim()) {
      setEditError('Please provide your note text')
      return
    }

    try {
      const { error } = await supabase
        .from('community_notes')
        .update({
          text: editText.trim(),
          anonymous: editAnonymous,
          has_stocked_here: editHasStockedHere
        })
        .eq('id', editingNote.id)
        .eq('user_id', user?.id)

      if (error) {
        console.error('Error updating note:', error)
        setEditError('Failed to update note. Please try again.')
        return
      }

      // Refresh notes
      const { data: notesData } = await supabase
        .from('community_notes')
        .select(`
          id,
          store_id,
          user_id,
          text,
          anonymous,
          has_stocked_here,
          submitted_at
        `)
        .eq('store_id', store?.id)
        .order('submitted_at', { ascending: false })

      if (notesData) {
        // Fetch user profiles for notes that have user_id
        const userIds = notesData
          .filter((note: any) => note.user_id && !note.anonymous)
          .map((note: any) => note.user_id)
        
        let userProfiles: any = {}
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, display_name, email')
            .in('id', userIds)
          
          if (profilesData) {
            userProfiles = profilesData.reduce((acc: any, profile: any) => {
              acc[profile.id] = profile
              return acc
            }, {})
          }
        }
        
        const transformedNotes = notesData.map((note: any) => ({
          id: note.id,
          store_id: note.store_id,
          user_id: note.user_id,
          text: note.text,
          anonymous: note.anonymous,
          has_stocked_here: note.has_stocked_here || false,
          submitted_at: note.submitted_at,
          user: note.user_id && !note.anonymous ? userProfiles[note.user_id] : null
        }))
        setNotes(transformedNotes)
      }

      // Reset edit state
      setEditingNote(null)
      setEditText("")
      setEditAnonymous(false)
      setEditHasStockedHere(false)
    } catch (err) {
      console.error('Error updating note:', err)
      setEditError('Failed to update note. Please try again.')
    }
  }

  const handleCancelEdit = () => {
    setEditingNote(null)
    setEditText("")
    setEditAnonymous(false)
    setEditHasStockedHere(false)
    setEditError(null)
  }

  const handleDeleteNote = (note: CommunityNote) => {
    setDeletingNote(note)
  }

  const confirmDeleteNote = async () => {
    if (!deletingNote) return

    try {
      const { error } = await supabase
        .from('community_notes')
        .delete()
        .eq('id', deletingNote.id)
        .eq('user_id', user?.id)

      if (error) {
        console.error('Error deleting note:', error)
        return
      }

      // Remove from local state
      setNotes(prev => prev.filter(note => note.id !== deletingNote.id))
      
      // Reset user note state if this was their only note
      if (userHasNote) {
        setUserHasNote(false)
      }
      
      setDeletingNote(null)
    } catch (err) {
      console.error('Error deleting note:', err)
    }
  }

  const cancelDeleteNote = () => {
    setDeletingNote(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500 text-lg">Loading store...</div>
      </div>
    )
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-stone-400" />
            <h1 className="text-2xl font-bold text-stone-800 mb-2">Store Not Found</h1>
            <p className="text-stone-600 mb-6">The store you're looking for doesn't exist or has been removed.</p>
            <Link href="/">
              <Button className="bg-rose-500 hover:bg-rose-600 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Map
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Group tags by category
  const tagsByCategory = storeTags.reduce((acc, storeTag) => {
    const category = storeTag.tag.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(storeTag.tag)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="min-h-screen bg-stone-50 font-serif">
      {/* Header with back button */}
      <div className="bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-stone-600 hover:text-stone-800 hover:bg-stone-100">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to map
            </Button>
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Store header */}
        <div className="text-center space-y-4">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-stone-200">
            <div className="flex flex-col items-center gap-4 mb-4">
              <h2 className="text-4xl md:text-5xl font-bold text-stone-800 tracking-tight">{store.name}</h2>
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                {isOwner ? (
                  <>
                    <Store className="h-3 w-3 mr-1" />
                    Added by shop staff
                  </>
                ) : (
                  <>
                    <Heart className="h-3 w-3 mr-1" />
                    Community submitted
                  </>
                )}
              </Badge>
            </div>

            <div className="flex justify-center items-center gap-2 text-xl text-stone-600 mb-3">
              <MapPin className="h-5 w-5 text-rose-500" />
              <span>
                {store.city}, {store.state}, {store.country}
              </span>
            </div>

            <div className="flex justify-center items-center gap-6 text-sm text-stone-500">
              <span>
                Last updated {new Date(store.updated_at || store.created_at).toLocaleDateString()}
                {/* {storeSubmitter && (
                  <span>
                    {' by '}
                    <span className="font-medium">
                      {storeSubmitter.display_name || storeSubmitter.email?.split('@')[0] || 'Anonymous'}
                    </span>
                  </span>
                )} */}
              </span>
            </div>
          </div>
        </div>

        {/* Address and Contact */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-white border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-stone-800 text-lg">
                <MapPin className="h-5 w-5 mr-2 text-rose-500" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-stone-700 leading-relaxed bg-stone-50 p-4 rounded-lg">
                <p className="font-medium">{store.address}</p>
                <p className="text-stone-500">{store.city}, {store.state}, {store.country}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-stone-800 text-lg">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-stone-50 p-4 rounded-lg space-y-3">
                {store.email && (
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-stone-400 flex-shrink-0" />
                    <a
                      href={`mailto:${store.email}`}
                      className="text-stone-700 hover:text-rose-600 transition-colors underline decoration-rose-200 hover:decoration-rose-400"
                    >
                      {store.email}
                    </a>
                  </div>
                )}
                {store.website && (
                  <div className="flex items-center space-x-3">
                    <Globe className="h-4 w-4 text-stone-400 flex-shrink-0" />
                    <a
                      href={store.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-700 hover:text-rose-600 transition-colors underline decoration-rose-200 hover:decoration-rose-400"
                    >
                      {store.website.replace("https://", "").replace("www.", "")}
                    </a>
                  </div>
                )}
                {!store.email && !store.website && (
                  <p className="text-stone-500 text-sm italic">No contact information available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Consignment Terms */}
        {Object.keys(tagsByCategory).length > 0 && (
          <Card className="bg-white border border-rose-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-stone-800 text-xl flex items-center">
                <FileText className="h-5 w-5 mr-2 text-rose-600" />
                Consignment Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-6 text-stone-700">
                {Object.entries(tagsByCategory).map(([category, tags]) => (
                  <div key={category} className="space-y-4">
                    <div className="bg-stone-50 p-4 rounded-lg border border-rose-100">
                      <h4 className="font-semibold text-stone-800 mb-2 capitalize">{category}</h4>
                      <div className="space-y-1">
                        {tags.map((tag) => (
                          <p key={tag.id} className="text-sm">{tag.label}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Share Your Experience */}
        <Card className="bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-stone-800 text-xl flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-rose-600" />
              Community Notes ({notes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Note List */}
            {notes.length > 0 && (
              <div className="space-y-4 mb-6">
                {notes.map((note) => (
                  <div key={note.id} className="bg-white p-4 rounded-lg border border-rose-100">
                    {editingNote?.id === note.id ? (
                      // Edit form
                      <form onSubmit={handleUpdateNote} className="space-y-4">
                        <div>
                          <Label htmlFor="editNote" className="text-sm font-medium text-stone-700">
                            Your Note *
                          </Label>
                          <Textarea
                            id="editNote"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            placeholder="Share your experience at this store..."
                            className="mt-1 min-h-[120px]"
                            maxLength={1000}
                            required
                          />
                          <div className="text-xs text-stone-500 text-right">
                            {editText.length}/1000 characters
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row justify-end gap-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="editHasStockedHere"
                                checked={editHasStockedHere}
                                onCheckedChange={(checked) => setEditHasStockedHere(checked as boolean)}
                              />
                              <Label htmlFor="editHasStockedHere" className="text-sm text-stone-600">
                                I have stocked zines at this location
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="editAnonymous"
                                checked={editAnonymous}
                                onCheckedChange={(checked) => setEditAnonymous(checked as boolean)}
                              />
                              <Label htmlFor="editAnonymous" className="text-sm text-stone-600">
                                Submit anonymously
                              </Label>
                            </div>
                          </div>
                        </div>

                        {editError && (
                          <div className="text-red-600 text-sm">{editError}</div>
                        )}

                        <div className="flex flex-col sm:flex-row justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            className="border-stone-300 text-stone-700 hover:bg-stone-50"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            className="bg-rose-500 hover:bg-rose-600 text-white"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    ) : (
                      // Display note
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                          <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
                            {!note.anonymous && note.user && (
                              <span>{note.user.display_name || note.user.email?.split('@')[0] || 'Anonymous'}</span>
                            )}
                            {note.anonymous && (
                              <span>Anonymous</span>
                            )}
                            <span>|</span>
                            <span>{new Date(note.submitted_at).toLocaleDateString()}</span>
                            {note.has_stocked_here && (
                              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs">
                                has stocked zines here
                              </Badge>
                            )}
                          </div>
                          {user && note.user_id === user.id && (
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditNote(note)}
                                className="text-stone-500 hover:text-stone-700"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteNote(note)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <p className="text-stone-700 leading-relaxed">{note.text}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* No notes message */}
            {notes.length === 0 && !loading && (
              <div className="text-center py-4 mb-6">
                <p className="text-stone-500 text-sm">No community notes yet. Be the first to share your experience!</p>
              </div>
            )}

            {/* Note Submission */}
            {noteSubmitted ? (
              <div className="bg-rose-100 p-4 rounded-lg border border-rose-200">
                <p className="text-rose-700 text-sm font-medium">Thank you for sharing your experience!</p>
              </div>
            ) : userHasNote ? (
              <div className="bg-stone-100 p-4 rounded-lg border border-stone-200">
                <p className="text-stone-600 text-sm">You’ve already added a community note for this place.
                Feel free to edit it if anything’s changed.</p>
              </div>
            ) : showNoteForm ? (
              <form onSubmit={handleNoteSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="note" className="text-sm font-medium text-stone-700">
                    Your Note *
                  </Label>
                  <Textarea
                    id="note"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Tell us what it was like working with or visiting this place, or anything else you think others should know."
                    className="mt-1 min-h-[120px]"
                    maxLength={1000}
                    required
                  />
                  <div className="text-xs text-stone-500 text-right">
                    {noteText.length}/1000 characters
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row justify-end gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasStockedHere"
                        checked={hasStockedHere}
                        onCheckedChange={(checked) => setHasStockedHere(checked as boolean)}
                      />
                      <Label htmlFor="hasStockedHere" className="text-sm text-stone-600">
                        I have stocked zines at this location
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="anonymous"
                        checked={isAnonymous}
                        onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                      />
                      <Label htmlFor="anonymous" className="text-sm text-stone-600">
                        Submit anonymously
                      </Label>
                    </div>
                  </div>
                </div>

                {noteError && (
                  <div className="text-red-600 text-sm">{noteError}</div>
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowNoteForm(false)
                      setNoteText("")
                      setIsAnonymous(false)
                      setHasStockedHere(false)
                      setNoteError(null)
                    }}
                    className="border-stone-300 text-stone-700 hover:bg-stone-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-rose-500 hover:bg-rose-600 text-white"
                    onClick={() => console.log('Submit button clicked')}
                  >
                    Submit
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center">
                {user ? (
                  <Button
                    onClick={() => setShowNoteForm(true)}
                    className="bg-rose-500 hover:bg-rose-600 text-white"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Share Your Experience
                  </Button>
                ) : (
                  <Link href="/login">
                    <Button className="bg-rose-500 hover:bg-rose-600 text-white">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Sign in to Share Your Experience
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Community contribution note */}
        <div className="text-center pt-8 border-t border-stone-200">
          <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm max-w-lg w-full mx-auto">
            {feedbackSubmitted ? (
              <p className="text-green-600 text-sm">Thank you for your feedback!</p>
            ) : showFeedbackForm ? (
              <form
                onSubmit={async e => {
                  e.preventDefault()
                  setFeedbackError(null)
                  try {
                    const { error } = await supabase.from('store_feedback').insert([
                      {
                        store_id: store.id,
                        feedback,
                        user_id: user?.id || null,
                        // Optionally, add user_agent, etc.
                      }
                    ])
                    if (error) {
                      setFeedbackError('There was a problem submitting your feedback. Please try again.')
                      return
                    }
                    setFeedbackSubmitted(true)
                    setShowFeedbackForm(false)
                    setFeedback("")
                  } catch (err) {
                    setFeedbackError('There was a problem submitting your feedback. Please try again.')
                  }
                }}
                className="space-y-2"
              >
                <textarea
                  className="w-full border border-stone-300 rounded p-2 text-sm min-h-[120px]"
                  rows={6}
                  placeholder="Share your experience at this store, or let us know what's outdated, incorrect, or missing..."
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  required
                />
                {feedbackError && <div className="text-red-600 text-xs">{feedbackError}</div>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="text-xs text-stone-500 hover:text-stone-700 underline"
                    onClick={() => setShowFeedbackForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-rose-500 hover:bg-rose-600 text-white text-xs px-4 py-1 rounded"
                  >
                    Submit
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-stone-600 text-sm">
                Is any information outdated, incorrect, or missing?{" "}
                <button
                  className="text-rose-600 hover:text-rose-700 underline decoration-rose-200 hover:decoration-rose-400"
                  onClick={() => setShowFeedbackForm(true)}
                >
                  Send us a message
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-stone-800 mb-4">Delete Community Note</h3>
            <p className="text-stone-600 mb-6">
              Are you sure you want to delete your community note? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={cancelDeleteNote}
                className="border-stone-300 text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteNote}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
