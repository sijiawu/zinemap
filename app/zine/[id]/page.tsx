"use client"

import type React from "react"
import { useParams } from "next/navigation"

import {
  ArrowLeft,
  Plus,
  MapPin,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronUp,
  Calendar,
  Store,
  Save,
  DollarSign,
  X,
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import Link from "next/link"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useSupabaseUser } from "@/hooks/useSupabaseUser"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

function AddBatchForm({ zineId, retailPrice, onBatchAdded }: { zineId: string; retailPrice?: number; onBatchAdded: () => void }) {
  const { user } = useSupabaseUser()
  const [isOpen, setIsOpen] = useState(false)
  const [stores, setStores] = useState<any[]>([])
  const [userBatches, setUserBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    storeId: "",
    datePlaced: new Date().toISOString().split("T")[0],
    copiesPlaced: "",
    pricePerCopy: retailPrice ? retailPrice.toString() : "",
    splitPercentage: "60",
    paidUpfront: false,
    copiesSold: "",
    status: "active",
    nextCheckIn: "",
    notes: "",
  })

  // Fetch all stores from Supabase
  useEffect(() => {
    const fetchStores = async () => {
      if (!user) return
      
      try {
        // Fetch all stores from the stores table
        const { data: allStores, error: storesError } = await supabase
          .from('stores')
          .select('*')
          .order('name')
        
        if (storesError) {
          console.error('Error fetching stores:', storesError)
          return
        }

        // Fetch user's batches to see which stores they've used
        const { data: userBatchesData, error: batchesError } = await supabase
          .from('batches')
          .select('store_id')
          .eq('user_id', user.id)
        
        if (batchesError) {
          console.error('Error fetching user batches:', batchesError)
        }

        // Store user batches for display
        setUserBatches(userBatchesData || [])

        // Get unique store IDs that user has used
        const userStoreIds = new Set(userBatchesData?.map((batch: any) => batch.store_id) || [])
        
        // Sort stores: user's stores first, then alphabetically
        const sortedStores = (allStores || []).sort((a, b) => {
          const aIsUserStore = userStoreIds.has(a.id)
          const bIsUserStore = userStoreIds.has(b.id)
          
          if (aIsUserStore && !bIsUserStore) return -1
          if (!aIsUserStore && bIsUserStore) return 1
          return a.name.localeCompare(b.name)
        })

        setStores(sortedStores || [])
      } catch (err) {
        console.error('Error fetching stores:', err)
      }
    }

    fetchStores()
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !formData.storeId) {
      alert('Please select a store')
      return
    }
    
    if (!formData.copiesPlaced || !formData.pricePerCopy || !formData.splitPercentage) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const selectedStore = stores.find((store) => store.id === formData.storeId)
      
      const batchData = {
        zine_id: zineId,
        store_id: formData.storeId,
        store_name: selectedStore?.name || '',
        user_id: user.id,
        date_placed: formData.datePlaced,
        copies_placed: parseInt(formData.copiesPlaced),
        price_per_copy: parseFloat(formData.pricePerCopy),
        split_percent: parseInt(formData.splitPercentage),
        paid_upfront: formData.paidUpfront,
        paid: formData.paidUpfront, // Auto-set paid to true for upfront payments
        copies_sold: formData.paidUpfront ? parseInt(formData.copiesPlaced) : (formData.copiesSold ? parseInt(formData.copiesSold) : null),
        status: formData.status,
        next_checkin: formData.nextCheckIn || null,
        notes: formData.notes || null,
      }

      // First verify the zine belongs to the user
      const { data: zineCheck, error: zineError } = await supabase
        .from('zines')
        .select('id')
        .eq('id', zineId)
        .eq('user_id', user.id)
        .single()
      
      if (zineError || !zineCheck) {
        console.error('Zine ownership verification failed:', zineError)
        alert('You can only add batches to your own zines.')
        return
      }
      
      const { error } = await supabase
        .from('batches')
        .insert(batchData)

      if (error) {
        console.error('Error saving batch:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        alert(`Failed to save batch: ${error.message}`)
      } else {
        // Reset form and close
        setFormData({
          storeId: "",
          datePlaced: new Date().toISOString().split("T")[0],
          copiesPlaced: "",
          pricePerCopy: retailPrice ? retailPrice.toString() : "",
          splitPercentage: "60",
          paidUpfront: false,
          copiesSold: "",
          status: "active",
          nextCheckIn: "",
          notes: "",
        })
        setIsOpen(false)
        onBatchAdded() // Refresh the batches list
      }
    } catch (err) {
      console.error('Error saving batch:', err)
      alert('Failed to save batch. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const selectedStore = stores.find((store) => store.id === formData.storeId)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button className="w-full bg-rose-500 hover:bg-rose-600 text-white shadow-sm mb-6 font-serif" size="lg">
          {isOpen ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Cancel Adding Batch
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add New Batch
            </>
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <Card className="bg-gradient-to-br from-orange-50 to-rose-50 border-2 border-orange-200 shadow-lg mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-stone-800 text-xl font-serif">
              <Store className="h-5 w-5 mr-2 text-orange-500" />
              New Batch Drop-off
            </CardTitle>
            <p className="text-sm text-stone-600 font-mono">Record a new batch of zines placed at a store</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Store Selection */}
              <div className="space-y-2">
                <Label htmlFor="store" className="text-stone-700 font-serif font-medium">
                  Store *
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <Select
                      value={formData.storeId}
                      onValueChange={(value) => setFormData({ ...formData, storeId: value })}
                    >
                      <SelectTrigger className="bg-white border-stone-300 focus:border-orange-400 focus:ring-orange-200">
                        <SelectValue placeholder="Choose a store..." />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.length === 0 ? (
                          <div className="px-2 py-1 text-sm text-stone-500">
                            No stores found. Add your first store below.
                          </div>
                        ) : (
                          stores.map((store) => {
                            // Check if user has used this store before
                            const hasUsedStore = userBatches?.some(batch => batch.store_id === store.id)
                            return (
                              <SelectItem key={store.id} value={store.id}>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{store.name}</span>
                                    {hasUsedStore && (
                                      <span className="text-xs bg-green-100 text-green-700 px-1 rounded">
                                        Used
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-stone-500">{store.city}, {store.state}</span>
                                </div>
                              </SelectItem>
                            )
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Add Store Button */}
                  <div className="md:col-span-1">
                    <Link href="/add-store">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full h-10 border-stone-300 text-stone-700 hover:bg-stone-50 bg-transparent font-serif"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Don't see it here? Add it to ZineMap!
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Date and Copies Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="datePlaced" className="text-stone-700 font-serif font-medium">
                    Date Placed *
                  </Label>
                  <div className="relative">
                    <Input
                      id="datePlaced"
                      type="date"
                      value={formData.datePlaced}
                      onChange={(e) => setFormData({ ...formData, datePlaced: e.target.value })}
                      className="bg-white border-stone-300 focus:border-orange-400 focus:ring-orange-200 font-mono [&::-webkit-calendar-picker-indicator]:hidden"
                      required
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="copiesPlaced" className="text-stone-700 font-serif font-medium">
                    Copies Placed *
                  </Label>
                  <Input
                    id="copiesPlaced"
                    type="number"
                    min="1"
                    value={formData.copiesPlaced}
                    onChange={(e) => setFormData({ ...formData, copiesPlaced: e.target.value })}
                    className="bg-white border-stone-300 focus:border-orange-400 focus:ring-orange-200 font-mono"
                    placeholder="e.g. 15"
                    required
                  />
                </div>
              </div>

              {/* Price and Split Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pricePerCopy" className="text-stone-700 font-serif font-medium">
                    Price per Copy *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-500 font-mono">
                      $
                    </span>
                    <Input
                      id="pricePerCopy"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.pricePerCopy}
                      onChange={(e) => setFormData({ ...formData, pricePerCopy: e.target.value })}
                      className="bg-white border-stone-300 focus:border-orange-400 focus:ring-orange-200 font-mono pl-8"
                      placeholder="8.00"
                      required
                    />
                  </div>
                  {retailPrice && (
                    <p className="text-xs text-stone-500 font-mono">
                      Pre-filled from zine's retail price
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="splitPercentage" className="text-stone-700 font-serif font-medium">
                    Your Split % *
                  </Label>
                  <div className="relative">
                    <Input
                      id="splitPercentage"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.splitPercentage}
                      onChange={(e) => setFormData({ ...formData, splitPercentage: e.target.value })}
                      className="bg-white border-stone-300 focus:border-orange-400 focus:ring-orange-200 font-mono pr-8"
                      placeholder="60"
                      required
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-500 font-mono">
                      %
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 font-mono">
                    {formData.splitPercentage &&
                      `Split: ${formData.splitPercentage}/${100 - Number.parseInt(formData.splitPercentage || "0")}`}
                  </p>
                </div>
              </div>

              {/* Payment and Status Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-stone-700 font-serif font-medium">Payment Type</Label>
                  <div className="flex items-center space-x-4 bg-white p-3 rounded-lg border border-stone-300">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="paymentUpfront"
                        name="paymentType"
                        value="upfront"
                        checked={formData.paidUpfront === true}
                        onChange={() => setFormData({ ...formData, paidUpfront: true })}
                        className="text-orange-500 focus:ring-orange-400"
                      />
                      <Label htmlFor="paymentUpfront" className="text-sm text-stone-700 font-mono">
                        Upfront
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="paymentConsignment"
                        name="paymentType"
                        value="consignment"
                        checked={formData.paidUpfront === false}
                        onChange={() => setFormData({ ...formData, paidUpfront: false })}
                        className="text-orange-500 focus:ring-orange-400"
                      />
                      <Label htmlFor="paymentConsignment" className="text-sm text-stone-700 font-mono">
                        Consignment
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-stone-700 font-serif font-medium">
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="bg-white border-stone-300 focus:border-orange-400 focus:ring-orange-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="sold-out">Sold Out</SelectItem>
                      <SelectItem value="picked-up">Picked Up</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.paidUpfront && (
                    <p className="text-xs text-stone-500 font-mono">
                      For upfront payments, status can remain "Active" until store sells out
                    </p>
                  )}
                </div>
              </div>

              {/* Optional Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="copiesSold" className="text-stone-700 font-serif font-medium">
                    Copies Sold <span className="text-stone-500 font-mono text-xs">(optional)</span>
                  </Label>
                  <Input
                    id="copiesSold"
                    type="number"
                    min="0"
                    value={formData.paidUpfront ? formData.copiesPlaced : formData.copiesSold}
                    onChange={(e) => setFormData({ ...formData, copiesSold: e.target.value })}
                    className={`font-mono ${
                      formData.paidUpfront 
                        ? "bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed" 
                        : "bg-white border-stone-300 focus:border-orange-400 focus:ring-orange-200"
                    }`}
                    placeholder="0"
                    disabled={formData.paidUpfront}
                  />
                  {formData.paidUpfront && (
                    <p className="text-xs text-stone-500 font-mono">
                      Set to copies placed for upfront payment
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextCheckIn" className="text-stone-700 font-serif font-medium">
                    Next Check-in <span className="text-stone-500 font-mono text-xs">(optional)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="nextCheckIn"
                      type="date"
                      value={formData.nextCheckIn}
                      onChange={(e) => setFormData({ ...formData, nextCheckIn: e.target.value })}
                      className="bg-white border-stone-300 focus:border-orange-400 focus:ring-orange-200 font-mono"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-stone-700 font-serif font-medium">
                  Notes <span className="text-stone-500 font-mono text-xs">(optional)</span>
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="bg-white border-stone-300 focus:border-orange-400 focus:ring-orange-200 font-mono text-sm min-h-[80px]"
                  placeholder="Any special arrangements, store preferences, or notes about this batch..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-orange-200">
                <Button
                  type="submit"
                  disabled={loading || !formData.storeId || !formData.copiesPlaced || !formData.pricePerCopy}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white shadow-sm font-serif"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Save Batch
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="flex-1 border-stone-300 text-stone-700 hover:bg-stone-50 bg-transparent font-serif"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  )
}

function CompactEditableBatchCard({ batch, onSave, onDelete, getStoreDetails, formatStoreLocation, user }: { 
  batch: any;
  onSave: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
  getStoreDetails: (storeId: string) => any;
  formatStoreLocation: (store: any) => string;
  user: any;
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    date_placed: batch.date_placed || "",
    copies_placed: batch.copies_placed || 0,
    price_per_copy: batch.price_per_copy || 0,
    split_percent: batch.split_percent || 50,
    paid_upfront: batch.paid_upfront || false,
    status: batch.status || "active",
    copies_sold: batch.copies_sold || 0,
    paid: batch.paid || false,
    next_checkin: batch.next_checkin || "",
    last_update: batch.last_update || "",
    notes: batch.notes || "",
  })

  const handleChange = (field: string, value: any) => {
    const newData = { ...editData, [field]: value }
    
    // Handle upfront payment logic
    if (field === 'paid_upfront' && value === true) {
      newData.paid = true
      newData.copies_sold = newData.copies_placed
    }
    
    setEditData(newData)
  }

  const handleSave = () => {
    onSave(batch.id, {
      date_placed: editData.date_placed || null,
      copies_placed: parseInt(editData.copies_placed),
      price_per_copy: parseFloat(editData.price_per_copy),
      split_percent: parseInt(editData.split_percent),
      paid_upfront: editData.paid_upfront,
      status: editData.status,
      copies_sold: editData.paid_upfront ? parseInt(editData.copies_placed) : parseInt(editData.copies_sold),
      paid: editData.paid,
      next_checkin: editData.next_checkin || null,
      last_update: editData.last_update || null,
      notes: editData.notes || null,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditData({
      date_placed: batch.date_placed || "",
      copies_placed: batch.copies_placed || 0,
      price_per_copy: batch.price_per_copy || 0,
      split_percent: batch.split_percent || 50,
      paid_upfront: batch.paid_upfront || false,
      status: batch.status || "active",
      copies_sold: batch.copies_sold || 0,
      paid: batch.paid || false,
      next_checkin: batch.next_checkin || "",
      last_update: batch.last_update || "",
      notes: batch.notes || "",
    })
    setIsEditing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700 border-emerald-200"
      case "sold-out":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "picked-up":
        return "bg-slate-100 text-slate-700 border-slate-200"
      case "unknown":
        return "bg-amber-100 text-amber-700 border-amber-200"
      default:
        return "bg-stone-100 text-stone-700 border-stone-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-3 w-3" />
      case "sold-out":
        return <CheckCircle className="h-3 w-3" />
      case "picked-up":
        return <CheckCircle className="h-3 w-3" />
      case "unknown":
        return <AlertCircle className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  return (
    <Card className="bg-white border border-stone-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold text-stone-800 mb-1">
              {batch.store_name || `Store ID: ${batch.store_id}`}
            </CardTitle>
            <div className="flex items-center text-stone-600 text-sm">
              <MapPin className="h-3 w-3 mr-1" />
              {formatStoreLocation(getStoreDetails(batch.store_id))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {batch.paid_upfront && (
              <Badge className="bg-green-100 text-green-700 border-green-200 font-mono text-xs">
                <DollarSign className="h-3 w-3 mr-1" />
                Paid Upfront
              </Badge>
            )}
            <Badge className={`${getStatusColor(isEditing ? editData.status : batch.status)} font-mono text-xs`}>
              {getStatusIcon(isEditing ? editData.status : batch.status)}
              <span className="ml-1 capitalize">{(isEditing ? editData.status : batch.status).replace("-", " ")}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Read-only info - only show when not editing */}
        {!isEditing && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="bg-stone-50 p-2 rounded border border-stone-100">
              <div className="text-stone-500 mb-1 text-xs font-mono">Placed</div>
              <div className="font-semibold text-stone-800 font-mono">
                {new Date(batch.date_placed).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </div>
            <div className="bg-stone-50 p-2 rounded border border-stone-100">
              <div className="text-stone-500 mb-1 text-xs font-mono">Copies</div>
              <div className="font-semibold text-stone-800 font-mono">{batch.copies_placed}</div>
            </div>
            <div className="bg-stone-50 p-2 rounded border border-stone-100">
              <div className="text-stone-500 mb-1 text-xs font-mono">Price</div>
              <div className="font-semibold text-stone-800 font-mono">${batch.price_per_copy}</div>
            </div>
            <div className="bg-stone-50 p-2 rounded border border-stone-100">
              <div className="text-stone-500 mb-1 text-xs font-mono">Split</div>
              <div className="font-semibold text-stone-800 font-mono">{batch.split_percent}%</div>
            </div>
          </div>
        )}

        {/* Editable fields - comprehensive editing */}
        {isEditing ? (
          <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
            {/* Basic Info Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              {/* Date Placed */}
              <div>
                <Label className="text-stone-700 font-serif text-xs mb-1 block">Date Placed</Label>
                <Input
                  type="date"
                  value={editData.date_placed}
                  onChange={(e) => handleChange("date_placed", e.target.value)}
                  className="h-8 bg-white border-stone-300 font-mono text-xs"
                />
              </div>

              {/* Copies Placed */}
              <div>
                <Label className="text-stone-700 font-serif text-xs mb-1 block">Copies Placed</Label>
                <Input
                  type="number"
                  min="1"
                  value={editData.copies_placed}
                  onChange={(e) => handleChange("copies_placed", e.target.value)}
                  className="h-8 bg-white border-stone-300 font-mono text-xs"
                  placeholder="0"
                />
              </div>

              {/* Price per Copy */}
              <div>
                <Label className="text-stone-700 font-serif text-xs mb-1 block">Price per Copy</Label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-stone-500 font-mono text-xs">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editData.price_per_copy}
                    onChange={(e) => handleChange("price_per_copy", e.target.value)}
                    className="h-8 bg-white border-stone-300 font-mono text-xs pl-6"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Split Percentage */}
              <div>
                <Label className="text-stone-700 font-serif text-xs mb-1 block">Split %</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editData.split_percent}
                    onChange={(e) => handleChange("split_percent", e.target.value)}
                    className="h-8 bg-white border-stone-300 font-mono text-xs pr-6"
                    placeholder="60"
                  />
                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-stone-500 font-mono text-xs">%</span>
                </div>
              </div>
            </div>

            {/* Status and Sales Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              {/* Status */}
              <div>
                <Label className="text-stone-700 font-serif text-xs mb-1 block">Status</Label>
                <Select value={editData.status} onValueChange={(value) => handleChange("status", value)}>
                  <SelectTrigger className="h-8 bg-white border-stone-300 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="sold-out">Sold Out</SelectItem>
                    <SelectItem value="picked-up">Picked Up</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
                {editData.paid_upfront && (
                  <p className="text-xs text-stone-500 font-mono mt-1">
                    For upfront payments, status can remain "Active" until store sells out
                  </p>
                )}
              </div>

              {/* Copies Sold */}
              <div>
                <Label className="text-stone-700 font-serif text-xs mb-1 block">Copies Sold</Label>
                <Input
                  type="number"
                  min="0"
                  max={Number(editData.copies_placed) || batch.copies_placed}
                  value={editData.paid_upfront ? editData.copies_placed : editData.copies_sold}
                  onChange={(e) => handleChange("copies_sold", e.target.value)}
                  className={`font-mono text-xs h-8 ${
                    editData.paid_upfront 
                      ? "bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed" 
                      : "bg-white border-stone-300"
                  }`}
                  placeholder="0"
                  disabled={editData.paid_upfront}
                />
                {editData.paid_upfront && (
                  <p className="text-xs text-stone-500 font-mono mt-1">
                    Set to copies placed for upfront payment
                  </p>
                )}
              </div>

              {/* Payment Status */}
              <div>
                <Label className="text-stone-700 font-serif text-xs mb-1 block">Payment Received</Label>
                <div className="flex items-center h-8 bg-white px-2 rounded border border-stone-300">
                  <Checkbox
                    checked={editData.paid}
                    onCheckedChange={(checked) => handleChange("paid", checked)}
                    className="scale-75"
                  />
                  <span className="text-xs text-stone-700 font-mono ml-1">Paid</span>
                </div>
              </div>

              {/* Payment Type */}
              <div>
                <Label className="text-stone-700 font-serif text-xs mb-1 block">Payment Type</Label>
                <div className="flex items-center space-x-3 bg-white px-2 py-1 rounded border border-stone-300">
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id={`paymentUpfront-${batch.id}`}
                      name={`paymentType-${batch.id}`}
                      value="upfront"
                      checked={editData.paid_upfront === true}
                      onChange={() => handleChange("paid_upfront", true)}
                      className="text-orange-500 focus:ring-orange-400 scale-75"
                    />
                    <Label htmlFor={`paymentUpfront-${batch.id}`} className="text-xs text-stone-700 font-mono">
                      Upfront
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id={`paymentConsignment-${batch.id}`}
                      name={`paymentType-${batch.id}`}
                      value="consignment"
                      checked={editData.paid_upfront === false}
                      onChange={() => handleChange("paid_upfront", false)}
                      className="text-orange-500 focus:ring-orange-400 scale-75"
                    />
                    <Label htmlFor={`paymentConsignment-${batch.id}`} className="text-xs text-stone-700 font-mono">
                      Consignment
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Last Update and Next Check-in */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <Label className="text-stone-700 font-serif text-xs mb-1 block">Last Update</Label>
                <Input
                  type="date"
                  value={editData.last_update || ""}
                  onChange={(e) => handleChange("last_update", e.target.value)}
                  className="h-8 bg-white border-stone-300 font-mono text-xs [&::-webkit-calendar-picker-indicator]:hidden"
                />
              </div>
              <div>
                <Label className="text-stone-700 font-serif text-xs mb-1 block">Next Check-in</Label>
                <Input
                  type="date"
                  value={editData.next_checkin}
                  onChange={(e) => handleChange("next_checkin", e.target.value)}
                  className="h-8 bg-white border-stone-300 font-mono text-xs [&::-webkit-calendar-picker-indicator]:hidden"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-stone-700 font-serif text-xs mb-1 block">Notes</Label>
              <Textarea
                value={editData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                className="bg-white border-stone-300 font-mono text-xs min-h-[60px] resize-none"
                placeholder="Add notes about this batch..."
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} size="sm" className="bg-blue-500 hover:bg-blue-600 text-white font-serif">
                <Save className="h-3 w-3 mr-1" />
                Save Changes
              </Button>
              <Button
                onClick={handleCancel}
                size="sm"
                variant="outline"
                className="border-stone-300 text-stone-700 hover:bg-stone-50 font-serif bg-transparent"
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
              <Button
                onClick={() => onDelete(batch.id)}
                size="sm"
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 font-serif bg-transparent"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Current values display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-stone-500 text-xs font-mono">Sold: </span>
                <span className="font-semibold text-stone-800 font-mono">
                  {batch.paid_upfront ? "N/A (Paid Upfront)" : `${batch.copies_sold || 0}`}
                </span>
              </div>
              <div>
                <span className="text-stone-500 text-xs font-mono">Payment: </span>
                <span className={`font-semibold font-mono ${batch.paid ? "text-emerald-600" : "text-amber-600"}`}>
                  {batch.paid ? "Received" : "Pending"}
                </span>
              </div>
              <div>
                <span className="text-stone-500 text-xs font-mono">Next Check-in: </span>
                <span className="font-semibold text-stone-800 font-mono">
                  {batch.next_checkin
                    ? new Date(batch.next_checkin).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "Not set"}
                </span>
              </div>
              <div>
                <span className="text-stone-500 text-xs font-mono">Last Update: </span>
                <span className="font-semibold text-stone-800 font-mono">
                  {batch.last_update
                    ? new Date(batch.last_update).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "None"}
                </span>
              </div>
            </div>

            {/* Notes display */}
            {batch.notes && (
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <div className="text-xs text-stone-500 mb-1 font-mono">Notes:</div>
                <div className="text-sm text-stone-700 italic">"{batch.notes}"</div>
              </div>
            )}

            {/* Edit button */}
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setIsEditing(true)}
                size="sm"
                variant="outline"
                className="border-stone-300 text-stone-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 font-serif"
              >
                <Edit className="h-3 w-3 mr-1" />
                Update
              </Button>
              <Button
                onClick={() => onDelete(batch.id)}
                size="sm"
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 font-serif bg-transparent"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BatchCard({ batch, isArchived = false, getStoreDetails, formatStoreLocation, onDelete }: { 
  batch: any; 
  isArchived?: boolean;
  getStoreDetails: (storeId: string) => any;
  formatStoreLocation: (store: any) => string;
  onDelete: (id: string) => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700 border-emerald-200"
      case "sold-out":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "picked-up":
        return "bg-slate-100 text-slate-700 border-slate-200"
      case "unknown":
        return "bg-amber-100 text-amber-700 border-amber-200"
      default:
        return "bg-stone-100 text-stone-700 border-stone-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-3 w-3" />
      case "sold-out":
        return <CheckCircle className="h-3 w-3" />
      case "picked-up":
        return <CheckCircle className="h-3 w-3" />
      case "unknown":
        return <AlertCircle className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  return (
    <Card className={`${isArchived ? "bg-stone-50 border-stone-200" : "bg-white border-stone-200"} shadow-sm`}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold text-stone-800 mb-1">
              {batch.store_name || `Store ID: ${batch.store_id}`}
            </CardTitle>
            <div className="flex items-center text-stone-600 text-sm">
              <MapPin className="h-3 w-3 mr-1" />
              {batch.store_name ? 'Store location' : 'Location unknown'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${getStatusColor(batch.status)} font-mono text-xs`}>
              {getStatusIcon(batch.status)}
              <span className="ml-1 capitalize">{batch.status.replace("-", " ")}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="bg-rose-50 p-2 rounded border border-rose-100">
            <div className="text-stone-600 mb-1 text-xs">Placed</div>
            <div className="font-semibold text-stone-800">{batch.copies_placed} copies</div>
          </div>
          <div className="bg-blue-50 p-2 rounded border border-blue-100">
            <div className="text-stone-600 mb-1 text-xs">Sold</div>
            <div className="font-semibold text-stone-800">{batch.copies_sold || 0} copies</div>
          </div>
          <div className="bg-orange-50 p-2 rounded border border-orange-100">
            <div className="text-stone-600 mb-1 text-xs">Price</div>
            <div className="font-semibold text-stone-800">${batch.price_per_copy}</div>
          </div>
          <div className="bg-slate-50 p-2 rounded border border-slate-100">
            <div className="text-stone-600 mb-1 text-xs">Split</div>
            <div className="font-semibold text-stone-800">{batch.split_percent}%</div>
          </div>
        </div>

        {/* Delete button for archived batches */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={() => onDelete(batch.id)}
            size="sm"
            variant="outline"
            className="border-red-500 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 font-serif bg-transparent"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ZineDetailPage() {
  const { user } = useSupabaseUser()
  const params = useParams()
  const [zine, setZine] = useState<any>(null)
  const [batches, setBatches] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [userBatches, setUserBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [batchToDelete, setBatchToDelete] = useState<any>(null)

  // Function to get store details by store_id
  const getStoreDetails = (storeId: string) => {
    return stores.find(store => store.id === storeId)
  }

  // Function to format store location
  const formatStoreLocation = (store: any) => {
    if (!store) return 'Location unknown'
    
    const parts = []
    if (store.city) parts.push(store.city)
    if (store.state) parts.push(store.state)
    if (store.country) parts.push(store.country)
    
    return parts.length > 0 ? parts.join(', ') : 'Location unknown'
  }

  const fetchZineData = async () => {
    if (!params.id || !user) return

    try {
      setLoading(true)
      setError(null)

      // Fetch zine data by permalink
      const { data: zineData, error: zineError } = await supabase
        .from('zines')
        .select('*')
        .eq('permalink', params.id)
        .eq('user_id', user.id)
        .single()

      if (zineError) {
        if (zineError.code === 'PGRST116') {
          setError('Zine not found')
        } else {
          setError('Failed to load zine data')
        }
        return
      }

      // Fetch batches for this zine (simplified for now)
      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select('*')
        .eq('zine_id', zineData.id) // Use the actual zine ID for batches
        .order('date_placed', { ascending: false })

      if (batchesError) {
        console.error('Error fetching batches:', batchesError)
        console.error('Error details:', {
          zineId: zineData.id,
          userId: user.id,
          error: batchesError
        })
      }

      // Fetch all stores for reference
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('*')
        .order('name')

      if (storesError) {
        console.error('Error fetching stores:', storesError)
      }

      setZine(zineData)
      setBatches(batchesData || [])
      setStores(storesData || [])
    } catch (err) {
      console.error('Error fetching zine data:', err)
      setError('Failed to load zine data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchZineData()
  }, [params.id, user])

  const handleBatchSave = async (batchId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('batches')
        .update(updates)
        .eq('id', batchId)
        .eq('user_id', user?.id)

      if (error) {
        console.error('Error updating batch:', error)
        alert('Failed to update batch. Please try again.')
        return
      }

      // Refresh data
      fetchZineData()
    } catch (err) {
      console.error('Error updating batch:', err)
      alert('Failed to update batch. Please try again.')
    }
  }

  const handleBatchDelete = async (batchId: string) => {
    setBatchToDelete(batchId)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!user || !batchToDelete) return

    try {
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', batchToDelete)
        .eq('user_id', user?.id)

      if (error) {
        console.error('Error deleting batch:', error)
        alert('Failed to delete batch. Please try again.')
        return
      }

      // Refresh data
      fetchZineData()
      setDeleteModalOpen(false)
      setBatchToDelete(null)
    } catch (err) {
      console.error('Error deleting batch:', err)
      alert('Failed to delete batch. Please try again.')
    } finally {
      setDeleteModalOpen(false)
      setBatchToDelete(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-stone-200 rounded w-32 mb-8"></div>
            <div className="bg-white rounded-xl p-8">
              <div className="h-64 bg-stone-200 rounded mb-4"></div>
              <div className="h-8 bg-stone-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-stone-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !zine) {
    return (
      <div className="min-h-screen bg-stone-50 font-serif">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-stone-800 mb-2">Zine Not Found</h2>
            <p className="text-stone-600 mb-6">{error || 'This zine could not be loaded.'}</p>
            <Link href="/dashboard">
              <Button className="bg-rose-500 hover:bg-rose-600 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Calculate stats from batches
  const activeBatches = batches.filter(batch => batch.status === 'active')
  const totalCopiesOut = activeBatches.reduce((sum, batch) => sum + batch.copies_placed, 0)
  const totalCopiesSold = activeBatches.reduce((sum, batch) => sum + (batch.copies_sold || 0), 0)
  const totalEarnings = activeBatches.reduce((sum, batch) => {
    if (batch.copies_sold && batch.price_per_copy && batch.split_percent) {
      return sum + ((batch.split_percent / 100) * batch.copies_sold * batch.price_per_copy)
    }
    return sum
  }, 0)

  return (
    <div className="min-h-screen bg-stone-50 font-serif">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-stone-600 hover:text-stone-800 hover:bg-stone-100">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Zine Info */}
        <div className="bg-gradient-to-r from-rose-50 to-orange-50 rounded-xl p-6 lg:p-8 border border-rose-100">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-shrink-0">
              <img
                src={zine.cover_image || "/placeholder.svg"}
                alt={`${zine.title} cover`}
                className="w-48 h-64 object-cover rounded-lg shadow-md border border-stone-200 mx-auto lg:mx-0"
              />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-stone-800 mb-3">{zine.title}</h1>
                <p className="text-stone-700 leading-relaxed">{zine.description || 'No description provided'}</p>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-stone-800">{activeBatches.length}</div>
                  <div className="text-sm text-stone-600">Active Batches</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-stone-800">{totalCopiesOut}</div>
                  <div className="text-sm text-stone-600">Copies Out</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-stone-800">{totalCopiesSold}</div>
                  <div className="text-sm text-stone-600">Copies Sold</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-stone-800">${totalEarnings.toFixed(2)}</div>
                  <div className="text-sm text-stone-600">Earnings</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add New Batch Form */}
        <AddBatchForm zineId={zine.id} retailPrice={zine.retail_price} onBatchAdded={fetchZineData} />

        {/* Active Batches - Compact Editable */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-stone-800">Currently Stocked</h2>
            <span className="text-sm text-stone-500">{activeBatches.length} active batches</span>
          </div>

          {activeBatches.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-white rounded-xl p-8 border border-stone-200 shadow-sm max-w-md mx-auto">
                <Store className="h-12 w-12 text-stone-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-stone-800 mb-2">No active batches</h3>
                <p className="text-stone-600">Use the form above to add your first batch and start tracking sales.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeBatches.map((batch: any) => (
                <CompactEditableBatchCard 
                  key={batch.id} 
                  batch={batch} 
                  onSave={handleBatchSave}
                  onDelete={handleBatchDelete}
                  getStoreDetails={getStoreDetails}
                  formatStoreLocation={formatStoreLocation}
                  user={user}
                />
              ))}
            </div>
          )}
        </div>

        {/* Archived Batches */}
        {batches.filter((batch: any) => batch.status !== 'active').length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-stone-800">Past Batches</h2>
              <span className="text-sm text-stone-500">{batches.filter((batch: any) => batch.status !== 'active').length} completed</span>
            </div>

            <div className="space-y-4">
              {batches.filter((batch: any) => batch.status !== 'active').map((batch: any) => (
                <BatchCard 
                  key={batch.id} 
                  batch={batch} 
                  isArchived={true}
                  getStoreDetails={getStoreDetails}
                  formatStoreLocation={formatStoreLocation}
                  onDelete={handleBatchDelete}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this batch? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} className="mr-2">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
