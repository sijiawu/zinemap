"use client"

import { BookOpen, Package, Plus, LogOut, Eye, MoreHorizontal, Search, MapPin, TrendingUp, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"
import { useZineData } from "@/hooks/useZineData"
import { useState } from "react"
import AddZineModal from "@/components/AddZineModal"

export default function DashboardPage() {
  const { user, loading: userLoading } = useSupabaseUser()
  const { zines, profile, stats, loading: dataLoading, error } = useZineData(user)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddZineModal, setShowAddZineModal] = useState(false)

  const loading = userLoading || dataLoading

  // Filter zines based on search term
  const filteredZines = zines.filter(zine =>
    zine.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (zine.description && zine.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Calculate zine-specific stats
  const getZineStats = (zine: any) => {
    const activeBatches = zine.batches?.filter((b: any) => b.status === 'active') || []
    const totalCopiesOut = activeBatches.reduce((sum: number, b: any) => sum + b.copies_placed, 0)
    const totalCopiesSold = activeBatches.reduce((sum: number, b: any) => sum + (b.copies_sold || 0), 0)
    const revenue = activeBatches.reduce((sum: number, b: any) => {
      if (b.copies_sold && b.price_per_copy) {
        return sum + (b.copies_sold * b.price_per_copy)
      }
      return sum
    }, 0)
    
    return { activeBatches: activeBatches.length, totalCopiesOut, totalCopiesSold, revenue }
  }

  // Get unique stores for a zine
  const getZineStores = (zine: any): string[] => {
    // Extract unique store names from batches
    const storeNames = zine.batches?.map((batch: any) => batch.store_name).filter((name: any) => name && typeof name === 'string') || []
    return [...new Set(storeNames)] as string[] // Remove duplicates
  }

  // Get zine status
  const getZineStatus = (zine: any) => {
    const activeBatches = zine.batches?.filter((b: any) => b.status === 'active') || []
    if (activeBatches.length === 0) return 'inactive'
    if (activeBatches.length <= 2) return 'low-stock'
    return 'active'
  }

  const handleZineCreated = () => {
    // Refresh the zine data
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif">
        <div className="flex-1 p-4 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="animate-pulse">
              <div className="bg-gradient-to-r from-rose-50 to-orange-50 rounded-xl p-6 lg:p-8 border border-rose-100">
                <div className="h-8 bg-stone-200 rounded mb-4"></div>
                <div className="h-4 bg-stone-200 rounded w-2/3"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white border border-stone-200 rounded-lg p-6">
                    <div className="h-8 bg-stone-200 rounded mb-2"></div>
                    <div className="h-4 bg-stone-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-stone-800 mb-4">Please log in to view your dashboard</h2>
          <Link href="/login">
            <Button className="bg-rose-500 hover:bg-rose-600 text-white">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 font-serif">
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-rose-50 to-orange-50 rounded-xl p-6 lg:p-8 border border-rose-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-stone-800 mb-2">
                  Welcome back, {profile?.display_name || user.email?.split('@')[0] || 'Zinester'}
                </h2>
                <p className="text-stone-600 mb-4">
                  You have {stats.totalZines} zines with {stats.activeBatches} active batches
                </p>
                <p className="text-sm text-stone-500">
                  {stats.totalZines === 0 ? 'Ready to start tracking your zines?' : 'Keep up the great work!'}
                </p>
              </div>
              <Button 
                className="bg-rose-500 hover:bg-rose-600 text-white shadow-sm"
                onClick={() => setShowAddZineModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Zine
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white border border-stone-200 shadow-sm">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-stone-800 mb-1">{stats.activeBatches}</div>
                <div className="text-sm text-stone-600">Active Batches</div>
              </CardContent>
            </Card>
            <Card className="bg-white border border-stone-200 shadow-sm">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-stone-800 mb-1">{stats.totalCopiesOut}</div>
                <div className="text-sm text-stone-600">Copies Out</div>
              </CardContent>
            </Card>
            <Card className="bg-white border border-stone-200 shadow-sm">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-stone-800 mb-1">{stats.totalCopiesSold}</div>
                <div className="text-sm text-stone-600">Copies Sold</div>
              </CardContent>
            </Card>
            <Card className="bg-white border border-stone-200 shadow-sm">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-stone-800 mb-1">${stats.totalRevenue.toFixed(2)}</div>
                <div className="text-sm text-stone-600">Total Revenue</div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 h-4 w-4" />
              <Input
                placeholder="Search your zines..."
                className="pl-10 bg-white border-stone-300 focus:border-rose-300 focus:ring-rose-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Zines Grid */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-stone-800">Your Zines</h3>
              <span className="text-sm text-stone-500">{filteredZines.length} total</span>
            </div>

            {error && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span>Error loading zine data: {error}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {filteredZines.length === 0 && !error && (
              <div className="text-center py-12">
                <div className="bg-white rounded-xl p-8 border border-stone-200 shadow-sm max-w-md mx-auto">
                  <BookOpen className="h-12 w-12 text-stone-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-stone-800 mb-2">No zines yet</h3>
                  <p className="text-stone-600 mb-6">
                    {searchTerm ? 'No zines match your search.' : 'Start tracking your zines and batches to see them here.'}
                  </p>
                  {!searchTerm && (
                    <Button 
                      className="bg-rose-500 hover:bg-rose-600 text-white"
                      onClick={() => setShowAddZineModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Zine
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredZines.map((zine) => {
                const zineStats = getZineStats(zine)
                const stores = getZineStores(zine)
                const status = getZineStatus(zine)
                const lastUpdate = zine.batches?.[0]?.last_checkin || zine.created_at

                return (
                  <Card
                    key={zine.id}
                    className="bg-white border border-stone-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex gap-4">
                            {/* Cover Image Thumbnail */}
                            <div className="relative w-16 h-20 bg-stone-100 rounded border border-stone-200 flex-shrink-0">
                              {zine.cover_image ? (
                                <>
                                  <img
                                    src={zine.cover_image}
                                    alt={`Cover for ${zine.title}`}
                                    className="w-full h-full object-cover rounded"
                                    onError={(e) => {
                                      // Fallback to placeholder if image fails to load
                                      e.currentTarget.style.display = 'none'
                                      e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                    }}
                                  />
                                  <div className="hidden absolute inset-0 flex items-center justify-center">
                                    <BookOpen className="h-6 w-6 text-stone-400" />
                                  </div>
                                </>
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <BookOpen className="h-6 w-6 text-stone-400" />
                                </div>
                              )}
                            </div>
                            
                            {/* Title and Description */}
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg font-semibold text-stone-800 mb-2 line-clamp-2">
                                {zine.title}
                              </CardTitle>
                              <p className="text-sm text-stone-600 line-clamp-2 mb-3">
                                {zine.description || 'No description provided'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit zine</DropdownMenuItem>
                            <DropdownMenuItem>Add batch</DropdownMenuItem>
                            <DropdownMenuItem>View analytics</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Archive</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={status === "active" ? "default" : "secondary"}
                          className={
                            status === "active"
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                              : status === "low-stock"
                              ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                          }
                        >
                          {status === "active" ? "Active" : status === "low-stock" ? "Low Stock" : "Inactive"}
                        </Badge>
                        <span className="text-xs text-stone-500">
                          Updated {new Date(lastUpdate).toLocaleDateString()}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Key metrics */}
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div className="text-center bg-rose-50 p-2 rounded border border-rose-100">
                            <div className="font-semibold text-stone-800">{zineStats.activeBatches}</div>
                            <div className="text-stone-600 text-xs">Batches</div>
                          </div>
                          <div className="text-center bg-blue-50 p-2 rounded border border-blue-100">
                            <div className="font-semibold text-stone-800">
                              {zineStats.totalCopiesSold}/{zineStats.totalCopiesOut}
                            </div>
                            <div className="text-stone-600 text-xs">Sold</div>
                          </div>
                          <div className="text-center bg-green-50 p-2 rounded border border-green-100">
                            <div className="font-semibold text-stone-800">${zineStats.revenue.toFixed(2)}</div>
                            <div className="text-stone-600 text-xs">Revenue</div>
                          </div>
                        </div>

                        {/* Store list */}
                        <div>
                          <div className="text-xs text-stone-600 mb-2 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            Stocked at {stores.length} stores
                          </div>
                          {stores.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {stores.slice(0, 3).map((store, index) => (
                                <span key={`${store}-${index}`} className="text-xs bg-stone-100 text-stone-700 px-2 py-1 rounded">
                                  {store}
                                </span>
                              ))}
                              {stores.length > 3 && (
                                <span className="text-xs bg-stone-100 text-stone-700 px-2 py-1 rounded">
                                  +{stores.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Progress bar */}
                        {zineStats.totalCopiesOut > 0 && (
                          <div className="space-y-1">
                            <div className="w-full bg-stone-200 rounded-full h-2">
                              <div
                                className="bg-rose-400 h-2 rounded-full transition-all"
                                style={{ width: `${(zineStats.totalCopiesSold / zineStats.totalCopiesOut) * 100}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-stone-500 text-center">
                              {Math.round((zineStats.totalCopiesSold / zineStats.totalCopiesOut) * 100)}% sold
                            </div>
                          </div>
                        )}

                        <Link href={`/zine/${zine.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-stone-300 text-stone-700 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition-colors bg-transparent"
                          >
                            <Eye className="h-3 w-3 mr-2" />
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Zine Modal */}
      <AddZineModal
        user={user}
        show={showAddZineModal}
        onClose={() => setShowAddZineModal(false)}
        onSuccess={handleZineCreated}
      />
    </div>
  )
}
