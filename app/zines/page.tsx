"use client"

import { Search, BookOpen, User, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Zine, UserProfile } from "@/lib/types"
import { autoLinkText } from "@/lib/utils"

interface ZineWithAuthor extends Zine {
  profiles: UserProfile
}


export default function ZinesPage() {
  const [zines, setZines] = useState<ZineWithAuthor[]>([])
  const [filteredZines, setFilteredZines] = useState<ZineWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [selectedZine, setSelectedZine] = useState<ZineWithAuthor | null>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch data
  useEffect(() => {
    const fetchZines = async () => {
      try {
        setLoading(true)

        // Fetch all public zines
        const { data: zinesData, error: zinesError } = await supabase
          .from('zines')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false })

        if (zinesError) {
          console.error('Error fetching zines:', zinesError)
          return
        }

        // Fetch all profiles for the zine authors
        const userIds = [...new Set(zinesData?.map(zine => zine.user_id) || [])]
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, profile_image, permalink')
          .in('id', userIds)

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError)
          return
        }

        // Join zines with their authors
        const zinesWithAuthors = zinesData?.map(zine => ({
          ...zine,
          profiles: profilesData?.find(profile => profile.id === zine.user_id) || null
        })) || []

        setZines(zinesWithAuthors)
      } catch (error) {
        console.error('Error fetching zines:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchZines()
  }, [])

  // Filter zines based on search query
  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setFilteredZines(zines)
      return
    }

    const query = debouncedSearchQuery.toLowerCase()
    const filtered = zines.filter(zine => 
      zine.title.toLowerCase().includes(query) ||
      zine.description?.toLowerCase().includes(query) ||
      zine.profiles?.display_name?.toLowerCase().includes(query)
    )
    setFilteredZines(filtered)
  }, [zines, debouncedSearchQuery])


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif">
        <div className="w-full bg-white border-b border-stone-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-8 text-center">
            <div className="text-4xl md:text-5xl font-bold text-stone-800 mb-2 tracking-tight font-gloria">Zines</div>
            <div className="flex justify-center items-center mb-3">
              <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
              <div className="mx-3 text-purple-500">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
            </div>
            <p className="text-lg md:text-xl text-stone-600 italic font-gloria">Discover zines from creators worldwide</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <div className="text-stone-500 text-lg">Loading zines...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 font-serif">
      {/* Header */}
      <header className="w-full bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h3 className="font-gloria text-4xl md:text-5xl font-bold text-stone-800 mb-2 tracking-tight">Zines</h3>
          <div className="flex justify-center items-center mb-3">
            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
            <div className="mx-3 text-purple-500">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
          </div>
          <p className="text-lg md:text-xl text-stone-600 italic font-gloria">Discover zines from creators worldwide</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-8">
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 h-4 w-4" />
              <Input
                placeholder="Search zines, authors, or descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-stone-300 focus:border-purple-300 focus:ring-purple-200"
              />
            </div>
          </div>
        </div>

        {/* Zines Grid - Desktop */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredZines.length === 0 ? (
            <div className="col-span-full">
              <Card className="bg-white border-stone-200 shadow-sm rounded-lg">
                <CardContent className="p-12 text-center">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-purple-400" />
                  <h3 className="text-xl font-semibold text-stone-800 mb-2">
                    {searchQuery ? 'No zines found' : 'No zines available'}
                  </h3>
                  <p className="text-stone-600">
                    {searchQuery 
                      ? 'Try adjusting your search terms'
                      : 'Check back later for new zines from creators'
                    }
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredZines.map((zine) => (
              <Card key={zine.id} className="bg-white border-stone-200 shadow-sm rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  {/* Cover Image */}
                  <div 
                    className="aspect-[3/4] bg-stone-100 relative overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedZine(zine)}
                  >
                    {zine.cover_image ? (
                      <img
                        src={zine.cover_image}
                        alt={zine.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-stone-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {/* Title */}
                    <h3 className="font-semibold text-stone-800 mb-2 line-clamp-2 text-lg">
                      {zine.title}
                    </h3>

                    {/* Author */}
                    <div className="flex items-center gap-2 mb-3">
                      <Link 
                        href={`/profile/${zine.profiles?.permalink || zine.profiles?.id}`}
                        className="w-6 h-6 rounded-full bg-stone-200 overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-purple-200 transition-all"
                      >
                        {zine.profiles?.profile_image ? (
                          <img
                            src={zine.profiles.profile_image}
                            alt={zine.profiles.display_name || 'Author'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="h-3 w-3 text-stone-500" />
                          </div>
                        )}
                      </Link>
                      <Link 
                        href={`/profile/${zine.profiles?.permalink || zine.profiles?.id}`}
                        className="text-sm text-stone-600 hover:text-purple-600 transition-colors font-medium"
                      >
                        {zine.profiles?.display_name || 'Unknown Author'}
                      </Link>
                    </div>

                    {/* Description */}
                    {zine.description && (
                      <p className="text-sm text-stone-600 mb-3 line-clamp-3">
                        {autoLinkText(zine.description)}
                      </p>
                    )}

                    {/* Added Date */}
                    <div className="flex items-center justify-end text-sm text-stone-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Added on {formatDate(zine.created_at)}
                      </span>
                    </div>

                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Zines List - Mobile */}
        <div className="md:hidden">
          {filteredZines.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-stone-400" />
              <h3 className="text-lg font-semibold text-stone-800 mb-2">No zines found</h3>
              <p className="text-stone-600">
                {searchQuery ? 'Try adjusting your search terms.' : 'No zines have been published yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredZines.map((zine) => (
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
                    
                    {/* Author */}
                    <div className="flex items-center gap-2 mb-2">
                      <Link 
                        href={`/profile/${zine.profiles?.permalink || zine.profiles?.id}`}
                        className="w-5 h-5 rounded-full bg-stone-200 overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-purple-200 transition-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {zine.profiles?.profile_image ? (
                          <img
                            src={zine.profiles.profile_image}
                            alt={zine.profiles.display_name || 'Author'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="h-3 w-3 text-stone-500" />
                          </div>
                        )}
                      </Link>
                      <Link 
                        href={`/profile/${zine.profiles?.permalink || zine.profiles?.id}`}
                        className="text-sm text-stone-600 hover:text-purple-600 transition-colors font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {zine.profiles?.display_name || 'Unknown Author'}
                      </Link>
                    </div>

                    {zine.description && (
                      <p className="text-sm text-stone-600 line-clamp-2 mb-2">
                        {autoLinkText(zine.description)}
                      </p>
                    )}

                    <div className="flex items-center gap-1 text-xs text-stone-500">
                      <Calendar className="h-3 w-3" />
                      Added on {formatDate(zine.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results Count */}
        {filteredZines.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-stone-600">
              Showing {filteredZines.length} of {zines.length} zines
            </p>
          </div>
        )}
      </div>

      {/* Zine Description Modal */}
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
                  
                  {/* Author */}
                  <div className="flex items-center gap-2 mb-4">
                    <Link 
                      href={`/profile/${selectedZine.profiles?.permalink || selectedZine.profiles?.id}`}
                      className="w-8 h-8 rounded-full bg-stone-200 overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-purple-200 transition-all"
                    >
                      {selectedZine.profiles?.profile_image ? (
                        <img
                          src={selectedZine.profiles.profile_image}
                          alt={selectedZine.profiles.display_name || 'Author'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="h-4 w-4 text-stone-500" />
                        </div>
                      )}
                    </Link>
                    <Link 
                      href={`/profile/${selectedZine.profiles?.permalink || selectedZine.profiles?.id}`}
                      className="text-stone-600 hover:text-purple-600 transition-colors font-medium"
                    >
                      {selectedZine.profiles?.display_name || 'Unknown Author'}
                    </Link>
                  </div>
                  
                  {selectedZine.description && (
                    <div className="mb-4">
                      <p className="text-stone-600 whitespace-pre-wrap">{autoLinkText(selectedZine.description)}</p>
                    </div>
                  )}

                  {/* Added Date */}
                  <div className="flex items-center gap-1 text-sm text-stone-500">
                    <Calendar className="h-4 w-4" />
                    Added on {formatDate(selectedZine.created_at)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
