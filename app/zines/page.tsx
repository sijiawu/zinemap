"use client"

import { Search, BookOpen, User, Calendar, ChevronLeft, ChevronRight, Shuffle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Zine, UserProfile } from "@/lib/types"
import { autoLinkText } from "@/lib/utils"
import { RelativeDateWithTooltip } from "@/components/RelativeDateWithTooltip"

interface ZineWithAuthor extends Zine {
  profiles: UserProfile
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export default function ZinesPage() {
  const [zines, setZines] = useState<ZineWithAuthor[]>([])
  const [filteredZines, setFilteredZines] = useState<ZineWithAuthor[]>([])
  const [displayZines, setDisplayZines] = useState<ZineWithAuthor[] | null>(null)
  const [loadingShuffle, setLoadingShuffle] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("")
  const [selectedZine, setSelectedZine] = useState<ZineWithAuthor | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalZines, setTotalZines] = useState(0)
  const itemsPerPage = 20
  
  // Author filter state
  const [selectedCreator, setSelectedCreator] = useState("all")
  const [creators, setCreators] = useState<{id: string, display_name: string, permalink: string}[]>([])
  const [creatorsLoaded, setCreatorsLoaded] = useState(false)
  const [loadingAuthors, setLoadingAuthors] = useState(false)
  
  // Profile cache to avoid refetching
  const [profileCache, setProfileCache] = useState<Record<string, any>>({})

  // Fetch author names using a single efficient query with join
  useEffect(() => {
    const fetchAuthorNames = async () => {
      if (creatorsLoaded) return

      try {
        setLoadingAuthors(true)
        
        // Get all unique user IDs who have published zines
        const { data: zineAuthors, error: zineError } = await supabase
          .from('zines')
          .select('user_id')
          .eq('is_public', true)

        if (zineError) {
          console.error('Error fetching zine authors:', zineError)
          return
        }

        const uniqueUserIds = [...new Set(zineAuthors?.map(zine => zine.user_id) || [])]

        if (uniqueUserIds.length === 0) {
          setCreatorsLoaded(true)
          setLoadingAuthors(false)
          return
        }

        // Fetch author names for dropdown
        const { data: authorsData, error: authorsError } = await supabase
          .from('profiles')
          .select(`
            id, 
            display_name, 
            permalink
          `)
          .in('id', uniqueUserIds)
          .order('display_name', { ascending: true })

        if (authorsError) {
          console.error('Error fetching authors:', authorsError)
          return
        }

        const authorNames = authorsData?.map(profile => ({
          id: profile.id,
          display_name: profile.display_name || 'Unknown Author',
          permalink: profile.permalink || profile.id
        })) || []

        setCreators(authorNames)
        setCreatorsLoaded(true)
      } catch (error) {
        console.error('Error fetching author names:', error)
      } finally {
        setLoadingAuthors(false)
      }
    }

    fetchAuthorNames()
  }, [creatorsLoaded])

