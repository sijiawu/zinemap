"use client"

import { ArrowLeft, MapPin, Mail, Globe, CheckCircle, AlertCircle, MessageSquare, User, Calendar, Edit, X, Save, FileText, Trash2, Heart, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"

import { Library, LibraryTag, CommunityNote } from "@/lib/types"
import { SaveButton } from "@/components/SaveButton"
import { getTagCategoryDisplay, sortTagsByConfiguredOrder } from "@/lib/utils"
import { PageLoader } from "@/components/loading/PageLoader"

export default function LibraryDetailClient({ libraryId }: { libraryId: string }) {
  const { user } = useSupabaseUser()
  const [library, setLibrary] = useState<Library | null>(null)
  const [libraryTags, setLibraryTags] = useState<LibraryTag[]>([])
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
  const [hasVisitedHere, setHasVisitedHere] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [noteSubmitted, setNoteSubmitted] = useState(false)
  const [userHasNote, setUserHasNote] = useState(false)
  
  // Edit note state
  const [editingNote, setEditingNote] = useState<CommunityNote | null>(null)
  const [editText, setEditText] = useState("")
  const [editAnonymous, setEditAnonymous] = useState(false)
  const [editHasVisitedHere, setEditHasVisitedHere] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  
  // Delete note state
  const [deletingNote, setDeletingNote] = useState<CommunityNote | null>(null)
  
  // Library submitter state
  const [librarySubmitter, setLibrarySubmitter] = useState<{ display_name: string | null; email: string } | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    const fetchLibrary = async () => {
      if (!libraryId) return

      try {
        setLoading(true)
        setError(null)

        // First try to find by permalink (approved libraries only)
        let { data: libraryData, error: libraryError } = await supabase
          .from('libraries')
          .select('*')
          .eq('permalink', libraryId)
          .eq('approved', true)
          .single()

        // If not found by permalink, try by ID (approved libraries only)
        if (!libraryData && libraryError) {
          const { data: libraryById, error: libraryByIdError } = await supabase
            .from('libraries')
            .select('*')
            .eq('id', libraryId)
            .eq('approved', true)
            .single()

          if (libraryByIdError) {
            throw new Error('Library not found')
          }
          libraryData = libraryById
        }

        if (libraryData) {
          setLibrary(libraryData)

          // Fetch library submitter's information
          if (libraryData.submitted_by) {
            const { data: submitterData, error: submitterError } = await supabase
              .from('profiles')
              .select('display_name, email')
              .eq('id', libraryData.submitted_by)
              .single()
            
            if (!submitterError && submitterData) {
              setLibrarySubmitter(submitterData)
              
              // Check if submitter is the owner (email matches library email)
              if (libraryData.email && submitterData.email?.toLowerCase() === libraryData.email?.toLowerCase()) {
                setIsOwner(true)
              }
            }
          }

          // Fetch library tags
          const { data: tagsData, error: tagsError } = await supabase
            .from('library_tags')
            .select(`
              id,
              library_id,
              tag_id,
              tags!inner(id, label, category)
            `)
            .eq('library_id', libraryData.id)

          if (!tagsError && tagsData) {
            // Transform the data to match our interface
            const transformedTags = tagsData.map((item: any) => ({
              id: item.id,
              library_id: item.library_id,
              tag_id: item.tag_id,
              tag: item.tags
            }))
            setLibraryTags(transformedTags)
          }

          // Fetch library notes
          const { data: notesData, error: notesError } = await supabase
            .from('community_notes')
            .select(`
              id,
              library_id,
              user_id,
              text,
              anonymous,
              has_stocked_here,
              submitted_at
            `)
            .eq('library_id', libraryData.id)
            .order('submitted_at', { ascending: true })



          if (notesError) {
            console.warn('Error fetching notes (table may not exist yet):', notesError)
            // Continue without notes if table doesn't exist
            setNotes([])
          } else if (notesData) {

            
            // Fetch user profiles for notes that have user_id
            const userIds = notesData
              .filter((note: any) => note.user_id && !note.anonymous)
              .map((note: any) => note.user_id)
            
            let userProfiles: any = {}
            if (userIds.length > 0) {
              const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, display_name, email, profile_image, permalink')
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
              library_id: note.library_id,
              user_id: note.user_id,
              text: note.text,
              anonymous: note.anonymous,
              has_stocked_here: note.has_stocked_here || false,
              submitted_at: note.submitted_at,
              user: note.user_id && !note.anonymous ? userProfiles[note.user_id] : null
            }))

            setNotes(transformedNotes)
          }

          // Check if current user has already submitted a note
          if (user) {
            const { data: userNote } = await supabase
              .from('community_notes')
              .select('id')
              .eq('library_id', libraryData.id)
              .eq('user_id', user.id)
              .single()

            setUserHasNote(!!userNote)
          }
        }
      } catch (error) {
        console.error('Error fetching library:', error)
        setError('Library not found')
      } finally {
        setLoading(false)
      }
    }

    fetchLibrary()
  }, [libraryId, user?.id])

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setNoteError(null)

    if (!noteText.trim()) {
      setNoteError('Please share your experience')
      return
    }

    if (!library) {
      return
    }

    if (!user) {
      setNoteError('You must be logged in to submit a note')
      return
    }

    try {
      const { error } = await supabase
        .from('community_notes')
        .insert({
          library_id: library.id,
          store_id: null,
          user_id: user?.id || null,
          text: noteText.trim(),
          anonymous: isAnonymous,
          has_stocked_here: hasVisitedHere,
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
          library_id: library.id,
          store_id: null,
          user_id: user?.id || null,
          text: noteText.trim(),
          anonymous: isAnonymous,
          has_stocked_here: hasVisitedHere,
        })
        setNoteError(`Failed to submit note: ${error.message}`)
        return
      }

      setNoteSubmitted(true)
      setShowNoteForm(false)
      setNoteText("")
      setIsAnonymous(false)
      setHasVisitedHere(false)
      setUserHasNote(true)

      // Refresh notes
      const { data: notesData } = await supabase
        .from('community_notes')
        .select(`
          id,
          library_id,
          user_id,
          text,
          anonymous,
          has_stocked_here,
          submitted_at
        `)
        .eq('library_id', library.id)
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
            .select('id, display_name, email, profile_image, permalink')
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
          library_id: note.library_id,
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
        library_id: library?.id,
        user_id: user?.id || null,
        text: noteText.trim(),
        anonymous: isAnonymous,
        has_stocked_here: hasVisitedHere
      })
      setNoteError('Failed to submit note. Please try again.')
    }
  }

  const handleEditNote = (note: CommunityNote) => {
    setEditingNote(note)
    setEditText(note.text)
    setEditAnonymous(note.anonymous)
    setEditHasVisitedHere(note.has_stocked_here)
    setEditError(null)
  }

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditError(null)

    if (!editingNote || !editText.trim()) {
      setEditError('Please provide note text')
      return
    }

    try {
      const { error } = await supabase
        .from('community_notes')
        .update({
          text: editText.trim(),
          anonymous: editAnonymous,
          has_stocked_here: editHasVisitedHere
        })
        .eq('id', editingNote.id)
        .eq('user_id', user?.id)

      if (error) {
        console.error('Error updating note:', error)
        setEditError('Failed to update note. Please try again.')
        return
      }

      // Update local state
      setNotes(prev => prev.map(note => 
        note.id === editingNote.id 
          ? { ...note, text: editText.trim(), anonymous: editAnonymous, has_stocked_here: editHasVisitedHere }
          : note
      ))

      // Reset edit state
      setEditingNote(null)
      setEditText("")
      setEditAnonymous(false)
      setEditHasVisitedHere(false)
    } catch (err) {
      console.error('Error updating note:', err)
      setEditError('Failed to update note. Please try again.')
    }
  }

  const handleCancelEdit = () => {
    setEditingNote(null)
    setEditText("")
    setEditAnonymous(false)
    setEditHasVisitedHere(false)
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
    return <PageLoader />
  }

  if (error || !library) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-stone-400" />
            <h1 className="font-gloria text-2xl font-bold text-stone-800 mb-4">Library Not Found</h1>
            <p className="text-stone-600 mb-6">The library you're looking for doesn't exist or has been removed.</p>
            <Link href="/">
              <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to map
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Group tags by category
  const tagsByCategory = libraryTags.reduce((acc, tag) => {
    if (!acc[tag.tag.category]) {
      acc[tag.tag.category] = []
    }
    const categoryTags = acc[tag.tag.category] || []
    categoryTags.push(tag)
    acc[tag.tag.category] = categoryTags
    return acc
  }, {} as Record<string, LibraryTag[]>)

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
        {/* Library header */}
        <div className="text-center space-y-4">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-stone-200 relative">
            <div className="absolute top-4 right-4">
              <SaveButton entityType="library" entityId={library.id} variant="ghost" size="icon" showLabel={false} className="text-stone-500 hover:text-blue-600 hover:bg-blue-50" />
            </div>
            <div className="flex flex-col items-center gap-4 mb-4">
              <h2 className="font-gloria text-4xl md:text-5xl font-bold text-stone-800 tracking-tight">{library.name}</h2>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {isOwner ? (
                  <>
                    <BookOpen className="h-3 w-3 mr-1" />
                    Added by library staff
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
              <MapPin className="h-5 w-5 text-blue-500" />
              <span>
                {library.city}{library.state && `, ${library.state}`}, {library.country}
              </span>
            </div>

            <div className="flex justify-center items-center gap-6 text-sm text-stone-500">
              <span>
                Last updated {new Date(library.updated_at || library.created_at).toLocaleDateString()}
                {/* {librarySubmitter && (
                  <span>
                    {' by '}
                    <span className="font-medium">
                      {librarySubmitter.display_name || librarySubmitter.email?.split('@')[0] || 'Anonymous'}
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
                <MapPin className="h-5 w-5 mr-2 text-blue-500" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-stone-700 leading-relaxed bg-stone-50 p-4 rounded-lg">
                <p className="font-medium">{library.address}</p>
                <p className="text-stone-500">{library.city}{library.state && `, ${library.state}`}, {library.country}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-stone-800 text-lg">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-stone-50 p-4 rounded-lg space-y-3">
                {library.email && (
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-stone-400 flex-shrink-0" />
                    <a
                      href={`mailto:${library.email}`}
                      className="text-stone-700 hover:text-blue-600 transition-colors underline decoration-blue-200 hover:decoration-blue-400"
                    >
                      {library.email}
                    </a>
                  </div>
                )}
                {library.website && (
                  <div className="flex items-center space-x-3">
                    <Globe className="h-4 w-4 text-stone-400 flex-shrink-0" />
                    <a
                      href={library.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-700 hover:text-blue-600 transition-colors underline decoration-blue-200 hover:decoration-blue-400 url-break"
                      title={library.website}
                    >
                      {library.website.replace("https://", "").replace("www.", "")}
                    </a>
                  </div>
                )}
                {!library.email && !library.website && (
                  <p className="text-stone-500 text-sm italic">No contact information available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Library Services */}
        {Object.keys(tagsByCategory).length > 0 && (
          <Card className="bg-white border border-blue-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-stone-800 text-xl flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Library Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-6 text-stone-700">
                {Object.entries(tagsByCategory).map(([category, tags]) => (
                  <div key={category} className="space-y-4">
                    <div className="bg-stone-50 p-4 rounded-lg border border-blue-100">
                      <h4 className="font-semibold text-stone-800 mb-2">{getTagCategoryDisplay(category)}</h4>
                      <div className="space-y-1">
                        {sortTagsByConfiguredOrder(tags.map((item) => item.tag), category).map((tag) => (
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
        <Card className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-stone-800 text-xl font-semibold">Community Notes ({notes.length})</CardTitle>
                  <p className="text-sm text-stone-600">Share your thoughts and experiences</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Note List */}
            {notes.length > 0 && (
              <div className="space-y-4 mb-6">
                {notes.map((note) => (
                  <div key={note.id} className="group bg-white p-5 rounded-xl border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-white">
                    {editingNote?.id === note.id ? (
                      // Edit form
                      <form onSubmit={handleUpdateNote} className="space-y-4">
                        <div>
                          <Label htmlFor="editNote" className="text-sm font-medium text-stone-700 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-blue-600" />
                            Your Note *
                          </Label>
                          <Textarea
                            id="editNote"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            placeholder="Share your experience at this library..."
                            className="mt-2 bg-white border-stone-300 focus:border-blue-400 focus:ring-blue-200 transition-all duration-200"
                            rows={3}
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
                                id="editHasVisitedHere"
                                checked={editHasVisitedHere}
                                onCheckedChange={(checked) => setEditHasVisitedHere(checked as boolean)}
                                className="text-blue-600 border-stone-300"
                              />
                              <Label htmlFor="editHasVisitedHere" className="text-sm text-stone-600">
                                I have visited this library
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="editAnonymous"
                                checked={editAnonymous}
                                onCheckedChange={(checked) => setEditAnonymous(checked as boolean)}
                                className="text-blue-600 border-stone-300"
                              />
                              <Label htmlFor="editAnonymous" className="text-sm text-stone-600">
                                Submit anonymously
                              </Label>
                            </div>
                          </div>
                        </div>

                        {editError && (
                          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            {editError}
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            className="border-stone-300 text-stone-700 hover:bg-stone-50 transition-all duration-200"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            className="bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    ) : (
                      // Display note
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center overflow-hidden">
                              {!note.anonymous && note.user ? (
                                note.user.profile_image ? (
                                  <Link 
                                    href={`/profile/${note.user.permalink || note.user.id}`}
                                    className="hover:opacity-80 transition-opacity"
                                  >
                                    <img 
                                      src={note.user.profile_image} 
                                      alt={note.user.display_name || 'User'} 
                                      className="w-full h-full object-cover"
                                    />
                                  </Link>
                                ) : (
                                  <User className="h-4 w-4 text-blue-600"
                                />
                                )
                              ) : (
                                <User className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
                              {!note.anonymous && note.user && (
                                <span className="font-medium text-stone-800">
                                  {note.user.permalink ? (
                                    <Link 
                                      href={`/profile/${note.user.permalink}`}
                                      className="hover:text-blue-600 hover:underline transition-colors"
                                    >
                                      {note.user.display_name || note.user.email?.split('@')[0] || 'Anonymous'}
                                    </Link>
                                  ) : (
                                    note.user.display_name || note.user.email?.split('@')[0] || 'Anonymous'
                                  )}
                                </span>
                              )}
                              {note.anonymous && (
                                <span className="font-medium text-stone-600 italic">Anonymous</span>
                              )}
                              {note.has_stocked_here && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  has been here
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-stone-500">
                            <span className="bg-stone-100 px-2 py-1 rounded-full">
                              {new Date(note.submitted_at).toLocaleDateString()}
                            </span>
                            {user && note.user_id === user.id && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditNote(note)}
                                  className="h-6 w-6 p-0 text-stone-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteNote(note)}
                                  className="h-6 w-6 p-0 text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="pl-11">
                          <p className="text-stone-700 leading-relaxed">{note.text}</p>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* No notes message */}
            {notes.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-stone-400" />
                </div>
                <p className="text-stone-500 text-lg font-medium mb-2">No community notes yet</p>
                <p className="text-stone-400 text-sm">Be the first to share your experience at this library!</p>
              </div>
            )}

            {/* Note Submission */}
            {noteSubmitted ? (
              <div className="bg-blue-100 p-4 rounded-lg border border-blue-200">
                <p className="text-blue-700 text-sm font-medium">Thank you for sharing your experience!</p>
              </div>
            ) : userHasNote ? (
              <div className="bg-stone-100 p-4 rounded-lg border border-stone-200">
                <p className="text-stone-600 text-sm">You've already added a community note for this place.
                Feel free to edit it if anything's changed.</p>
              </div>
            ) : showNoteForm ? (
              <form onSubmit={handleNoteSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="noteText" className="text-sm font-medium text-stone-700">
                    Your Experience *
                  </Label>
                  <Textarea
                    id="noteText"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Tell us what it was like working with or visiting this library, or anything else you think others should know."
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
                        id="hasVisitedHere"
                        checked={hasVisitedHere}
                        onCheckedChange={(checked) => setHasVisitedHere(checked as boolean)}
                      />
                      <Label htmlFor="hasVisitedHere" className="text-sm text-stone-600">
                        I have visited this library
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isAnonymous"
                        checked={isAnonymous}
                        onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                      />
                      <Label htmlFor="isAnonymous" className="text-sm text-stone-600">
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
                      setHasVisitedHere(false)
                      setNoteError(null)
                    }}
                    className="border-stone-300 text-stone-700 hover:bg-stone-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 text-white"
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
                    className="bg-blue-500 hover:bg-blue-600 text-white font-gloria"
                  >
                    share your experience
                  </Button>
                ) : (
                  <Link href="/login">
                    <Button className="bg-blue-500 hover:bg-blue-600 text-white font-gloria">
                      sign in to share your experience
                    </Button>
                  </Link>
                )}
              </div>
            )}


          </CardContent>
        </Card>



        {/* Feedback Section */}
        <div className="text-center py-8">
          <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm max-w-lg w-full mx-auto">
            {feedbackSubmitted ? (
              <p className="text-green-600 text-sm">Thank you for your feedback!</p>
            ) : showFeedbackForm ? (
              <form
                onSubmit={async e => {
                  e.preventDefault()
                  setFeedbackError(null)
                  try {
                    const { error } = await supabase.from('locale_feedback').insert([
                      {
                        library_id: library.id,
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
                  placeholder="Suggest a new tag for this library, or let us know what's outdated, incorrect, or missing..."
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
                    className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-4 py-1 rounded font-gloria"
                  >
                    submit
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-stone-600 text-sm">
                Is any information outdated, incorrect, or missing?{" "}
                <button
                  className="text-blue-600 hover:text-blue-700 underline decoration-blue-200 hover:decoration-blue-400"
                  onClick={() => setShowFeedbackForm(true)}
                >
                  Send us a message
                </button>
                {" "}or{" "}
                {user ? (
                  <Link
                    href={`/library/${library.id}/suggest-edit`}
                    className="text-blue-600 hover:text-blue-700 underline decoration-blue-200 hover:decoration-blue-400"
                  >
                    suggest an edit to this page
                  </Link>
                ) : (
                  <>
                    <Link
                      href={`/login?redirect=/library/${library.id}/suggest-edit`}
                      className="text-blue-600 hover:text-blue-700 underline decoration-blue-200 hover:decoration-blue-400"
                    >
                      sign in 
                    </Link>{" "}
                    to suggest an edit to this page
                  </>
                )}
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