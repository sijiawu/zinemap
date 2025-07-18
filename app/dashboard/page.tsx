import { BookOpen, Package, Plus, LogOut, Eye, MoreHorizontal, Search, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"

// Sample user data
const userData = {
  name: "Alex Chen",
  totalZines: 8,
  activeBatches: 23,
  totalStores: 12,
  recentActivity: "Last updated 3 days ago",
}

// Sample zine data with batch-based metrics
const zines = [
  {
    id: 1,
    title: "Urban Sketches Vol. 3",
    description: "Hand-drawn illustrations of city life and architecture",
    activeBatches: 5,
    totalCopiesOut: 67,
    copiesSold: 34,
    revenue: 238.5,
    stores: ["Quimby's", "Desert Island", "Powell's", "The Bindery", "Atomic Books"],
    status: "active",
    lastUpdate: "2024-03-10",
  },
  {
    id: 2,
    title: "Midnight Thoughts",
    description: "Poetry and prose about insomnia and late-night reflections",
    activeBatches: 3,
    totalCopiesOut: 30,
    copiesSold: 18,
    revenue: 126.0,
    stores: ["Local Bookstore", "Coffee Shop", "Art Gallery"],
    status: "active",
    lastUpdate: "2024-03-08",
  },
  {
    id: 3,
    title: "DIY Electronics Guide",
    description: "Beginner-friendly circuits and soldering tutorials",
    activeBatches: 7,
    totalCopiesOut: 85,
    copiesSold: 51,
    revenue: 357.0,
    stores: [
      "Tech Shop",
      "Maker Space",
      "University Store",
      "Electronics Store",
      "Hobby Shop",
      "Library",
      "Community Center",
    ],
    status: "active",
    lastUpdate: "2024-03-12",
  },
  {
    id: 4,
    title: "Local Food Stories",
    description: "Interviews with neighborhood restaurant owners",
    activeBatches: 2,
    totalCopiesOut: 20,
    copiesSold: 8,
    revenue: 48.0,
    stores: ["Food Co-op", "Restaurant"],
    status: "low-stock",
    lastUpdate: "2024-02-28",
  },
  {
    id: 5,
    title: "Queer History Zine",
    description: "Untold stories from LGBTQ+ community archives",
    activeBatches: 4,
    totalCopiesOut: 45,
    copiesSold: 32,
    revenue: 224.0,
    stores: ["Pride Center", "Independent Bookstore", "Community Library", "University"],
    status: "active",
    lastUpdate: "2024-03-09",
  },
  {
    id: 6,
    title: "Garden Punk",
    description: "Radical gardening tips for urban spaces",
    activeBatches: 6,
    totalCopiesOut: 52,
    copiesSold: 19,
    revenue: 133.0,
    stores: ["Garden Center", "Farmers Market", "Co-op", "Bookstore", "Community Garden", "Seed Library"],
    status: "active",
    lastUpdate: "2024-03-11",
  },
]

export default function DashboardPage() {
  const totalRevenue = zines.reduce((sum, zine) => sum + zine.revenue, 0)
  const totalCopiesOut = zines.reduce((sum, zine) => sum + zine.totalCopiesOut, 0)
  const totalCopiesSold = zines.reduce((sum, zine) => sum + zine.copiesSold, 0)

  return (
    <div className="min-h-screen bg-stone-50 font-serif">
      {/* Remove mobile nav and sidebar, just use top nav */}
      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-rose-50 to-orange-50 rounded-xl p-6 lg:p-8 border border-rose-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-stone-800 mb-2">Welcome back, {userData.name}</h2>
                <p className="text-stone-600 mb-4">
                  You have {userData.totalZines} zines with {userData.activeBatches} active batches across{" "}
                  {userData.totalStores} stores
                </p>
                <p className="text-sm text-stone-500">{userData.recentActivity}</p>
              </div>
              <Button className="bg-rose-500 hover:bg-rose-600 text-white shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Add New Zine
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white border border-stone-200 shadow-sm">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-stone-800 mb-1">{userData.activeBatches}</div>
                <div className="text-sm text-stone-600">Active Batches</div>
              </CardContent>
            </Card>
            <Card className="bg-white border border-stone-200 shadow-sm">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-stone-800 mb-1">{totalCopiesOut}</div>
                <div className="text-sm text-stone-600">Copies Out</div>
              </CardContent>
            </Card>
            <Card className="bg-white border border-stone-200 shadow-sm">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-stone-800 mb-1">{totalCopiesSold}</div>
                <div className="text-sm text-stone-600">Copies Sold</div>
              </CardContent>
            </Card>
            <Card className="bg-white border border-stone-200 shadow-sm">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-stone-800 mb-1">${totalRevenue.toFixed(2)}</div>
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
              />
            </div>
          </div>

          {/* Zines Grid */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-stone-800">Your Zines</h3>
              <span className="text-sm text-stone-500">{zines.length} total</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {zines.map((zine) => (
                <Card
                  key={zine.id}
                  className="bg-white border border-stone-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold text-stone-800 mb-2 line-clamp-2">
                          {zine.title}
                        </CardTitle>
                        <p className="text-sm text-stone-600 line-clamp-2 mb-3">{zine.description}</p>
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
                        variant={zine.status === "active" ? "default" : "secondary"}
                        className={
                          zine.status === "active"
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                        }
                      >
                        {zine.status === "active" ? "Active" : "Low Stock"}
                      </Badge>
                      <span className="text-xs text-stone-500">Updated {zine.lastUpdate}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Key metrics */}
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="text-center bg-rose-50 p-2 rounded border border-rose-100">
                          <div className="font-semibold text-stone-800">{zine.activeBatches}</div>
                          <div className="text-stone-600 text-xs">Batches</div>
                        </div>
                        <div className="text-center bg-blue-50 p-2 rounded border border-blue-100">
                          <div className="font-semibold text-stone-800">
                            {zine.copiesSold}/{zine.totalCopiesOut}
                          </div>
                          <div className="text-stone-600 text-xs">Sold</div>
                        </div>
                        <div className="text-center bg-green-50 p-2 rounded border border-green-100">
                          <div className="font-semibold text-stone-800">${zine.revenue}</div>
                          <div className="text-stone-600 text-xs">Revenue</div>
                        </div>
                      </div>

                      {/* Store list */}
                      <div>
                        <div className="text-xs text-stone-600 mb-2 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          Stocked at {zine.stores.length} stores
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {zine.stores.slice(0, 3).map((store) => (
                            <span key={store} className="text-xs bg-stone-100 text-stone-700 px-2 py-1 rounded">
                              {store}
                            </span>
                          ))}
                          {zine.stores.length > 3 && (
                            <span className="text-xs bg-stone-100 text-stone-700 px-2 py-1 rounded">
                              +{zine.stores.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="w-full bg-stone-200 rounded-full h-2">
                          <div
                            className="bg-rose-400 h-2 rounded-full transition-all"
                            style={{ width: `${(zine.copiesSold / zine.totalCopiesOut) * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-stone-500 text-center">
                          {Math.round((zine.copiesSold / zine.totalCopiesOut) * 100)}% sold
                        </div>
                      </div>

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
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
