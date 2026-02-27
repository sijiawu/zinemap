"use client"

import { useEffect, useState } from "react"
import { Calendar, MapPin, Mail, Globe, Share2, Clock, Users, ExternalLink, User, MessageSquare, Edit, Trash2, AlertCircle, ArrowLeft, Landmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"
import { supabase } from "@/lib/supabaseClient"
import { Event, CommunityNote, EventAttendee } from "@/lib/types"
import { formatDate, formatDateReadable, getEventCategoryDisplay, formatSocialMedia, isPastEvent } from "@/lib/utils"
import Link from "next/link"
import { SaveButton } from "@/components/SaveButton"

export default function EventDetailClient({ eventId }: { eventId: string }) {
  const { user } = useSupabaseUser()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<CommunityNote[]>([])
  const [attendees, setAttendees] = useState<EventAttendee[]>([])
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [noteSubmitted, setNoteSubmitted] = useState(false)
  const [userHasNote, setUserHasNote] = useState(false)
  const [userNote, setUserNote] = useState<CommunityNote | null>(null)
  const [isAttending, setIsAttending] = useState(false)
  const [attendeeCount, setAttendeeCount] = useState(0)
  const [attendanceError, setAttendanceError] = useState<string | null>(null)
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [editingNote, setEditingNote] = useState<CommunityNote | null>(null)
  const [editText, setEditText] = useState("")
  const [editAnonymous, setEditAnonymous] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deletingNote, setDeletingNote] = useState<CommunityNote | null>(null)

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) {
        setError('No event identifier provided')
        setLoading(false)
        return
      }

      // Prevent duplicate fetches
      if (event && event.id === eventId) {
        return
      }

      try {
        // Fetch event details - try permalink first, then fallback to ID
        let eventData, eventError
        
        // First try to fetch by permalink
        const { data: eventByPermalink, error: permalinkError } = await supabase
          .from('events')
          .select('*')
          .eq('permalink', eventId)
          .eq('approved', true)
          .single()
        
        if (eventByPermalink) {
          eventData = eventByPermalink
          eventError = null
        } else {
          // If not found by permalink, try by ID (for backwards compatibility)
          const { data: eventById, error: idError } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .eq('approved', true)
            .single()
          
          eventData = eventById
          eventError = idError
        }

        if (eventError || !eventData) {
          console.error('Error fetching event:', eventError)
          console.error('Event data:', eventData)
          
          // Check if it's a permission issue
          if (eventError?.code === 'PGRST116') {
            setError(`Event not found: ${eventId}`)
          } else if (eventError?.message?.includes('permission') || eventError?.message?.includes('row-level security')) {
            setError('Access denied. This event may be private or you may not have permission to view it.')
          } else {
            setError(`Failed to load event: ${eventError?.message || 'Unknown error'}`)
          }
          return
        }

        // Fetch user profile for the submitter
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('display_name, permalink, email')
          .eq('id', eventData.submitted_by)
          .single()

        const eventWithUser = {
          ...eventData,
          user_name: userProfile?.display_name || 'Unknown user',
          user_permalink: userProfile?.permalink,
          user_email: userProfile?.email
        }

        setEvent(eventWithUser)

        // Fetch community notes
        const { data: notesData, error: notesError } = await supabase
          .from('community_notes')
          .select(`
            id,
            event_id,
            user_id,
            text,
            anonymous,
            has_stocked_here,
            submitted_at
          `)
          .eq('event_id', eventData.id)
          .order('submitted_at', { ascending: false })

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
              .select('id, display_name, email, permalink, profile_image')
              .in('id', userIds)
            
            if (profilesData) {
              userProfiles = profilesData.reduce((acc: any, profile: any) => {
                acc[profile.id] = profile
                return acc
              }, {})
            }
          }
          
          const processedNotes = notesData.map((note: any) => ({
            id: note.id,
            event_id: note.event_id,
            user_id: note.user_id,
            text: note.text,
            anonymous: note.anonymous,
            has_stocked_here: note.has_stocked_here,
            submitted_at: note.submitted_at,
            user: note.user_id && !note.anonymous ? userProfiles[note.user_id] : null
          }))
          
          setNotes(processedNotes)

          // Check if current user has a note
          if (user) {
            const userNote = processedNotes.find(note => note.user_id === user.id)
            setUserNote(userNote || null)
            setUserHasNote(!!userNote)
          }
        } else {
          setNotes([])
        }

        // Fetch attendees
        const { data: attendeesData, error: attendeesError } = await supabase
          .from('event_attendees')
          .select('id, event_id, user_id, created_at')
          .eq('event_id', eventData.id)
          .order('created_at', { ascending: false })

        if (attendeesError) {
          console.error('Error fetching attendees:', attendeesError)
        }

        if (attendeesData && attendeesData.length > 0) {
          // Fetch profiles for all attendees
          const userIds = attendeesData.map(attendee => attendee.user_id)
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, display_name, email, permalink, profile_image')
            .in('id', userIds)

          // Create a map of user ID to profile data
          const profileMap = new Map()
          if (profilesData) {
            profilesData.forEach(profile => {
              profileMap.set(profile.id, profile)
            })
          }

          const processedAttendees = attendeesData.map((attendee: any) => {
            const profile = profileMap.get(attendee.user_id)
            return {
              id: attendee.id,
              event_id: attendee.event_id,
              user_id: attendee.user_id,
              created_at: attendee.created_at,
              user: {
                display_name: profile?.display_name || null,
                email: profile?.email || '',
                permalink: profile?.permalink || null,
                profile_image: profile?.profile_image || null
              }
            }
          })
          
          setAttendees(processedAttendees)
          setAttendeeCount(processedAttendees.length)

          // Check if current user is attending
          if (user) {
            const userAttending = processedAttendees.find(attendee => attendee.user_id === user.id)
            setIsAttending(!!userAttending)
          }
        } else {
          setAttendees([])
          setAttendeeCount(0)
        }

      } catch (error) {
        console.error('Error fetching event:', error)
        setError('Event not found')
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [eventId, user?.id])

  // Handle user changes separately to update attendance state
  useEffect(() => {
    if (event && user && attendees.length > 0) {
      const userAttending = attendees.find(attendee => attendee.user_id === user.id)
      const newIsAttending = !!userAttending
      if (newIsAttending !== isAttending) {
        setIsAttending(newIsAttending)
      }
    }
  }, [user?.id, event, attendees, isAttending])

  const handleAttendToggle = async () => {
    if (!event || !user) return

    setAttendanceError(null)
    setIsAttendanceLoading(true)

    try {
      if (isAttending) {
        // Remove attendance
        const { error } = await supabase
          .from('event_attendees')
          .delete()
          .eq('event_id', event.id)
          .eq('user_id', user.id)

        if (error) {
          console.error('Error removing attendance:', error)
          setAttendanceError(`Failed to remove attendance: ${error.message}`)
          return
        }

        // Update local state
        setIsAttending(false)
        setAttendeeCount(prev => prev - 1)
        setAttendees(prev => prev.filter(a => a.user_id !== user.id))
      } else {
        // Add attendance
        const { error } = await supabase
          .from('event_attendees')
          .insert({
            event_id: event.id,
            user_id: user.id
          })

        if (error) {
          console.error('Error adding attendance:', error)
          setAttendanceError(`Failed to add attendance: ${error.message}`)
          return
        }

        // Refresh attendees list to get the actual data from database
        const { data: attendeesData } = await supabase
          .from('event_attendees')
          .select('id, event_id, user_id, created_at')
          .eq('event_id', event.id)
          .order('created_at', { ascending: false })

        if (attendeesData && attendeesData.length > 0) {
          // Fetch profiles for all attendees
          const userIds = attendeesData.map(attendee => attendee.user_id)
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, display_name, email, permalink, profile_image')
            .in('id', userIds)

          // Create a map of user ID to profile data
          const profileMap = new Map()
          if (profilesData) {
            profilesData.forEach(profile => {
              profileMap.set(profile.id, profile)
            })
          }

          const processedAttendees = attendeesData.map((attendee: any) => {
            const profile = profileMap.get(attendee.user_id)
            return {
              id: attendee.id,
              event_id: attendee.event_id,
              user_id: attendee.user_id,
              created_at: attendee.created_at,
              user: {
                display_name: profile?.display_name || null,
                email: profile?.email || '',
                permalink: profile?.permalink || null,
                profile_image: profile?.profile_image || null
              }
            }
          })
          
          setAttendees(processedAttendees)
          setAttendeeCount(processedAttendees.length)
        }

        setIsAttending(true)
      }
    } catch (error) {
      console.error('Error toggling attendance:', error)
      setAttendanceError('An unexpected error occurred. Please try again.')
    } finally {
      setIsAttendanceLoading(false)
    }
  }

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setNoteError(null)

    if (!noteText.trim()) {
      setNoteError('Please share your experience')
      return
    }

    if (!event) {
      return
    }

    try {
      const { error } = await supabase
        .from('community_notes')
        .insert({
          event_id: event.id,
          store_id: null,
          library_id: null,
          user_id: user?.id || null,
          text: noteText.trim(),
          anonymous: isAnonymous,
          has_stocked_here: false
        })

      if (error) {
        console.error('Error submitting note:', error)
        setNoteError(`Failed to submit note: ${error.message}`)
        return
      }

      setNoteSubmitted(true)
      setShowNoteForm(false)
      setNoteText("")
      setIsAnonymous(false)
      setUserHasNote(true)

      // Refresh notes
      const { data: notesData, error: notesError } = await supabase
        .from('community_notes')
        .select(`
          id,
          event_id,
          user_id,
          text,
          anonymous,
          has_stocked_here,
          submitted_at
        `)
        .eq('event_id', event.id)
        .order('submitted_at', { ascending: false })

      if (notesError) {
        console.warn('Error refreshing notes:', notesError)
      } else if (notesData) {
        // Fetch user profiles for notes that have user_id
        const userIds = notesData
          .filter((note: any) => note.user_id && !note.anonymous)
          .map((note: any) => note.user_id)
        
        let userProfiles: any = {}
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, display_name, email, permalink, profile_image')
            .in('id', userIds)
          
          if (profilesData) {
            userProfiles = profilesData.reduce((acc: any, profile: any) => {
              acc[profile.id] = profile
              return acc
            }, {})
          }
        }
        
        const processedNotes = notesData.map((note: any) => ({
          id: note.id,
          event_id: note.event_id,
          user_id: note.user_id,
          text: note.text,
          anonymous: note.anonymous,
          has_stocked_here: note.has_stocked_here,
          submitted_at: note.submitted_at,
          user: note.user_id && !note.anonymous ? userProfiles[note.user_id] : null
        }))
        setNotes(processedNotes)
      }

    } catch (error) {
      console.error('Error submitting note:', error)
      setNoteError('Failed to submit note. Please try again.')
    }
  }

  const handleEditNote = (note: CommunityNote) => {
    setEditingNote(note)
    setEditText(note.text)
    setEditAnonymous(note.anonymous)
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
          anonymous: editAnonymous
        })
        .eq('id', editingNote.id)
        .eq('user_id', user?.id)

      if (error) {
        console.error('Error updating note:', error)
        setEditError('Failed to update note. Please try again.')
        return
      }

      // Refresh notes
      const { data: notesData, error: notesError } = await supabase
        .from('community_notes')
        .select(`
          id,
          event_id,
          user_id,
          text,
          anonymous,
          has_stocked_here,
          submitted_at
        `)
        .eq('event_id', event?.id)
        .order('submitted_at', { ascending: false })

      if (notesError) {
        console.warn('Error refreshing notes:', notesError)
      } else if (notesData) {
        // Fetch user profiles for notes that have user_id
        const userIds = notesData
          .filter((note: any) => note.user_id && !note.anonymous)
          .map((note: any) => note.user_id)
        
        let userProfiles: any = {}
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, display_name, email, permalink, profile_image')
            .in('id', userIds)
          
          if (profilesData) {
            userProfiles = profilesData.reduce((acc: any, profile: any) => {
              acc[profile.id] = profile
              return acc
            }, {})
          }
        }
        
        const processedNotes = notesData.map((note: any) => ({
          id: note.id,
          event_id: note.event_id,
          user_id: note.user_id,
          text: note.text,
          anonymous: note.anonymous,
          has_stocked_here: note.has_stocked_here,
          submitted_at: note.submitted_at,
          user: note.user_id && !note.anonymous ? userProfiles[note.user_id] : null
        }))
        setNotes(processedNotes)
      }

      // Reset edit state
      setEditingNote(null)
      setEditText("")
      setEditAnonymous(false)
    } catch (err) {
      console.error('Error updating note:', err)
      setEditError('Failed to update note. Please try again.')
    }
  }

  const handleCancelEdit = () => {
    setEditingNote(null)
    setEditText("")
    setEditAnonymous(false)
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'festival':
        return 'bg-[#009035] text-white border-[#009035]'
      case 'swap':
        return 'bg-[#009035] text-white border-[#009035]'
      case 'workshop':
        return 'bg-[#009035] text-white border-[#009035]'
      default:
        return 'bg-[#009035] text-white border-[#009035]'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'festival':
        return ''
      case 'swap':
        return ''
      case 'workshop':
        return ''
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500 text-lg">Loading...</div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-stone-50 font-serif flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-stone-800 mb-2">Event Not Found</h1>
          <p className="text-stone-600 mb-4">{error || "The event you're looking for doesn't exist."}</p>
          <Link href="/">
            <Button className="bg-[#009035] hover:bg-[#007a2a] text-white">
              Back to Homepage
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-stone-50 font-serif">
      {/* Header */}
      <header id="event-header" className="w-full bg-white/70 backdrop-blur-sm border-b border-stone-200 shadow-sm order-1 lg:order-none relative">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
          <SaveButton entityType="event" entityId={event.id} variant="ghost" size="icon" showLabel={false} className="text-stone-500 hover:text-[#009035] hover:bg-green-50" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 overflow-hidden">
          <div className="mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-stone-600 hover:text-stone-800 hover:bg-stone-100">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to map
              </Button>
            </Link>
          </div>
          
          <div className="flex flex-col lg:flex-row items-start justify-between gap-4 lg:gap-0">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-3">
                <Badge className={`${getCategoryColor(event.category)} text-sm font-medium`}>
                  {getCategoryIcon(event.category)} {getEventCategoryDisplay(event.category)}
                </Badge>
                
                {/* Past Event Badge */}
                {event && isPastEvent(event) && (
                  <Badge 
                    variant="outline"
                    className="text-xs bg-stone-100 text-stone-500 border-stone-300"
                  >
                    Past Event
                  </Badge>
                )}
                
                {/* Application Status - Show only one badge based on current state (not for past events) */}
                {event.application_deadline && !isPastEvent(event) && (() => {
                  const today = new Date();
                  const deadlineDate = new Date(event.application_deadline);
                  const openDate = event.application_open ? new Date(event.application_open) : null;
                  
                  // Set time to start of day for accurate date comparison
                  today.setHours(0, 0, 0, 0);
                  deadlineDate.setHours(0, 0, 0, 0);
                  if (openDate) openDate.setHours(0, 0, 0, 0);
                  
                  return (
                    <>
                      {/* State 1: Before application open - show "Application opens [date]" */}
                      {openDate && openDate > today && (
                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 bg-blue-50">
                          <Calendar className="h-3 w-3 mr-1" />
                          Application opens {formatDateReadable(event.application_open!)}
                        </Badge>
                      )}
                      
                      {/* State 2: Application opened - show "Apply by [date]" */}
                      {(!openDate || openDate <= today) && deadlineDate >= today && (
                        <Badge variant="outline" className="text-xs border-green-300 text-green-700 bg-green-50">
                          <Clock className="h-3 w-3 mr-1" />
                          Apply by {formatDateReadable(event.application_deadline)}
                        </Badge>
                      )}
                      
                      {/* State 3: Application closed - show "Submission closed" (only if event is not past) */}
                      {deadlineDate < today && (
                        <Badge variant="outline" className="text-xs border-green-300 text-green-700 bg-green-50">
                          <Clock className="h-3 w-3 mr-1" />
                          Submission closed
                        </Badge>
                      )}
                    </>
                  );
                })()}
              </div>
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-stone-800 mb-2 break-words">{event.name}</h1>
              
              <div className="flex items-center text-stone-600 text-lg mb-4 break-words">
                <MapPin className="h-5 w-5 mr-2 flex-shrink-0" />
<span className="break-words">{event.city}{event.state && `, ${event.state}`}, {event.country}</span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-stone-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {event.start_date === event.end_date 
                    ? formatDateReadable(event.start_date)
                    : `${formatDateReadable(event.start_date)} - ${formatDateReadable(event.end_date)}`
                  }
                </div>
                
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  {event && isPastEvent(event) ? `${attendeeCount} went` : `${attendeeCount} going`}
                </div>
              </div>
            </div>

            {!user ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Link href="/login">
                  <Button
                    className="w-full sm:w-auto bg-[#009035] hover:bg-[#007a2a] text-white"
                  >
                    {event && isPastEvent(event) ? "Sign in to mark attendance" : "Sign in to RSVP"}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleAttendToggle}
                  variant={isAttending ? "outline" : "default"}
                  className={`${
                    isAttending 
                      ? "border-[#009035] text-[#009035] hover:bg-green-50" 
                      : "bg-[#009035] hover:bg-[#007a2a] text-white"
                  }`}
                  disabled={isAttendanceLoading}
                >
                  {isAttendanceLoading 
                    ? "loading..." 
                    : isAttending 
                      ? (event && isPastEvent(event) ? "I wasn't there" : "Not going")
                      : (event && isPastEvent(event) ? "I was there!" : "I'm going!")
                  }
                </Button>
                
                {attendanceError && (
                  <div className="mt-2 text-red-600 text-sm">
                    {attendanceError}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAttendanceError(null)}
                      className="ml-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 overflow-hidden">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2 space-y-6 order-5 lg:order-none">

            {/* Contact & Links */}
            {(event.email || event.website || event.social) && (
              <Card id="contact-links" className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm overflow-hidden order-3 lg:order-none">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-stone-800">Contact & Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 overflow-hidden">
                  {event.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-4 w-4 text-stone-500 flex-shrink-0 mt-0.5" />
                      <a 
                        href={`mailto:${event.email}`}
                        className="text-[#009035] hover:text-[#007a2a] hover:underline break-all"
                      >
                        {event.email}
                      </a>
                    </div>
                  )}
                  
                  {event.website && (
                    <div className="flex items-start gap-3">
                      <Globe className="h-4 w-4 text-stone-500 flex-shrink-0 mt-0.5" />
                      <a 
                        href={event.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#009035] hover:text-[#007a2a] hover:underline flex items-center gap-1 break-all"
                      >
                        <span className="break-all">{event.website}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </div>
                  )}
                  
                  {event.social && (
                    <div className="flex items-start gap-3">
                      <Share2 className="h-4 w-4 text-stone-500 flex-shrink-0 mt-0.5" />
                      <div className="break-words">
                        {formatSocialMedia(event.social, '#009035', '#007a2a')}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}



            {/* Community Notes */}
            <Card id="community-notes" className="bg-gradient-to-br from-white to-stone-50 border border-stone-200 shadow-sm hover:shadow-md transition-all duration-300 order-4 lg:order-none">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-stone-800">Community Notes</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {showNoteForm && (
                  <form onSubmit={handleSubmitNote} className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 shadow-sm">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-green-600" />
                          Your Note
                        </label>
                        <Textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Share anything about this event! Your plans, tips, what you're excited about..."
                          rows={3}
                          className="mt-2 bg-white border-stone-300 focus:border-green-400 focus:ring-green-200 transition-all duration-200"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="anonymous"
                          checked={isAnonymous}
                          onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                          className="text-green-600 border-stone-300"
                        />
                        <label htmlFor="anonymous" className="text-sm text-stone-700">
                          Post anonymously
                        </label>
                      </div>

                      {noteError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          {noteError}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button type="submit" size="sm" className="bg-green-500 hover:bg-green-600 text-white shadow-sm hover:shadow-md transition-all duration-200">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Submit Note
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowNoteForm(false)}
                          className="border-stone-300 text-stone-700 hover:bg-stone-50 transition-all duration-200"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </form>
                )}

                {noteSubmitted && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 text-green-700 rounded-xl text-sm flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <span className="font-medium">Your note has been submitted successfully!</span>
                  </div>
                )}

                {userHasNote && (
                  <div className="mb-6 p-4 bg-stone-100 border border-stone-200 rounded-lg">
                    <p className="text-stone-600 text-sm">You've already added a community note for this place. Feel free to edit it if anything's changed.</p>
                  </div>
                )}

                {notes.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-8 w-8 text-stone-400" />
                    </div>
                    <p className="text-stone-500 text-lg font-medium mb-6">No community notes yet</p>
                    
                    {!user ? (
                      <div className="space-y-3">
                        <Link href="/login">
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            Sign in to add a note
                          </Button>
                        </Link>
                      </div>
                    ) : !userHasNote && (
                      <Button
                        onClick={() => setShowNoteForm(true)}
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        Add a note
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!user ? (
                      <div className="text-center py-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                        <div className="flex flex-col items-center gap-3">
                          <MessageSquare className="h-6 w-6 text-green-600" />
                          <p className="text-stone-700 font-medium">Want to share what you know about this event?</p>
                          <Link href="/login">
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-600 text-white shadow-sm hover:shadow-md transition-all duration-200 font-gloria"
                            >
                              Sign in to add a note
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ) : !userHasNote && !showNoteForm && (
                      <div className="text-center py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                        <div className="flex flex-col items-center gap-3">
                          <MessageSquare className="h-5 w-5 text-green-600" />
                          <p className="text-stone-700 font-medium">Want to share what you know about this event?</p>
                          <Button
                            onClick={() => setShowNoteForm(true)}
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white shadow-sm hover:shadow-md transition-all duration-200 font-gloria"
                          >
                            Add a note
                          </Button>
                        </div>
                      </div>
                    )}
                    {notes.map((note) => (
                      <div key={note.id} className="group p-5 bg-white rounded-xl border border-stone-200 hover:border-green-300 hover:shadow-md transition-all duration-300 hover:bg-gradient-to-r hover:from-green-50 hover:to-white">
                        {editingNote?.id === note.id ? (
                          <form onSubmit={handleUpdateNote} className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-stone-700">Your Note</label>
                              <Textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                placeholder="Share your thoughts about this event..."
                                rows={3}
                                className="mt-2 bg-white border-stone-300 focus:border-green-400 focus:ring-green-200"
                                maxLength={1000}
                                required
                              />
                              <div className="text-xs text-stone-500 text-right">
                                {editText.length}/1000 characters
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="editAnonymous"
                                checked={editAnonymous}
                                onCheckedChange={(checked) => setEditAnonymous(checked as boolean)}
                                className="text-green-600 border-stone-300"
                              />
                              <label htmlFor="editAnonymous" className="text-sm text-stone-700">
                                Post anonymously
                              </label>
                            </div>

                            {editError && (
                              <div className="text-red-600 text-sm">{editError}</div>
                            )}

                            <div className="flex gap-3">
                              <Button type="submit" size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                                Update Note
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEdit}
                                className="border-stone-300 text-stone-700 hover:bg-stone-50"
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center overflow-hidden">
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
                                      <User className="h-4 w-4 text-green-600" />
                                    )
                                  ) : (
                                    <User className="h-4 w-4 text-green-600" />
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
                                  {!note.anonymous && note.user && (
                                    <span className="font-medium text-stone-800">
                                      {note.user.permalink ? (
                                        <Link 
                                          href={`/profile/${note.user.permalink}`}
                                          className="hover:text-green-600 hover:underline transition-colors"
                                        >
                                          {note.user.display_name || note.user.email?.split('@')[0] || 'Anonymous'}
                                        </Link>
                                      ) : (
                                        note.user.display_name || note.user.email?.split('@')[0] || 'Anonymous'
                                      )}
                                    </span>
                                  )}
                                  {note.anonymous && (
                                    <span className="font-medium text-stone-600">Anonymous</span>
                                  )}
                                  {note.user?.email?.toLowerCase() === event.email?.toLowerCase() && (
                                    <Badge variant="outline" className="text-xs border-green-500 text-green-700 bg-green-50">
                                      Event Organizer
                                    </Badge>
                                  )}
                                  <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded-full">
                                    {formatDateReadable(note.submitted_at)}
                                  </span>
                                </div>
                              </div>
                              {user && note.user_id === user.id && (
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditNote(note)}
                                    className="text-stone-500 hover:text-green-600 hover:bg-green-50 transition-all duration-200"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteNote(note)}
                                    className="text-red-500 hover:text-red-700 hover:bg-green-50 transition-all duration-200"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
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
              </CardContent>
            </Card>

            {/* Feedback Section */}
            <div id="feedback-section" className="text-center py-6 order-6 lg:order-none">
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
                            event_id: event.id,
                            feedback,
                            user_id: user?.id || null,
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
                      placeholder="Suggest a new tag for this event, or let us know what's outdated, incorrect, or missing..."
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
                        className="bg-green-500 hover:bg-green-600 text-white text-xs px-4 py-1 rounded font-gloria"
                      >
                        submit
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-stone-600 text-sm">
                    Is any information outdated, incorrect, or missing?{" "}
                    <button
                      className="text-green-600 hover:text-green-700 underline decoration-green-200 hover:decoration-green-400"
                      onClick={() => setShowFeedbackForm(true)}
                    >
                      Send us a message
                    </button>
                    {" "}or{" "}
                    {user ? (
                      <Link
                        href={`/event/${event.permalink || event.id}/suggest-edit`}
                        className="text-green-600 hover:text-green-700 underline decoration-green-200 hover:decoration-green-400"
                      >
                        suggest an edit to this page
                      </Link>
                    ) : (
                      <>
                        <Link
                          href={`/login?redirect=/event/${event.permalink || event.id}/suggest-edit`}
                          className="text-green-600 hover:text-green-700 underline decoration-green-200 hover:decoration-green-400"
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

          {/* Right Column - Sidebar */}
          <div className="space-y-6 order-2 lg:order-none">

            {/* Event Venue */}
            {event.venue_name && (
              <Card className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-stone-800">Event Venue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <Landmark className="h-5 w-5 text-stone-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-stone-800">{event.venue_name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Event Location */}
            <Card id="event-location" className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-stone-800">Event Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-stone-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-stone-800">{event.address}</p>
                      <p className="text-sm text-stone-600">
                        {event.city}{event.state && `, ${event.state}`}, {event.country}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Who's Going / Who Went */}
            <Card id="whos-going" className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-stone-800">
                  {event && isPastEvent(event) ? "Who Went" : "Who's Going"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {attendees.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {attendees.map((attendee) => (
                        <Link 
                          key={attendee.id}
                          href={`/profile/${attendee.user?.permalink || ''}`}
                          className="hover:opacity-80 transition-opacity"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={attendee.user?.profile_image || ''} alt={attendee.user?.display_name || 'User'} />
                            <AvatarFallback>
                              {attendee.user?.display_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-stone-500 text-center py-4">
                      {event && isPastEvent(event) ? "No one has marked themselves as attended" : "No one has RSVP'd yet"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
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