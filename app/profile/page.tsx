"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Edit, Globe, User, FileText, BookOpen, RefreshCw, Calendar, MapPin, X, Image as ImageIcon, Plus, ArrowRight, ArrowLeft, Store, Library, Pencil } from "lucide-react"
import { supabase } from '@/lib/supabaseClient'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { UserProfile, Zine } from '@/lib/types'
import { generatePermalink, getEventCategoryDisplay } from '@/lib/utils'
import Link from 'next/link'
import AddZineModal from '@/components/AddZineModal'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { formatDateReadable, isPastEvent } from "@/lib/utils"

export default function ProfilePage() {
  const { user, loading: userLoading } = useSupabaseUser()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [zines, setZines] = useState<{
    id: string
    title: string
    description: string | null
    cover_image: string | null
    permalink: string
    is_public: boolean
  }[]>([])
  const [contributions, setContributions] = useState<{
    stores: number
    libraries: number
    events: number
    notes: number
  }>({ stores: 0, libraries: 0, events: 0, notes: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({})
  
  // Form state
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    display_name: '',
    site: '',
    bio: '',
    permalink: ''
  })
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null)
  const [editingZine, setEditingZine] = useState<{
    id: string
    title: string
    description: string | null
    cover_image: string | null
    permalink: string
    is_public: boolean
  } | null>(null)
  const [showZineModal, setShowZineModal] = useState(false)
  const [attendingEvents, setAttendingEvents] = useState<{
    id: string
    name: string
    category: string
    start_date: string
    end_date: string
    city: string
    state?: string
    country: string
    permalink?: string
  }[]>([])
  const [activities, setActivities] = useState<{
    id: string
    type: 'store' | 'library' | 'event' | 'note' | 'edit'
    entityType: 'shop' | 'library' | 'event' | 'edit'
    entityName: string
    entityUrl: string
    sectionLabel: string
    sectionUrl: string
    note?: string
    createdAt: string
  }[]>([])

  const fetchProfileData = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        setError('Failed to load profile')
        return
      }

      setProfile(profileData)
      setFormData({
        display_name: profileData.display_name || '',
        site: profileData.site || '',
        bio: profileData.bio || '',
        permalink: profileData.permalink || ''
      })
      setProfileImagePreview(profileData.profile_image || null)

      // Fetch zines, contributions, activities, and attending events in parallel
      const [zinesRes, , , attendingRes] = await Promise.all([
        supabase.from('zines').select('id, title, description, cover_image, permalink, is_public').eq('user_id', user.id).order('created_at', { ascending: false }),
        fetchContributions(user.id),
        fetchActivities(user.id),
        supabase.from('event_attendees').select(`
          event_id,
          events!inner(id, name, category, start_date, end_date, city, state, country, permalink)
        `).eq('user_id', user.id).order('created_at', { ascending: false }),
      ])

      if (zinesRes.error) {
        console.error('Zines fetch error:', zinesRes.error)
      } else {
        setZines(zinesRes.data || [])
      }

      const attendingEventsData = attendingRes.data
      if (attendingEventsData) {
        const events = attendingEventsData.map((item: any) => ({
          id: item.events.id,
          name: item.events.name,
          category: item.events.category,
          start_date: item.events.start_date,
          end_date: item.events.end_date,
          city: item.events.city,
          state: item.events.state,
          country: item.events.country,
          permalink: item.events.permalink
        }))
        setAttendingEvents(events)
      }

    } catch (err) {
      console.error('Error fetching profile data:', err)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Fetch user's contributions - parallelized
  const fetchContributions = async (userId: string) => {
    try {
      const [storesRes, librariesRes, eventsRes, notesRes] = await Promise.all([
        supabase.from('stores').select('*', { count: 'exact', head: true }).eq('submitted_by', userId),
        supabase.from('libraries').select('*', { count: 'exact', head: true }).eq('submitted_by', userId),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('submitted_by', userId),
        supabase.from('community_notes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      ])
      setContributions({
        stores: storesRes.count || 0,
        libraries: librariesRes.count || 0,
        events: eventsRes.count || 0,
        notes: notesRes.count || 0
      })
    } catch (err) {
      console.error('Contributions fetch error:', err)
      setContributions({ stores: 0, libraries: 0, events: 0, notes: 0 })
    }
  }

  const fetchActivities = async (userId: string) => {
    try {
      const allActivities: { id: string; type: 'store' | 'library' | 'event' | 'note' | 'edit'; entityType: 'shop' | 'library' | 'event' | 'edit'; entityName: string; entityUrl: string; sectionLabel: string; sectionUrl: string; note?: string; createdAt: string }[] = []
      const entityIdsByUser = { stores: new Set<string>(), libraries: new Set<string>(), events: new Set<string>() }

      const [storesRes, librariesRes, eventsRes, notesRes, editsRes] = await Promise.all([
        supabase.from('stores').select('id, name, permalink, created_at').eq('submitted_by', userId).eq('approved', true).order('created_at', { ascending: false }),
        supabase.from('libraries').select('id, name, permalink, created_at').eq('submitted_by', userId).eq('approved', true).order('created_at', { ascending: false }),
        supabase.from('events').select('id, name, permalink, created_at').eq('submitted_by', userId).eq('approved', true).order('created_at', { ascending: false }),
        supabase.from('community_notes').select('id, store_id, library_id, event_id, text, submitted_at, anonymous').eq('user_id', userId).order('submitted_at', { ascending: false }),
        supabase.from('locale_edits').select('id, store_id, library_id, event_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
      ])

      const storesData = storesRes.data || []
      const librariesData = librariesRes.data || []
      const notesData = notesRes.data || []
      const editsData = editsRes.data || []
      const sectionByType = { shop: { label: 'Shops', url: '/stores' }, library: { label: 'Libraries', url: '/libraries' }, event: { label: 'Events', url: '/events' } }

      storesData.forEach((s: { id: string; name: string; permalink: string | null; created_at: string }) => {
        entityIdsByUser.stores.add(s.id)
        allActivities.push({ id: `store-${s.id}`, type: 'store', entityType: 'shop', entityName: s.name, entityUrl: `/store/${s.permalink || s.id}`, sectionLabel: sectionByType.shop.label, sectionUrl: sectionByType.shop.url, createdAt: s.created_at })
      })
      librariesData.forEach((l: { id: string; name: string; permalink: string | null; created_at: string }) => {
        entityIdsByUser.libraries.add(l.id)
        allActivities.push({ id: `library-${l.id}`, type: 'library', entityType: 'library', entityName: l.name, entityUrl: `/library/${l.permalink || l.id}`, sectionLabel: sectionByType.library.label, sectionUrl: sectionByType.library.url, createdAt: l.created_at })
      })
      ;(eventsRes.data || []).forEach((e: { id: string; name: string; permalink: string | null; created_at: string }) => {
        entityIdsByUser.events.add(e.id)
        allActivities.push({ id: `event-${e.id}`, type: 'event', entityType: 'event', entityName: e.name, entityUrl: `/event/${e.permalink || e.id}`, sectionLabel: sectionByType.event.label, sectionUrl: sectionByType.event.url, createdAt: e.created_at })
      })

      const nonAnonymousNotes = notesData.filter((n: { anonymous?: boolean }) => !n.anonymous)
      const storeIds = [...new Set(nonAnonymousNotes.filter((n: { store_id: string | null }) => n.store_id).map((n: { store_id: string | null }) => n.store_id!))]
      const libraryIds = [...new Set(nonAnonymousNotes.filter((n: { library_id: string | null }) => n.library_id).map((n: { library_id: string | null }) => n.library_id!))]
      const eventIds = [...new Set(nonAnonymousNotes.filter((n: { event_id: string | null }) => n.event_id).map((n: { event_id: string | null }) => n.event_id!))]

      const [storesForNotes, libsForNotes, evsForNotes] = await Promise.all([
        storeIds.length ? supabase.from('stores').select('id, name, permalink').in('id', storeIds) : Promise.resolve({ data: [] }),
        libraryIds.length ? supabase.from('libraries').select('id, name, permalink').in('id', libraryIds) : Promise.resolve({ data: [] }),
        eventIds.length ? supabase.from('events').select('id, name, permalink').in('id', eventIds) : Promise.resolve({ data: [] }),
      ])

      const storeMap = new Map((storesForNotes.data || []).map((s: { id: string; name: string; permalink: string | null }) => [s.id, s]))
      const libraryMap = new Map((libsForNotes.data || []).map((l: { id: string; name: string; permalink: string | null }) => [l.id, l]))
      const eventMap = new Map((evsForNotes.data || []).map((e: { id: string; name: string; permalink: string | null }) => [e.id, e]))

      for (const n of nonAnonymousNotes) {
        let entityName = ''
        let entityUrl = ''
        let entityType: 'shop' | 'library' | 'event' = 'shop'
        let isOnUserEntity = false
        const section = { shop: sectionByType.shop, library: sectionByType.library, event: sectionByType.event }
        if (n.store_id) {
          const store = storeMap.get(n.store_id)
          entityName = store?.name || 'a shop'
          entityUrl = `/store/${store?.permalink || n.store_id}`
          entityType = 'shop'
          isOnUserEntity = entityIdsByUser.stores.has(n.store_id)
        } else if (n.library_id) {
          const lib = libraryMap.get(n.library_id)
          entityName = lib?.name || 'a library'
          entityUrl = `/library/${lib?.permalink || n.library_id}`
          entityType = 'library'
          isOnUserEntity = entityIdsByUser.libraries.has(n.library_id)
        } else if (n.event_id) {
          const ev = eventMap.get(n.event_id)
          entityName = ev?.name || 'an event'
          entityUrl = `/event/${ev?.permalink || n.event_id}`
          entityType = 'event'
          isOnUserEntity = entityIdsByUser.events.has(n.event_id)
        }
        if (isOnUserEntity) {
          const existing = allActivities.find(a => a.id === `store-${n.store_id}` || a.id === `library-${n.library_id}` || a.id === `event-${n.event_id}`)
          if (existing) existing.note = n.text
          else allActivities.push({ id: `note-${n.id}`, type: 'note', entityType, entityName, entityUrl, sectionLabel: section[entityType].label, sectionUrl: section[entityType].url, note: n.text, createdAt: n.submitted_at || '' })
        } else {
          allActivities.push({ id: `note-${n.id}`, type: 'note', entityType, entityName, entityUrl, sectionLabel: section[entityType].label, sectionUrl: section[entityType].url, note: n.text, createdAt: n.submitted_at || '' })
        }
      }

      const editStoreIds = editsData.filter((e: { store_id: string | null }) => e.store_id).map((e: { store_id: string | null }) => e.store_id!)
      const editLibraryIds = editsData.filter((e: { library_id: string | null }) => e.library_id).map((e: { library_id: string | null }) => e.library_id!)
      const editEventIds = editsData.filter((e: { event_id: string | null }) => e.event_id).map((e: { event_id: string | null }) => e.event_id!)

      const [editStoresRes, editLibsRes, editEvsRes] = await Promise.all([
        editStoreIds.length ? supabase.from('stores').select('id, name, permalink').in('id', editStoreIds) : Promise.resolve({ data: [] }),
        editLibraryIds.length ? supabase.from('libraries').select('id, name, permalink').in('id', editLibraryIds) : Promise.resolve({ data: [] }),
        editEventIds.length ? supabase.from('events').select('id, name, permalink').in('id', editEventIds) : Promise.resolve({ data: [] }),
      ])

      const editStoreMap = new Map((editStoresRes.data || []).map((s: { id: string; name: string; permalink: string | null }) => [s.id, s]))
      const editLibraryMap = new Map((editLibsRes.data || []).map((l: { id: string; name: string; permalink: string | null }) => [l.id, l]))
      const editEventMap = new Map((editEvsRes.data || []).map((e: { id: string; name: string; permalink: string | null }) => [e.id, e]))

      for (const edit of editsData) {
        let entityName = ''
        let entityUrl = ''
        let sectionLabel = ''
        let sectionUrl = ''
        if (edit.store_id) {
          const s = editStoreMap.get(edit.store_id)
          entityName = s?.name || 'a shop'
          entityUrl = `/store/${s?.permalink || edit.store_id}`
          sectionLabel = 'Shops'
          sectionUrl = '/stores'
        } else if (edit.library_id) {
          const l = editLibraryMap.get(edit.library_id)
          entityName = l?.name || 'a library'
          entityUrl = `/library/${l?.permalink || edit.library_id}`
          sectionLabel = 'Libraries'
          sectionUrl = '/libraries'
        } else if (edit.event_id) {
          const e = editEventMap.get(edit.event_id)
          entityName = e?.name || 'an event'
          entityUrl = `/event/${e?.permalink || edit.event_id}`
          sectionLabel = 'Events'
          sectionUrl = '/events'
        }
        if (entityName) {
          allActivities.push({ id: `edit-${edit.id}`, type: 'edit', entityType: 'edit', entityName, entityUrl, sectionLabel, sectionUrl, createdAt: edit.created_at })
        }
      }

      allActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setActivities(allActivities)
    } catch (err) {
      console.error('Activities fetch error:', err)
      setActivities([])
    }
  }

  // Function to compress profile image
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()
      
      img.onload = () => {
        // Calculate new dimensions (max 400px width/height for profile images)
        const maxSize = 400
        let { width, height } = img
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          0.8 // 80% quality
        )
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  useEffect(() => {
    if (userLoading) return // Wait for user loading to complete
    
    if (!user) {
      router.push('/login')
      return
    }
    
    // Only fetch if we don't already have profile data
    if (!profile) {
      fetchProfileData()
    }
  }, [user?.id, userLoading, router])

  const handleSave = async () => {
    if (!user || !profile) return

    try {
      setSaving(true)
      setError(null)

      // Clear previous field errors
      setFieldErrors({})
      
      // Validate required fields
      if (!formData.display_name?.trim()) {
        setFieldErrors(prev => ({ ...prev, display_name: 'Display name is required' }))
        return
      }

      // Validate website format if provided
      let finalSite = formData.site?.trim() || null
      if (finalSite) {
        // Check if it looks like a valid URL (has protocol or domain format)
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
        if (!urlPattern.test(finalSite)) {
          setFieldErrors(prev => ({ ...prev, site: 'Please enter a valid website URL.' }))
          return
        }
      }

      // Generate permalink if empty
      let finalPermalink = formData.permalink
      if (!finalPermalink?.trim()) {
        finalPermalink = generatePermalink(formData.display_name)
      }

      // Ensure permalink is not empty after generation
      if (!finalPermalink?.trim()) {
        setFieldErrors(prev => ({ ...prev, permalink: 'Could not generate a valid profile URL. Please try again.' }))
        return
      }

      // Validate permalink format
      if (!/^[a-z0-9-]+$/.test(finalPermalink)) {
        setFieldErrors(prev => ({ ...prev, permalink: 'Profile URL can only contain lowercase letters, numbers, and hyphens' }))
        return
      }

      // Check if permalink is taken (if changed)
      if (finalPermalink !== profile.permalink) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('permalink', finalPermalink)
          .neq('id', user.id)
          .single()

        if (existingProfile) {
          setFieldErrors(prev => ({ ...prev, permalink: 'That profile URL is already taken' }))
          return
        }
      }



      let profileImageUrl = profile.profile_image // Keep existing image if no new one

      // Upload profile image if provided
      if (profileImage) {
        try {
          // Compress the image first
          const compressedImage = await compressImage(profileImage)
          
          // Generate unique filename
          const timestamp = Date.now()
          const fileName = `${user.id}/profile-${timestamp}.jpg`
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('profile-images')
            .upload(fileName, compressedImage, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            console.error('Upload error:', uploadError)
            throw new Error('Failed to upload profile image: ' + uploadError.message)
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('profile-images')
            .getPublicUrl(fileName)

          profileImageUrl = urlData.publicUrl
        } catch (err) {
          console.error('Image upload error:', err)
          setError('Failed to upload profile image')
          return
        }
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name.trim(),
          site: finalSite,
          bio: formData.bio?.trim() || null,
          permalink: finalPermalink,
          profile_image: profileImageUrl
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Update error:', updateError)
        setError('Failed to update profile')
        return
      }

      setSuccess('Profile updated successfully!')
      setIsEditing(false)
      setFieldErrors({})
      
      // Refresh profile data
      await fetchProfileData()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)

    } catch (err) {
      console.error('Error updating profile:', err)
      setError('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be smaller than 5MB')
        return
      }

      // Check file type - only allow JPG, PNG, GIF
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a JPG, PNG, or GIF file')
        return
      }

      setError('') // Clear any previous errors
      setProfileImage(file)
      
      // Create preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFieldErrors({})
    setFormData({
      display_name: profile?.display_name || '',
      site: profile?.site || '',
      bio: profile?.bio || '',
      permalink: profile?.permalink || ''
    })
    setProfileImage(null)
    setProfileImagePreview(profile?.profile_image || null)
    setError(null)
  }



  const toggleZinePublic = async (zineId: string, currentPublic: boolean) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('zines')
        .update({ is_public: !currentPublic })
        .eq('id', zineId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error updating zine:', error)
        return
      }

      // Update local state
      setZines(prev => prev.map(zine => 
        zine.id === zineId ? { ...zine, is_public: !currentPublic } : zine
      ))

    } catch (err) {
      console.error('Error toggling zine visibility:', err)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500 text-lg">Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500 text-lg">Profile not found</div>
      </div>
    )
  }

  return (
                    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-rose-50 to-stone-50 font-serif">
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
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Profile Section */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Card className="bg-white border-stone-200 shadow-sm overflow-hidden">
              {!isEditing ? (
                <>
                  <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                        {/* Profile Image */}
                        <div className="flex-shrink-0">
                          {profile.profile_image ? (
                            <img
                              src={profile.profile_image}
                              alt="Profile"
                              className="w-20 h-20 object-cover rounded-full border-2 border-stone-200 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setIsEditing(true)}
                              title="Click to edit profile"
                            />
                          ) : (
                            <div 
                              className="w-20 h-20 rounded-full bg-stone-100 border-2 border-stone-200 flex items-center justify-center cursor-pointer hover:bg-stone-200 transition-colors"
                              onClick={() => setIsEditing(true)}
                              title="Click to edit profile"
                            >
                              <User className="h-10 w-10 text-stone-400" />
                            </div>
                          )}
                        </div>
                        
                        {/* Profile Info */}
                        <div className="flex-1 min-w-0">
                          {/* Display Name with Profile URL Link */}
                          <h2 className="text-2xl font-bold text-stone-800 mb-2 font-gloria">
                            {profile.display_name ? (
                              <Link 
                                href={`/profile/${profile.permalink}`}
                                className="text-stone-800 hover:underline transition-colors"
                              >
                                {profile.display_name}
                              </Link>
                            ) : (
                              'No display name set'
                            )}
                          </h2>
                          
                          {/* Website Link */}
                          {profile.site && (
                            <a 
                              href={profile.site.startsWith('http') ? profile.site : `https://${profile.site}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-rose-600 hover:text-rose-700 transition-colors"
                              style={{ wordBreak: 'break-all' }}
                            >
                              {profile.site}
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex-shrink-0 flex gap-2">
                      <Link href={`/profile/${profile.permalink}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap"
                        >
                          <Globe className="h-4 w-4 mr-2" />
                          View as Public
                        </Button>
                      </Link>
                      <Button
                        onClick={() => setIsEditing(true)}
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                      >
                        Edit
                      </Button>
                    </div>
                  </CardHeader>
                  
                  {/* Bio - Full Width */}
                  {profile.bio && (
                    <div className="px-6 pb-4">
                      <p className="text-stone-700 leading-relaxed">
                        {profile.bio}
                      </p>
                    </div>
                  )}
                </>
              ) : (
              <CardContent className="pt-6 overflow-hidden">
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <Label htmlFor="display_name">Display Name</Label>
                      <Input
                        id="display_name"
                        value={formData.display_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                        placeholder="Enter display name"
                        maxLength={30}
                        className="mt-1"
                      />
                      <div className="flex justify-between items-center mt-1">
                        {fieldErrors.display_name && (
                          <p className="text-xs text-red-600">{fieldErrors.display_name}</p>
                        )}
                        <p className="text-xs text-stone-500 ml-auto">
                          {formData.display_name.length}/30
                        </p>
                      </div>
                    </div>

                    {/* Profile Image Upload */}
                    <div>
                      <Label className="text-sm font-medium text-stone-700">
                        Profile Image (optional)
                      </Label>
                      <div className="mt-1">
                        {profileImagePreview ? (
                          <div className="relative">
                            <img
                              src={profileImagePreview}
                              alt="Profile preview"
                              className="w-24 h-24 object-cover rounded-full border border-stone-200"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setProfileImage(null)
                                setProfileImagePreview(null)
                              }}
                              className="absolute top-0 right-0 h-6 w-6 p-0 bg-white/80 hover:bg-white rounded-full"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-stone-300 rounded-full p-6 text-center hover:border-stone-400 transition-colors w-24 h-24 flex items-center justify-center">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="hidden"
                              id="profile-image"
                            />
                            <label htmlFor="profile-image" className="cursor-pointer">
                              <ImageIcon className="h-6 w-6 text-stone-400" />
                            </label>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-1">JPG, PNG, GIF up to 5MB</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="permalink">Profile URL</Label>
                        <Input
                          id="permalink"
                          value={formData.permalink}
                          onChange={(e) => {
                            const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                            setFormData(prev => ({ ...prev, permalink: value }))
                          }}
                          placeholder="Enter profile URL"
                          className="mt-1"
                      />
                      <p className="text-xs text-stone-500 mt-1 break-words overflow-hidden" style={{ wordBreak: 'break-all' }}>
                        This will be your profile URL: zinemap.com/profile/{formData.permalink || 'your-url'}
                      </p>
                      {fieldErrors.permalink && (
                        <p className="text-xs text-red-600 mt-1">{fieldErrors.permalink}</p>
                      )}
                      {formData.permalink && !/^[a-z0-9-]+$/.test(formData.permalink) && (
                        <span className="text-red-500 block mt-1">
                          Only lowercase letters, numbers, and hyphens allowed
                        </span>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="site">Website</Label>
                      <Input
                        id="site"
                        value={formData.site}
                        onChange={(e) => setFormData(prev => ({ ...prev, site: e.target.value }))}
                        placeholder="yourwebsite.com or a link to your social"
                        className="mt-1"
                      />
                      {fieldErrors.site && (
                        <p className="text-xs text-red-600 mt-1">{fieldErrors.site}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell us about yourself..."
                        rows={4}
                        className="mt-1"
                      />
                      <p className="text-xs text-stone-500 mt-1">
                        Maximum 1000 characters. {formData.bio.length}/1000
                      </p>
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
                      </div>
                      
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white border-stone-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-stone-800">Profile Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Joined Date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <span className="text-sm text-stone-600">Joined</span>
                          </div>
                  <span className="text-sm font-medium text-stone-800">
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    }) : 'Unknown'}
                  </span>
                      </div>
                      
                {/* Contributions with hover tooltip */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-500" />
                    <span className="text-sm text-stone-600">Contributions</span>
                      </div>
                  <div className="relative group">
                    <span className="text-lg font-semibold text-stone-800 cursor-help">
                      {contributions.stores + contributions.libraries + contributions.events + contributions.notes}
                    </span>
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-stone-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                      <div className="text-center">
                        <div className="text-stone-300 text-xs">
                          spots: {contributions.stores + contributions.libraries}
                    </div>
                        <div className="text-stone-300 text-xs mt-1">
                          events: {contributions.events}
                  </div>
                        <div className="text-stone-300 text-xs mt-1">
                          notes: {contributions.notes}
                        </div>
                      </div>
                      {/* Arrow */}
                      <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-stone-800"></div>
                    </div>
                  </div>
                </div>

                {/* Zines */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    <span className="text-sm text-stone-600">Zines</span>
                  </div>
                  <span className="text-lg font-semibold text-stone-800">{zines.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Contributions Section - Horizontal Carousel */}
        {activities.length > 0 && (
          <div className="mt-8 mb-6 sm:mb-8">
            <Card className="bg-white border-stone-200 shadow-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-gloria">
                  <MapPin className="h-5 w-5" />
                  Contributions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Carousel opts={{ align: "start", loop: false }} className="w-full">
                  <CarouselContent className="-ml-4">
                    {activities.map((activity) => (
                      <CarouselItem key={activity.id} className="pl-4 basis-[85%] sm:basis-[70%] md:basis-[45%] lg:basis-[360px] h-auto">
                        <div className="block pt-5 pr-5 pb-3 pl-3 bg-white rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 min-h-[140px] h-full border border-stone-100/80">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 relative w-14 h-14">
                              <div className="absolute left-0 top-0 w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm bg-stone-100 z-10">
                                {profile?.profile_image ? (
                                  <img src={profile.profile_image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <User className="h-4 w-4 text-stone-400" />
                                  </div>
                                )}
                              </div>
                              <div className={`absolute right-0 bottom-0 w-9 h-9 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-0 ${
                                activity.entityType === 'shop' ? 'bg-rose-100 text-rose-600' :
                                activity.entityType === 'library' ? 'bg-blue-100 text-blue-600' :
                                activity.entityType === 'event' ? 'bg-green-100 text-green-600' :
                                'bg-amber-100 text-amber-600'
                              }`}>
                                {activity.entityType === 'shop' && <Store className="h-4 w-4" />}
                                {activity.entityType === 'library' && <Library className="h-4 w-4" />}
                                {activity.entityType === 'event' && <Calendar className="h-4 w-4" />}
                                {activity.entityType === 'edit' && <Pencil className="h-4 w-4" />}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-stone-500 mb-1">
                                {new Date(activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                              <p className="text-sm text-stone-700 leading-snug">
                                <Link href={profile?.permalink ? `/profile/${profile.permalink}` : '/profile'} target="_blank" rel="noopener noreferrer" className="font-semibold text-stone-800 hover:text-rose-600 hover:underline">
                                  {profile?.display_name || 'Anonymous'}
                                </Link>
                                {activity.type === 'edit' ? (
                                  <> suggested an edit to the page: <Link href={activity.entityUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-rose-600 hover:text-rose-700 hover:underline">{activity.entityName}</Link>.</>
                                ) : (
                                  <>
                                    {' added '}
                                    <Link href={activity.entityUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-rose-600 hover:text-rose-700 hover:underline">
                                      {activity.entityName}
                                    </Link>
                                    {' to '}
                                    <Link href={activity.sectionUrl} target="_blank" rel="noopener noreferrer" className="font-bold italic text-stone-700 hover:text-stone-900 hover:underline">
                                      {activity.sectionLabel}
                                    </Link>
                                    {activity.note ? (
                                      <>: <span className="italic line-clamp-4">&ldquo;{activity.note}&rdquo;</span></>
                                    ) : (
                                      '.'
                                    )}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="-left-2 sm:-left-4" />
                  <CarouselNext className="-right-2 sm:-right-4" />
                </Carousel>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Zines Section - Full Width */}
        <div className="mt-8 mb-6 sm:mb-8">
            <Card className="bg-white border-stone-200 shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <CardTitle className="flex items-center gap-2 font-gloria">
                  <BookOpen className="h-5 w-5" />
                  My Zines
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingZine(null)
                      setShowZineModal(true)
                    }}
                    className="w-full sm:w-auto"
                  >
                    Add Zine
                  </Button>
                  <Link href="/dashboard" className="w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      Go to Dashboard
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {zines.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-stone-400" />
                    <h3 className="text-lg font-semibold text-stone-800 mb-2">No zines yet</h3>
                    <p className="text-stone-600 mb-4">Start adding your first zine!</p>
                    <Link href="/dashboard">
                      <Button>Go to Dashboard</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {zines.map((zine) => (
                      <div
                        key={zine.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 border border-stone-200 rounded-lg hover:bg-stone-50"
                      >
                        {/* Cover Image */}
                        <div className="flex-shrink-0">
                          {zine.cover_image ? (
                            <img
                              src={zine.cover_image}
                              alt={`${zine.title} cover`}
                              className="w-16 h-20 object-cover rounded border border-stone-200"
                            />
                          ) : (
                            <div className="w-16 h-20 rounded border border-stone-200 bg-stone-100 flex items-center justify-center">
                              <BookOpen className="h-8 w-8 text-stone-400" />
                            </div>
                          )}
                        </div>
                        
                        {/* Zine Info */}
                        <div className="flex-1 min-w-0">
                          <div className="mb-2">
                            <h3 className="font-semibold text-stone-800">{zine.title}</h3>
                          </div>
                          {zine.description && (
                            <p className="text-sm text-stone-600 line-clamp-3">
                              {zine.description}
                            </p>
                          )}
                        </div>
                        
                        {/* Actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={zine.is_public}
                              onCheckedChange={() => toggleZinePublic(zine.id, zine.is_public)}
                            />
                            <span className="text-sm text-stone-600">
                              {zine.is_public ? 'Public' : 'Private'}
                            </span>
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingZine(zine)
                              setShowZineModal(true)
                            }}
                            className="w-full sm:w-auto"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
        </div>

        {/* Events Section - Full Width */}
        <div className="mb-6 sm:mb-8 space-y-6">
          {/* Upcoming Events */}
          <Card className="bg-white border-stone-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-gloria">
                <Calendar className="h-5 w-5" />
                Events I'm Going To
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const upcomingEvents = attendingEvents.filter(event => !isPastEvent(event))
                return upcomingEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-stone-400" />
                    <h3 className="text-lg font-semibold text-stone-800 mb-2">No upcoming events</h3>
                    <p className="text-stone-600 mb-4">Start exploring events and mark yourself as attending!</p>
                    <Link href="/events">
                      <Button>Explore events</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {upcomingEvents.map((event) => (
                      <Link
                        key={event.id}
                        href={`/event/${event.permalink || event.id}`}
                        className="group p-3 border border-stone-200 rounded-lg hover:bg-stone-50 hover:border-[#009035] transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-[#009035] mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-stone-800 text-sm mb-1 group-hover:text-[#009035] transition-colors line-clamp-1">
                              {event.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <Badge 
                                className="text-xs bg-green-50 text-[#009035] border-green-200"
                              >
                                {getEventCategoryDisplay(event.category)}
                              </Badge>
                              <span className="text-xs text-stone-500">
                                {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                {event.start_date !== event.end_date && ` - ${new Date(event.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                              </span>
                            </div>
                            <p className="text-xs text-stone-600 line-clamp-1">
                              {event.city}{event.state && `, ${event.state}`}, {event.country}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          {/* Past Events */}
          <Card className="bg-white border-stone-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-gloria">
                <Calendar className="h-5 w-5" />
                Events I Went To
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const pastEvents = attendingEvents.filter(event => isPastEvent(event))
                return pastEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-stone-400" />
                    <h3 className="text-lg font-semibold text-stone-800 mb-2">No past events</h3>
                    <p className="text-stone-600">Events you've attended will appear here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {pastEvents.map((event) => (
                      <Link
                        key={event.id}
                        href={`/event/${event.permalink || event.id}`}
                        className="group p-3 border border-stone-200 rounded-lg hover:bg-stone-50 hover:border-stone-300 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-stone-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-stone-800 text-sm mb-1 group-hover:text-stone-600 transition-colors line-clamp-1">
                              {event.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <Badge 
                                className="text-xs bg-stone-50 text-stone-600 border-stone-200"
                              >
                                {getEventCategoryDisplay(event.category)}
                              </Badge>
                              <span className="text-xs text-stone-500">
                                {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                {event.start_date !== event.end_date && ` - ${new Date(event.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                              </span>
                            </div>
                            <p className="text-xs text-stone-600 line-clamp-1">
                              {event.city}{event.state && `, ${event.state}`}, {event.country}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Zine Modal */}
      <AddZineModal
        user={user}
        show={showZineModal}
        onClose={() => {
          setShowZineModal(false)
          setEditingZine(null)
        }}
        onSuccess={() => {
          setShowZineModal(false)
          setEditingZine(null)
          fetchProfileData() // Refresh zines
        }}
        mode={editingZine ? "edit" : "create"}
        zine={editingZine}
      />
    </div>
  )
} 