"use client"

import { useEffect, useState } from "react"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, X, Store, MapPin, Clock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"

interface Store {
  id: string
  name: string
  city: string
  country: string
  address: string
  email?: string
  website?: string
  notes?: string
  has_stocked_before: boolean
  submitted_by: string
  created_at: string
  permalink?: string
  latitude?: number
  longitude?: number
  approved: boolean
}

export default function AdminPage() {
  const { user, loading } = useSupabaseUser()
  const router = useRouter()
  const [unapprovedStores, setUnapprovedStores] = useState<Store[]>([])
  const [loadingStores, setLoadingStores] = useState(true)
  const [processingStore, setProcessingStore] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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

  const handleApprove = async (storeId: string) => {
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
      setError('Failed to approve store')
    } finally {
      setProcessingStore(null)
    }
  }

  const handleReject = async (storeId: string) => {
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
      setError('Failed to reject store')
    } finally {
      setProcessingStore(null)
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
          <h1 className="text-2xl font-bold text-stone-800 mb-4">Access Denied</h1>
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
              <h1 className="text-2xl font-bold text-stone-800">Admin Panel</h1>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Admin
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
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

        {/* Stats */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-stone-800 mb-2">Store Approval Queue</h2>
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
        </div>

        {/* Store List */}
        {loadingStores ? (
          <div className="text-center py-12">
            <div className="text-stone-500 text-lg">Loading unapproved stores...</div>
          </div>
        ) : unapprovedStores.length === 0 ? (
          <Card className="bg-white border-stone-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <Store className="h-16 w-16 mx-auto mb-4 text-stone-400" />
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
                        onClick={() => handleApprove(store.id)}
                        disabled={processingStore === store.id}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {processingStore === store.id ? 'Approving...' : 'Approve'}
                      </Button>
                      <Button
                        onClick={() => handleReject(store.id)}
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
      </div>
    </div>
  )
} 