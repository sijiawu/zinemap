"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, BookOpen, User, Calendar, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Zine, UserProfile, Store, Batch } from "@/lib/types"
import { autoLinkText } from "@/lib/utils"
import ZineMap from "@/components/zine-map"

interface ZineWithAuthor extends Zine {
  profiles: UserProfile
}

interface ZineWithBatches extends ZineWithAuthor {
  batches: (Batch & { stores: Store })[]
}


export default function PublicZinePage() {
  const params = useParams()
  const [zine, setZine] = useState<ZineWithBatches | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchZineData(params.id as string)
    }
  }, [params.id])

  const fetchZineData = async (permalink: string) => {
    try {
      setLoading(true)
      setError(null)

      // Fetch zine with author information
      const { data: zineData, error: zineError } = await supabase
        .from('zines')
        .select('*')
        .eq('permalink', permalink)
        .eq('is_public', true)
        .single()

      if (zineError) {
        if (zineError.code === 'PGRST116') {
          setError('Zine not found')
        } else {
          console.error('Error fetching zine:', zineError)
          setError('Failed to load zine')
        }
        return
      }

      // Fetch author profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, profile_image, permalink')
        .eq('id', zineData.user_id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        setError('Failed to load author information')
        return
      }

      // Fetch batches
      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select('*')
        .eq('zine_id', zineData.id)
        .order('date_placed', { ascending: false })

      if (batchesError) {
        console.error('Error fetching batches:', batchesError)
      }

      // Fetch stores for the batches
      let storesData: any[] = []
      if (batchesData && batchesData.length > 0) {
        const storeIds = [...new Set(batchesData.map(batch => batch.store_id).filter(Boolean))]
        if (storeIds.length > 0) {
          const { data: stores, error: storesError } = await supabase
        .from('stores')
            .select('id, name, address, city, state, country, website, email, latitude, longitude')
            .in('id', storeIds)

      if (storesError) {
        console.error('Error fetching stores:', storesError)
          } else {
            storesData = stores || []
          }
        }
      }

      const zineWithAuthor = {
        ...zineData,
        profiles: profileData
      }

      // Join batches with stores
      const batchesWithStores = (batchesData || []).map(batch => ({
        ...batch,
        stores: storesData.find(store => store.id === batch.store_id) || null
      })).filter(batch => batch.stores) // Only include batches with valid stores

      setZine({
        ...zineWithAuthor,
        batches: batchesWithStores
      })
    } catch (err) {
      console.error('Error fetching zine data:', err)
      setError('Failed to load zine data')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatPrice = (price: number | null) => {
    if (!price) return 'Price not set'
    return `$${price.toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
        <div className="text-stone-500 text-lg">Loading...</div>
      </div>
    )
  }

  if (error || !zine) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
          <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-800 mb-4">Zine Not Found</h1>
          <p className="text-stone-600 mb-6">{error || 'This zine could not be found.'}</p>
          <Link href="/zines">
            <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Zines
              </Button>
            </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 font-serif">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/zines">
            <Button variant="ghost" className="text-stone-600 hover:text-stone-800">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Zines
            </Button>
          </Link>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Zine Cover and Basic Info */}
          <div className="space-y-6">
            {/* Cover Image */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-[3/4] bg-stone-100 flex items-center justify-center">
                  {zine.cover_image ? (
                    <img
                      src={zine.cover_image}
                alt={`${zine.title} cover`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="h-24 w-24 text-stone-400" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Author Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About the Author</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Link 
                    href={`/profile/${zine.profiles.permalink || zine.profiles.id}`}
                    className="w-12 h-12 rounded-full bg-stone-200 overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-purple-200 transition-all"
                  >
                    {zine.profiles.profile_image ? (
                      <img
                        src={zine.profiles.profile_image}
                        alt={zine.profiles.display_name || 'Author'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="h-6 w-6 text-stone-500" />
                </div>
                    )}
                  </Link>
                  <div>
                    <Link 
                      href={`/profile/${zine.profiles.permalink || zine.profiles.id}`}
                      className="text-lg font-semibold text-stone-800 hover:text-purple-600 transition-colors"
                    >
                      {zine.profiles.display_name || 'Unknown Author'}
                    </Link>
                    <p className="text-sm text-stone-600">Author</p>
                </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Zine Details */}
          <div className="space-y-6">
            {/* Title and Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{zine.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {zine.description && (
                  <div>
                    <h3 className="font-semibold text-stone-800 mb-2">Description</h3>
                    <p className="text-stone-600 whitespace-pre-wrap">{autoLinkText(zine.description)}</p>
        </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
                    <span className="font-semibold text-stone-800">Price:</span>
                    <p className="text-stone-600">{formatPrice(zine.retail_price)}</p>
          </div>
                  <div>
                    <span className="font-semibold text-stone-800">Added:</span>
                    <p className="text-stone-600">{formatDate(zine.created_at)}</p>
              </div>
                </div>
              </CardContent>
            </Card>

            {/* Where to Find This Zine - Map */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Where to Find This Zine
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {zine.batches.length > 0 ? (
                  <div className="h-96">
                    <ZineMap
                      stores={zine.batches.map(batch => ({
                        ...batch.stores,
                        zine_cover: zine.cover_image,
                        zine_title: zine.title,
                        copies_placed: batch.copies_placed,
                        price_per_copy: batch.price_per_copy
                      }))}
                    />
            </div>
          ) : (
                  <div className="text-center py-8 text-stone-500">
                    <MapPin className="h-12 w-12 mx-auto mb-3 text-stone-300" />
                    <p>This zine is not currently available in any stores.</p>
                    <p className="text-sm mt-1">Check back later or contact the author directly.</p>
            </div>
          )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
