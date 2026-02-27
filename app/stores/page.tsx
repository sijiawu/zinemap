"use client"

import { Search, MapPin, Filter, ExternalLink, User, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { StoreMap } from "@/components/store-map"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Store, Library, Event, Tag } from "@/lib/types"
import { formatSocialMedia, sortSplitTagsByCreatorPercentage } from "@/lib/utils"
import { RelativeDateWithTooltip } from "@/components/RelativeDateWithTooltip"
import { useLocationFilters } from "@/hooks/useLocationFilters"

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [filteredStores, setFilteredStores] = useState<Store[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [noMaxPrice, setNoMaxPrice] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  
  // Map height tracking for list view min-height
  const mapCardRef = useRef<HTMLDivElement>(null)
  const [mapHeight, setMapHeight] = useState(0)

  // Use location filters hook
  const {
    selectedCountry,
    selectedState,
    selectedCity,
    setSelectedCountry,
    setSelectedState,
    setSelectedCity,
    countries,
    states,
    cities,
    clearLocationFilters
  } = useLocationFilters({ items: stores })

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch stores
        const { data: storesData, error: storesError } = await supabase
          .from('stores')
          .select('*')
          .eq('approved', true)
          .order('created_at', { ascending: false })

        if (storesError) {
          console.error('Error fetching stores:', storesError)
        }

        // Fetch store tags only (all categories except 'service' and 'access')
        const { data: tagsData, error: tagsError } = await supabase
          .from('tags')
          .select('*')
          .not('category', 'in', '(service,access)')
          .order('label')
        
        // Sort split tags by creator percentage (smallest to largest)
        let sortedTags = tagsData || []
        if (tagsData) {
          const splitTags = tagsData.filter(tag => tag.category === 'split')
          const otherTags = tagsData.filter(tag => tag.category !== 'split')
          const sortedSplitTags = sortSplitTagsByCreatorPercentage(splitTags)
          sortedTags = [...sortedSplitTags, ...otherTags]
        }

        if (tagsError) {
          console.error('Error fetching tags:', tagsError)
        }

        // Batch fetch all store tags
        const { data: allStoreTags } = await supabase
          .from('store_tags')
          .select(`
            id,
            store_id,
            tag_id,
            tags!inner(id, label, category)
          `)
          .in('store_id', (storesData || []).map(s => s.id))

        // Batch fetch all user profiles
        const storeUserIds = (storesData || []).map(s => s.submitted_by)
        const { data: allStoreUserProfiles } = await supabase
          .from('profiles')
          .select('id, display_name, permalink')
          .in('id', storeUserIds)

        // Fetch locale_edits for "last edited by" (addressed or approved only)
        const { data: allStoreEdits } = await supabase
          .from('locale_edits')
          .select('store_id, user_id, created_at, status')
          .not('store_id', 'is', null)
          .order('created_at', { ascending: false })
        const storeLastEditsMap = new Map<string, string>()
        for (const edit of allStoreEdits || []) {
          if ((edit.status === 'addressed' || edit.status === 'approved') && !storeLastEditsMap.has(edit.store_id)) {
            storeLastEditsMap.set(edit.store_id, edit.user_id)
          }
        }
        const editorIds = Array.from(new Set(storeLastEditsMap.values()))
        const { data: editorProfiles } = editorIds.length > 0 ? await supabase
          .from('profiles')
          .select('id, display_name, permalink')
          .in('id', editorIds) : { data: [] }
        const editorMap = new Map(
          (editorProfiles || []).map(p => [p.id, { display_name: p.display_name, permalink: p.permalink }])
        )

        // Create user lookup map
        const storeUserMap = new Map(
          (allStoreUserProfiles || []).map(user => [user.id, { display_name: user.display_name, permalink: user.permalink }])
        )

        // Process stores with tags and user info
        const storesWithTags = (storesData || []).map((store) => {
          const storeTags = (allStoreTags || [])
            .filter(tag => tag.store_id === store.id)
            .map((tag: any) => ({
              id: tag.id || `store-tag-${store.id}-${tag.tag_id}`,
              tag_id: tag.tag_id,
              tag: tag.tags
            }))

          const userData = storeUserMap.get(store.submitted_by) || { display_name: 'Unknown user', permalink: null }
          const user_name = userData.display_name
          const user_permalink = userData.permalink
          const lastEditUserId = storeLastEditsMap.get(store.id)
          const lastEditUserData = lastEditUserId ? editorMap.get(lastEditUserId) : null

          return {
            ...store,
            store_tags: storeTags,
            user_name,
            user_permalink,
            last_edit_user_name: lastEditUserData?.display_name ?? undefined,
            last_edit_user_permalink: lastEditUserData?.permalink ?? undefined
          }
        })

        setStores(storesWithTags)
        setAllTags(sortedTags)
      } catch (error) {
        console.error('Error fetching data:', error)
        setStores([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter stores based on all criteria
  useEffect(() => {
    if (!stores) return

    let filtered = stores

    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim()
      filtered = filtered.filter(store => 
        store.name.toLowerCase().includes(query) ||
        store.city.toLowerCase().includes(query) ||
        (store.state && store.state.toLowerCase().includes(query)) ||
        store.country.toLowerCase().includes(query) ||
        store.address.toLowerCase().includes(query)
      )
    }

    // Apply country filter
    if (selectedCountry && selectedCountry !== "all") {
      filtered = filtered.filter(store => store.country === selectedCountry)
    }

    // Apply state filter
    if (selectedState && selectedState !== "all") {
      filtered = filtered.filter(store => store.state === selectedState)
    }

    // Apply city filter
    if (selectedCity && selectedCity !== "all") {
      filtered = filtered.filter(store => store.city === selectedCity)
    }

    // Apply tag filters (including "no maximum price" as OR condition)
    if (selectedTags.length > 0 || noMaxPrice) {
      filtered = filtered.filter(store => {
        // Check if store has any of the selected tags
        const hasSelectedTags = selectedTags.length > 0 && store.store_tags && store.store_tags.some(storeTag => 
          selectedTags.includes(storeTag.tag_id)
        )
        
        // Check if store has no limit tags (when "no maximum price" is selected)
        const hasNoLimitTags = noMaxPrice && (!store.store_tags || !store.store_tags.some(storeTag => 
          storeTag.tag && storeTag.tag.category === 'limits'
        ))
        
        // Return true if either condition is met
        return hasSelectedTags || hasNoLimitTags
      })
    }

    setFilteredStores(filtered)
  }, [stores, debouncedSearchQuery, selectedCountry, selectedState, selectedCity, selectedTags, noMaxPrice])

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  const handleLocationSelect = (location: Store | Library | Event, type: 'store' | 'library' | 'event') => {
    // This function is called when a map marker is clicked
    // The map will handle showing the popup automatically
  }

  const handleCardClick = (store: Store) => {
    // When a card is clicked, select it on the map
    if ((window as any).selectMapLocation) {
      (window as any).selectMapLocation(store, 'store')
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    clearLocationFilters()
    setSelectedTags([])
    setNoMaxPrice(false)
  }

  // Track map height for list view min-height
  useEffect(() => {
    if (!mapCardRef.current) return
    
    let timeoutId: NodeJS.Timeout | null = null
    
    const updateMapHeight = () => {
      if (mapCardRef.current) {
        const height = mapCardRef.current.offsetHeight
        setMapHeight(prev => {
          if (Math.abs(prev - height) < 2) return prev
          return height
        })
      }
    }
    
    const debouncedUpdate = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(updateMapHeight, 100)
    }
    
    const initialTimeout = setTimeout(updateMapHeight, 200)
    
    window.addEventListener('resize', debouncedUpdate)
    
    const resizeObserver = new ResizeObserver(() => {
      debouncedUpdate()
    })
    
    resizeObserver.observe(mapCardRef.current)
    
    return () => {
      clearTimeout(initialTimeout)
      if (timeoutId) clearTimeout(timeoutId)
      window.removeEventListener('resize', debouncedUpdate)
      resizeObserver.disconnect()
    }
  }, [loading])

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500 text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 bg-stone-50 font-serif min-h-0">
      {/* Header */}
      <header className="w-full bg-white border-b border-stone-200 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h3 className="font-gloria text-4xl md:text-5xl font-bold text-stone-800 mb-2 tracking-tight">Shops</h3>
          <div className="flex justify-center items-center mb-3">
            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-rose-400 to-transparent"></div>
            <div className="mx-3 text-rose-500">
              <MapPin className="h-6 w-6" />
            </div>
            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-rose-400 to-transparent"></div>
          </div>
          <p className="text-lg md:text-xl text-stone-600 italic font-gloria">Discover shops that carry zines worldwide</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-7xl mx-auto px-4 pt-6 w-full min-h-0">
        {/* Mobile Filter Toggle */}
        <div className="lg:hidden mb-4">
          <Button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            variant="outline"
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </span>
            {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          {/* Filters Column - Hidden on mobile unless open */}
          <div className={`w-full lg:w-64 flex-shrink-0 ${isFiltersOpen ? 'block' : 'hidden lg:block'}`}>
            <Card className="bg-white border-stone-200 shadow-sm rounded-lg sticky top-6 h-fit lg:h-full lg:max-h-[800px] lg:min-h-[600px] xl:max-h-[calc(100vh-300px)] lg:mb-6 flex flex-col">
              <CardContent className="space-y-6 pt-6 flex-1 flex flex-col min-h-0">
                {/* Search */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 h-4 w-4" />
                    <Input
                      placeholder="Search shops..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-stone-50 border-stone-300 focus:border-rose-300 focus:ring-rose-200"
                    />
                  </div>
                </div>

                {/* Location Filters */}
                <div className="space-y-4">
                  
                  <div className="space-y-2">
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger className="bg-stone-50 border-stone-300">
                        <SelectValue placeholder="All countries" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All countries</SelectItem>
                        {countries.map(country => (
                          <SelectItem key={country} value={country}>{country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Select value={selectedState} onValueChange={setSelectedState} disabled={selectedCountry === "all"}>
                      <SelectTrigger className="bg-stone-50 border-stone-300">
                        <SelectValue placeholder="All states/regions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All states/regions</SelectItem>
                        {states.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Select value={selectedCity} onValueChange={setSelectedCity} disabled={selectedCountry === "all"}>
                      <SelectTrigger className="bg-stone-50 border-stone-300">
                        <SelectValue placeholder="All cities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All cities</SelectItem>
                        {cities.map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tag Filters */}
                <div className="space-y-4 flex-1 flex flex-col min-h-0">
                  <h3 className="text-sm font-medium text-stone-700">Stocking Terms</h3>
                  <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
                    {/* No Maximum Price Checkbox */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="no-max-price"
                        checked={noMaxPrice}
                        onCheckedChange={(checked) => setNoMaxPrice(checked as boolean)}
                      />
                      <label
                        htmlFor="no-max-price"
                        className="text-sm text-stone-700 cursor-pointer"
                      >
                        No maximum price set
                      </label>
                    </div>
                    
                    {allTags.map(tag => (
                      <div key={tag.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-${tag.id}`}
                          checked={selectedTags.includes(tag.id)}
                          onCheckedChange={() => handleTagToggle(tag.id)}
                        />
                        <label
                          htmlFor={`tag-${tag.id}`}
                          className="text-sm text-stone-700 cursor-pointer"
                        >
                          {tag.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="w-full border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Map and List - Mobile: Map first, then List */}
          <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 lg:grid-rows-1 gap-6 min-h-0 overflow-hidden lg:items-stretch" style={{ maxHeight: '100%' }}>
            {/* Map View - Mobile: First */}
            <div className="order-1 lg:order-2 lg:sticky lg:top-6 h-fit lg:h-auto lg:flex lg:flex-col">
              <Card ref={mapCardRef} className="bg-white border-stone-200 shadow-sm rounded-lg overflow-hidden">
                <CardContent className="p-0">
                  {loading ? (
                    <div className="w-full h-96 lg:h-full bg-stone-100 animate-pulse flex items-center justify-center">
                      <div className="text-stone-500">Loading map...</div>
                    </div>
                  ) : (
                    <div className="w-full h-96 lg:h-full">
                      <StoreMap 
                        stores={stores}
                        libraries={[]}
                        events={[]}
                        searchQuery={debouncedSearchQuery}
                        hideFilterBar={true}
                        onLocationSelect={handleLocationSelect}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add Store button under the map */}
              <div className="mt-6 flex justify-center">
                <Link href="/add-store">
                  <Button className="bg-rose-500 hover:bg-rose-600 text-white font-gloria px-8 py-4 text-lg rounded-lg shadow-md transition-colors">
                    Add a shop
                  </Button>
                </Link>
              </div>
            </div>

            {/* List View - Mobile: Second */}
            <div className="flex flex-col space-y-4 order-2 lg:order-1 flex-1 min-h-0 lg:h-full overflow-hidden mb-8">
              <div className="flex items-center justify-between flex-shrink-0">
                <h2 className="text-xl font-semibold text-stone-800">
                  Shops ({filteredStores.length})
                </h2>
              </div>
              
              <div 
                className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-2 pt-[5px] pb-8 lg:min-h-[900px]"
                style={{
                  maxHeight: mapHeight > 0 
                    ? `max(${mapHeight}px, calc(100vh - 350px))`
                    : 'calc(100vh - 350px)'
                }}
              >
                {filteredStores.length === 0 ? (
                  <Card className="bg-white border-stone-200 shadow-sm rounded-lg">
                    <CardContent className="p-6 text-center">
                      <MapPin className="h-12 w-12 mx-auto mb-4 text-stone-400" />
                      <h3 className="text-lg font-semibold text-stone-800 mb-2">
                        {stores.length === 0 ? "No shops yet" : "No shops match your filters"}
                        </h3>
                        <p className="text-stone-600 mb-4">
                          {stores.length === 0 
                            ? "Be the first to add a zine-friendly shop to the map!"
                            : "Try adjusting your search or filter criteria."
                          }
                        </p>
                        {stores.length === 0 ? (
                          <Link href="/add-store">
                            <Button className="bg-rose-500 hover:bg-rose-600 text-white font-gloria">
                              Add first shop
                          </Button>
                        </Link>
                      ) : (
                        <Button 
                          onClick={clearFilters}
                          variant="outline"
                          className="border-stone-300 text-stone-700 hover:bg-stone-50"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  filteredStores.map((store) => (
                    <Card
                      key={store.id}
                      className="bg-white border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg cursor-pointer"
                      onClick={() => handleCardClick(store)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg font-semibold text-stone-800 mb-1">
                              <Link 
                                href={`/store/${store.permalink || store.id}`}
                                className="hover:text-rose-600 transition-colors"
                              >
                                {store.name}
                              </Link>
                            </CardTitle>
                            <div className="flex items-center text-stone-600 text-sm mb-2">
                              <MapPin className="h-4 w-4 mr-1" />
                              {store.city}{store.state && `, ${store.state}`}, {store.country}
                            </div>
                          </div>
                        </div>
                        
                        {/* Store Tags */}
                        {store.store_tags && store.store_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {store.store_tags.map((storeTag, index) => (
                              <Badge
                                key={storeTag.id || `store-tag-${store.id}-${index}`}
                                variant="outline"
                                className="text-xs bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                              >
                                {storeTag.tag.label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardHeader>

                      <CardContent className="pt-0">
                        <p className="text-stone-600 text-sm mb-4 leading-relaxed line-clamp-3">
                          {store.notes ? formatSocialMedia(store.notes, '#e11d48', '#be123c') : store.notes}
                        </p>
                        {(store.user_name || store.last_edit_user_name || store.created_at) && (
                          <div className="text-xs text-stone-500 mb-3">
                            {store.user_name && (
                              <>
                                Added by{' '}
                                {store.user_permalink ? (
                                  <Link 
                                    href={`/profile/${store.user_permalink}`}
                                    className="text-stone-800 hover:underline transition-colors"
                                  >
                                    {store.user_name}
                                  </Link>
                                ) : (
                                  store.user_name
                                )}
                                {store.created_at && <RelativeDateWithTooltip dateString={store.created_at} prefix=" · " />}
                              </>
                            )}
                            {store.user_name && store.last_edit_user_name && ' · '}
                            {store.last_edit_user_name && (
                              <>
                                Last edit by{' '}
                                {store.last_edit_user_permalink ? (
                                  <Link 
                                    href={`/profile/${store.last_edit_user_permalink}`}
                                    className="text-stone-800 hover:underline transition-colors"
                                  >
                                    {store.last_edit_user_name}
                                  </Link>
                                ) : (
                                  store.last_edit_user_name
                                )}
                                {store.updated_at && store.updated_at !== store.created_at && (
                                  <RelativeDateWithTooltip dateString={store.updated_at} prefix=" · " />
                                )}
                              </>
                            )}
                            {!store.user_name && store.created_at && (
                              <RelativeDateWithTooltip dateString={store.created_at} />
                            )}
                          </div>
                        )}
                        <Link href={`/store/${store.permalink || store.id}`} target="_blank" rel="noopener noreferrer">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-stone-300 text-stone-700 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition-colors bg-transparent"
                          >
                            View Details
                            <ExternalLink className="h-3 w-3 ml-2" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
