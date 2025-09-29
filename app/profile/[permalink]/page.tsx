"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Globe, User, BookOpen, MapPin, Calendar, ArrowLeft } from "lucide-react"
import { supabase } from '@/lib/supabaseClient'
import { UserProfile, Zine } from '@/lib/types'
import { autoLinkText } from '@/lib/utils'
import Link from 'next/link'

export default function PublicProfilePage() {
  const params = useParams()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [publicZines, setPublicZines] = useState<Zine[]>([])
  const [totalZines, setTotalZines] = useState<number>(0)
  const [contributions, setContributions] = useState<{
    stores: number
    libraries: number
    events: number
    notes: number
  }>({ stores: 0, libraries: 0, events: 0, notes: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedZine, setSelectedZine] = useState<Zine | null>(null)

  useEffect(() => {
    if (params.permalink) {
      fetchProfileData(params.permalink as string)
    }
  }, [params.permalink])

  // Fetch user's contributions (stores, libraries, community notes)
  const fetchContributions = async (userId: string) => {
    try {
      // Count stores
      const { count: storesCount } = await supabase
        .from('stores')
        .select('*', { count: 'exact', head: true })
        .eq('submitted_by', userId)

      // Count libraries
      const { count: librariesCount } = await supabase
        .from('libraries')
        .select('*', { count: 'exact', head: true })
        .eq('submitted_by', userId)

      // Count events
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('submitted_by', userId)

      // Count community notes
      const { count: notesCount } = await supabase
        .from('community_notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      setContributions({
        stores: storesCount || 0,
        libraries: librariesCount || 0,
        events: eventsCount || 0,
        notes: notesCount || 0
      })
    } catch (err) {
      console.error('Contributions fetch error:', err)
      setContributions({ stores: 0, libraries: 0, events: 0, notes: 0 })
    }
  }

  const fetchProfileData = async (permalink: string) => {
    try {
      setLoading(true)
      setError(null)

      // Fetch profile by permalink
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('permalink', permalink)
        .single()

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          setError('Profile not found')
        } else {
          console.error('Profile fetch error:', profileError)
          setError('Failed to load profile')
        }
        return
      }

      setProfile(profileData)

      // Fetch all zines for this user (for count)
      const { data: allZinesData, error: allZinesError } = await supabase
        .from('zines')
        .select('*')
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false })

      if (allZinesError) {
        console.error('Zines fetch error:', allZinesError)
      } else {
        // Set public zines for display
        const publicZines = (allZinesData || []).filter(zine => zine.is_public)
        setPublicZines(publicZines)
        
        // Store total count for stats
        setTotalZines(allZinesData?.length || 0)
      }

      // Fetch user's contributions (stores, libraries, community notes)
      await fetchContributions(profileData.id)



    } catch (err) {
      console.error('Error fetching profile data:', err)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500 text-lg">Loading...</div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-800 mb-4">Profile Not Found</h1>
          <p className="text-stone-600 mb-6">{error || 'The requested profile could not be found.'}</p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
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
        {/* Profile and Stats Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 mb-6 sm:mb-8">
          {/* Profile Section */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-stone-200 shadow-sm overflow-hidden">
              <CardContent className="pt-6 overflow-hidden">
                <div className="space-y-4 sm:space-y-6">
                  {/* Profile Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                    {/* Profile Image */}
                    <div className="flex-shrink-0">
                      {profile.profile_image ? (
                        <img
                          src={profile.profile_image}
                          alt="Profile"
                          className="w-20 h-20 object-cover rounded-full border-2 border-stone-200"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-stone-100 border-2 border-stone-200 flex items-center justify-center">
                          <User className="h-10 w-10 text-stone-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Profile Info */}
                    <div className="flex-1 min-w-0">
                      {/* Display Name with Profile URL Link */}
                      <h2 className="text-2xl font-bold text-stone-800 mb-2 font-gloria">
                        {profile.display_name || 'Anonymous User'}
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

                  {/* Bio */}
                  {profile.bio && (
                    <div>
                      <p className="text-stone-700 leading-relaxed">
                        {profile.bio}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Section */}
          <div>
            <Card className="bg-white border-stone-200 shadow-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg font-gloria">Stats</CardTitle>
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
                  <span className="text-lg font-semibold text-stone-800">{totalZines}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Public Zines Section */}
        <div className="mb-6 sm:mb-8">
          <Card className="bg-white border-stone-200 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-gloria">
                <BookOpen className="h-5 w-5" />
                Zines by {profile.display_name || 'Anonymous User'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {publicZines.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-stone-400" />
                  <h3 className="text-lg font-semibold text-stone-800 mb-2">No public zines</h3>
                  <p className="text-stone-600">This user hasn't made any zines public yet.</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {publicZines.map((zine) => (
                    <div
                      key={zine.id}
                      className="flex items-center gap-4 p-4 border border-stone-200 rounded-lg hover:bg-stone-50 cursor-pointer"
                      onClick={() => setSelectedZine(zine)}
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
                      

                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Zine Popup Modal - Outside main content container */}
      {selectedZine && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedZine(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Close button */}
              <button
                onClick={() => setSelectedZine(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
              
              <div className="flex flex-col md:flex-row gap-6">
                {/* Cover Image */}
                <div className="flex-shrink-0">
                  {selectedZine.cover_image ? (
                    <img
                      src={selectedZine.cover_image}
                      alt={`${selectedZine.title} cover`}
                      className="w-full md:w-64 h-auto max-h-96 object-cover rounded border border-stone-200"
                    />
                  ) : (
                    <div className="w-full md:w-64 h-80 rounded border border-stone-200 bg-stone-100 flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-stone-400" />
                    </div>
                  )}
                </div>
                
                {/* Zine Details */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-stone-800 mb-4">{selectedZine.title}</h2>
                  
                  {selectedZine.description && (
                    <div className="mb-4">
                      <p className="text-stone-600 whitespace-pre-wrap">{autoLinkText(selectedZine.description)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 