  // Fetch data with pagination using database joins
  useEffect(() => {
    const fetchZines = async () => {
      try {
        setLoading(true)

        // First, get total count
        const { count: totalCount, error: countError } = await supabase
          .from('zines')
          .select('*', { count: 'exact', head: true })
          .eq('is_public', true)

        if (countError) {
          console.error('Error fetching zine count:', countError)
          return
        }

        setTotalZines(totalCount || 0)
        setTotalPages(Math.ceil((totalCount || 0) / itemsPerPage))

        // Calculate offset for pagination
        const offset = (currentPage - 1) * itemsPerPage

        // Fetch paginated zines
        const { data: zinesData, error: zinesError } = await supabase
          .from('zines')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .range(offset, offset + itemsPerPage - 1)

        if (zinesError) {
          console.error('Error fetching zines:', zinesError)
          return
        }

        // Fetch profiles for the zine authors
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

        // Cache profiles for future use
        const newProfileCache = { ...profileCache }
        profilesData?.forEach(profile => {
          newProfileCache[profile.id] = profile
        })
        setProfileCache(newProfileCache)

        setZines(zinesWithAuthors)
      } catch (error) {
        console.error('Error fetching zines:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchZines()
  }, [currentPage, itemsPerPage])

  // Handle search using database text search with joins
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!appliedSearchQuery.trim()) {
        setFilteredZines(zines)
        return
      }

      try {
        setLoading(true)
        
        // Fetch all zines for search
        const { data: allZinesData, error: zinesError } = await supabase
          .from('zines')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false })

        if (zinesError) {
          console.error('Error fetching zines for search:', zinesError)
          return
        }

        // Fetch all profiles for the zine authors
        const userIds = [...new Set(allZinesData?.map(zine => zine.user_id) || [])]
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, profile_image, permalink')
          .in('id', userIds)

        if (profilesError) {
          console.error('Error fetching profiles for search:', profilesError)
          return
        }

        // Join zines with their authors
        const allZinesWithAuthors = allZinesData?.map(zine => ({
          ...zine,
          profiles: profilesData?.find(profile => profile.id === zine.user_id) || null
        })) || []

        // Filter based on search query
        const query = appliedSearchQuery.toLowerCase()
        const filtered = allZinesWithAuthors.filter(zine => 
          zine.title.toLowerCase().includes(query) ||
          zine.description?.toLowerCase().includes(query) ||
          zine.profiles?.display_name?.toLowerCase().includes(query)
        )

        // Cache any new profiles found in search
        const newProfileCache = { ...profileCache }
        profilesData?.forEach(profile => {
          newProfileCache[profile.id] = profile
        })
        setProfileCache(newProfileCache)

        setFilteredZines(filtered)
        setCurrentPage(1) // Reset to first page when searching
      } catch (error) {
        console.error('Error fetching search results:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSearchResults()
  }, [appliedSearchQuery])

  // When not searching, use paginated results
  useEffect(() => {
    if (!appliedSearchQuery.trim()) {
      setFilteredZines(zines)
    }
  }, [zines, appliedSearchQuery])

  // Reset shuffle when search, author filter, or page changes
  useEffect(() => {
    setDisplayZines(null)
  }, [appliedSearchQuery, selectedCreator, currentPage])

  // Handle author filtering using database joins
  useEffect(() => {
    if (selectedCreator === "all") {
      if (!appliedSearchQuery.trim()) {
        setFilteredZines(zines)
      }
      return
    }

    // Fetch zines for selected author using database join
    const fetchAuthorZines = async () => {
      try {
        setLoading(true)
        
        // Check if we already have the author's profile cached
        let authorProfile = profileCache[selectedCreator]
        
        if (!authorProfile) {
          // Fetch the author's profile if not cached
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, display_name, profile_image, permalink')
            .eq('id', selectedCreator)
            .single()

          if (profileError) {
            console.error('Error fetching author profile:', profileError)
            return
          }
          
          authorProfile = profileData
          // Cache the profile
          setProfileCache(prev => ({ ...prev, [selectedCreator]: authorProfile }))
        }
        
        // Fetch all zines for the selected author
        const { data: authorZinesData, error: zinesError } = await supabase
          .from('zines')
          .select('*')
          .eq('is_public', true)
          .eq('user_id', selectedCreator)
          .order('created_at', { ascending: false })

        if (zinesError) {
          console.error('Error fetching author zines:', zinesError)
          return
        }

        // Join zines with author profile
        const authorZinesWithProfile = authorZinesData?.map(zine => ({
          ...zine,
          profiles: authorProfile
        })) || []

        setFilteredZines(authorZinesWithProfile)
      } catch (error) {
        console.error('Error fetching author zines:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAuthorZines()
  }, [selectedCreator, appliedSearchQuery])


  // Fetch 20 random zines from all zines
  const handleShuffle = async () => {
    try {
      setLoadingShuffle(true)

      const { data: allIds, error: idsError } = await supabase
        .from('zines')
        .select('id')
        .eq('is_public', true)

      if (idsError || !allIds?.length) {
        setDisplayZines([])
        return
      }

      const shuffledIds = shuffleArray([...allIds]).slice(0, 20).map((r) => r.id)

      const { data: zinesData, error: zinesError } = await supabase
        .from('zines')
        .select('*')
        .in('id', shuffledIds)
        .eq('is_public', true)

      if (zinesError) {
        console.error('Error fetching random zines:', zinesError)
        return
      }

      const userIds = [...new Set(zinesData?.map((z) => z.user_id) || [])]
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, profile_image, permalink')
        .in('id', userIds)

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        return
      }

      const zinesWithAuthors = (zinesData || []).map((zine) => ({
        ...zine,
        profiles: profilesData?.find((p) => p.id === zine.user_id) || null,
      }))

      const orderMap = Object.fromEntries(shuffledIds.map((id, i) => [id, i]))
      zinesWithAuthors.sort((a, b) => orderMap[a.id] - orderMap[b.id])

      setDisplayZines(zinesWithAuthors)
    } catch (error) {
      console.error('Error shuffling zines:', error)
    } finally {
      setLoadingShuffle(false)
    }
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Clear search and creator filter when changing pages
    if (appliedSearchQuery.trim()) {
      setSearchQuery("")
      setAppliedSearchQuery("")
    }
    if (selectedCreator !== "all") {
      setSelectedCreator("all")
    }
  }

  const handleFind = () => {
    setDisplayZines(null)
    setCurrentPage(1)
    setAppliedSearchQuery(searchQuery.trim())
  }

  const handleViewAll = () => {
    setDisplayZines(null)
    setSearchQuery("")
    setAppliedSearchQuery("")
    setCurrentPage(1)
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

  const zinesToDisplay = displayZines ?? filteredZines

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
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 h-4 w-4" />
                  <Input
                    placeholder="Search zines, authors, or descriptions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleFind()
                      }
                    }}
                    className="pl-10 bg-white border-stone-300 focus:border-purple-300 focus:ring-purple-200"
                  />
                </div>
              </div>

              <Button
                variant="outline"
                size="default"
                onClick={handleFind}
                className="shrink-0 bg-white border-stone-300 hover:bg-stone-50 hover:border-purple-300 text-stone-700"
              >
                Find
              </Button>

              {/* Shuffle - hidden when author selected or search active */}
              {selectedCreator === "all" && !appliedSearchQuery.trim() && (
                <>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleShuffle}
                    disabled={loadingShuffle || totalZines === 0}
                    className="shrink-0 bg-white border-stone-300 hover:bg-stone-50 hover:border-purple-300 text-stone-700"
                  >
                    <Shuffle className="h-4 w-4" />
                    {loadingShuffle ? 'Shuffling…' : 'Shuffle'}
                  </Button>

                </>
              )}

              {/* View all - shown when shuffle mode or search results are active */}
              {(displayZines || appliedSearchQuery.trim()) && (
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleViewAll}
                  className="shrink-0 bg-white border-stone-300 hover:bg-stone-50 hover:border-purple-300 text-stone-700"
                >
                  View all
                </Button>
              )}
              
              {/* Author Filter */}
              <div className="sm:w-64">
                <Select value={selectedCreator} onValueChange={setSelectedCreator} disabled={loadingAuthors}>
                  <SelectTrigger className="bg-white border-stone-300 focus:border-purple-300 focus:ring-purple-200">
                    <SelectValue placeholder={loadingAuthors ? "Loading authors..." : "All authors"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All authors</SelectItem>
                    {creators.map((creator) => (
                      <SelectItem key={creator.id} value={creator.id}>
                        {creator.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Zines Grid - Desktop */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {zinesToDisplay.length === 0 ? (
            <div className="col-span-full">
              <Card className="bg-white border-stone-200 shadow-sm rounded-lg">
                <CardContent className="p-12 text-center">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-purple-400" />
                  <h3 className="text-xl font-semibold text-stone-800 mb-2">
                    {appliedSearchQuery ? 'No zines found' : 'No zines available'}
                  </h3>
                  <p className="text-stone-600">
                    {appliedSearchQuery 
                      ? 'Try adjusting your search terms'
                      : 'Check back later for new zines from creators'
                    }
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            zinesToDisplay.map((zine) => (
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
                        <RelativeDateWithTooltip dateString={zine.created_at} prefix="Added " />
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
          {zinesToDisplay.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-stone-400" />
              <h3 className="text-lg font-semibold text-stone-800 mb-2">No zines found</h3>
              <p className="text-stone-600">
                {appliedSearchQuery ? 'Try adjusting your search terms.' : 'No zines have been published yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {zinesToDisplay.map((zine) => (
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
                      <RelativeDateWithTooltip dateString={zine.created_at} prefix="Added " />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {!displayZines && !appliedSearchQuery.trim() && selectedCreator === "all" && totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        currentPage === pageNum
                          ? 'bg-purple-600 text-white'
                          : 'text-stone-700 bg-white border border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
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
                    <RelativeDateWithTooltip dateString={selectedZine.created_at} prefix="Added " />
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
