"use client"

import type React from "react"

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
import { useState } from "react"

// Sample zine data with batch-based tracking
const zineData = {
  id: 1,
  title: "Urban Sketches Vol. 3",
  description:
    "Hand-drawn illustrations of city life and architecture, featuring sketches from Chicago, Portland, and Brooklyn. A celebration of urban spaces and the people who inhabit them.",
  coverImage: "/placeholder.svg?height=300&width=200",
  createdDate: "2024-01-15",
  totalBatches: 8,
  activeBatches: 5,
  totalCopiesOut: 67,
  totalCopiesSold: 34,
  totalRevenue: 238.5,
}

// Sample stores for the dropdown
const availableStores = [
  { id: 1, name: "Quimby's Bookstore", city: "Chicago, IL" },
  { id: 2, name: "Desert Island Comics", city: "Brooklyn, NY" },
  { id: 3, name: "Powell's Books", city: "Portland, OR" },
  { id: 4, name: "The Bindery", city: "Minneapolis, MN" },
  { id: 5, name: "Atomic Books", city: "Baltimore, MD" },
  { id: 6, name: "Spoonbill & Sugartown", city: "Brooklyn, NY" },
  { id: 7, name: "City Lights Bookstore", city: "San Francisco, CA" },
  { id: 8, name: "McNally Jackson", city: "New York, NY" },
]

const initialActiveBatches = [
  {
    id: 1,
    storeName: "Quimby's Bookstore",
    city: "Chicago, IL",
    datePlaced: "2024-02-15",
    copiesPlaced: 15,
    pricePerCopy: 8.0,
    split: "60/40",
    copiesSold: 9,
    isPaid: true,
    paidUpfront: false,
    status: "active",
    nextCheckIn: "2024-03-15",
    notes: "Selling well, staff recommends restocking soon",
    lastCheckIn: {
      date: "2024-03-01",
      note: "Selling well, staff recommends restocking soon",
    },
  },
  {
    id: 2,
    storeName: "Desert Island Comics",
    city: "Brooklyn, NY",
    datePlaced: "2024-02-20",
    copiesPlaced: 12,
    pricePerCopy: 10.0,
    split: "50/50",
    copiesSold: 7,
    isPaid: false,
    paidUpfront: true,
    status: "active",
    nextCheckIn: "2024-03-20",
    notes: "Good placement near register. Paid $60 upfront.",
    lastCheckIn: {
      date: "2024-02-28",
      note: "Good placement near register",
    },
  },
  {
    id: 3,
    storeName: "Powell's Books",
    city: "Portland, OR",
    datePlaced: "2024-03-05",
    copiesPlaced: 20,
    pricePerCopy: 9.0,
    split: "55/45",
    copiesSold: 12,
    isPaid: true,
    paidUpfront: false,
    status: "active",
    nextCheckIn: "2024-03-25",
    notes: "Popular with art students",
    lastCheckIn: {
      date: "2024-03-10",
      note: "Popular with art students",
    },
  },
  {
    id: 4,
    storeName: "The Bindery",
    city: "Minneapolis, MN",
    datePlaced: "2024-03-12",
    copiesPlaced: 10,
    pricePerCopy: 8.5,
    split: "50/50",
    copiesSold: 3,
    isPaid: false,
    paidUpfront: false,
    status: "active",
    nextCheckIn: "",
    notes: "",
    lastCheckIn: {
      date: "2024-03-12",
      note: "Just placed, no updates yet",
    },
  },
  {
    id: 5,
    storeName: "Atomic Books",
    city: "Baltimore, MD",
    datePlaced: "2024-01-28",
    copiesPlaced: 10,
    pricePerCopy: 7.5,
    split: "60/40",
    copiesSold: 3,
    isPaid: false,
    paidUpfront: false,
    status: "unknown",
    nextCheckIn: "2024-03-28",
    notes: "Need to follow up - no response to emails",
    lastCheckIn: {
      date: "2024-02-15",
      note: "Need to follow up - no response to emails",
    },
  },
]

const archivedBatches = [
  {
    id: 6,
    storeName: "Spoonbill & Sugartown",
    city: "Brooklyn, NY",
    datePlaced: "2024-01-10",
    copiesPlaced: 8,
    pricePerCopy: 9.5,
    split: "65/35",
    copiesSold: 8,
    isPaid: true,
    paidUpfront: false,
    status: "sold-out",
    nextCheckIn: "",
    notes: "All copies sold! Store interested in next issue",
    lastCheckIn: {
      date: "2024-02-20",
      note: "All copies sold! Store interested in next issue",
    },
  },
  {
    id: 7,
    storeName: "Local Coffee Shop",
    city: "Chicago, IL",
    datePlaced: "2024-01-05",
    copiesPlaced: 5,
    pricePerCopy: 6.0,
    split: "50/50",
    copiesSold: 2,
    isPaid: true,
    paidUpfront: false,
    status: "picked-up",
    nextCheckIn: "",
    notes: "Picked up remaining copies - slow sales",
    lastCheckIn: {
      date: "2024-02-10",
      note: "Picked up remaining copies - slow sales",
    },
  },
]

function AddBatchForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    storeId: "",
    datePlaced: new Date().toISOString().split("T")[0],
    copiesPlaced: "",
    pricePerCopy: "",
    splitPercentage: "60",
    paidUpfront: false,
    copiesSold: "",
    status: "active",
    nextCheckIn: "",
    notes: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Saving batch:", formData)
    // Here you would save the batch data
    setIsOpen(false)
    // Reset form or show success message
  }

  const selectedStore = availableStores.find((store) => store.id.toString() === formData.storeId)

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
                <Select
                  value={formData.storeId}
                  onValueChange={(value) => setFormData({ ...formData, storeId: value })}
                >
                  <SelectTrigger className="bg-white border-stone-300 focus:border-orange-400 focus:ring-orange-200">
                    <SelectValue placeholder="Choose a store..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStores.map((store) => (
                      <SelectItem key={store.id} value={store.id.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">{store.name}</span>
                          <span className="text-xs text-stone-500">{store.city}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedStore && (
                  <div className="flex items-center text-sm text-stone-600 bg-white p-2 rounded border border-orange-100">
                    <MapPin className="h-3 w-3 mr-1" />
                    {selectedStore.city}
                  </div>
                )}
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
                      className="bg-white border-stone-300 focus:border-orange-400 focus:ring-orange-200 font-mono"
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
                  <Label className="text-stone-700 font-serif font-medium">Payment</Label>
                  <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-stone-300">
                    <Checkbox
                      id="paidUpfront"
                      checked={formData.paidUpfront}
                      onCheckedChange={(checked) => setFormData({ ...formData, paidUpfront: checked as boolean })}
                    />
                    <Label htmlFor="paidUpfront" className="text-sm text-stone-700 font-mono">
                      Paid upfront?
                    </Label>
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
                    value={formData.copiesSold}
                    onChange={(e) => setFormData({ ...formData, copiesSold: e.target.value })}
                    className="bg-white border-stone-300 focus:border-orange-400 focus:ring-orange-200 font-mono"
                    placeholder="0"
                  />
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
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white shadow-sm font-serif"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Save Batch
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
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

function CompactEditableBatchCard({ batch, onSave }: { batch: any; onSave: (id: number, updates: any) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    status: batch.status,
    copiesSold: batch.copiesSold?.toString() || "",
    isPaid: batch.isPaid,
    nextCheckIn: batch.nextCheckIn || "",
    notes: batch.notes || "",
  })

  const handleChange = (field: string, value: any) => {
    setEditData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    onSave(batch.id, {
      ...editData,
      copiesSold: editData.copiesSold ? Number.parseInt(editData.copiesSold) : null,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditData({
      status: batch.status,
      copiesSold: batch.copiesSold?.toString() || "",
      isPaid: batch.isPaid,
      nextCheckIn: batch.nextCheckIn || "",
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
            <CardTitle className="text-lg font-semibold text-stone-800 mb-1">{batch.storeName}</CardTitle>
            <div className="flex items-center text-stone-600 text-sm">
              <MapPin className="h-3 w-3 mr-1" />
              {batch.city}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {batch.paidUpfront && (
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
        {/* Read-only info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="bg-stone-50 p-2 rounded border border-stone-100">
            <div className="text-stone-500 mb-1 text-xs font-mono">Placed</div>
            <div className="font-semibold text-stone-800 font-mono">
              {new Date(batch.datePlaced).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          </div>
          <div className="bg-stone-50 p-2 rounded border border-stone-100">
            <div className="text-stone-500 mb-1 text-xs font-mono">Copies</div>
            <div className="font-semibold text-stone-800 font-mono">{batch.copiesPlaced}</div>
          </div>
          <div className="bg-stone-50 p-2 rounded border border-stone-100">
            <div className="text-stone-500 mb-1 text-xs font-mono">Price</div>
            <div className="font-semibold text-stone-800 font-mono">${batch.pricePerCopy}</div>
          </div>
          <div className="bg-stone-50 p-2 rounded border border-stone-100">
            <div className="text-stone-500 mb-1 text-xs font-mono">Split</div>
            <div className="font-semibold text-stone-800 font-mono">{batch.split}</div>
          </div>
        </div>

        {/* Editable fields - compact inline editing */}
        {isEditing ? (
          <div className="space-y-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
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
              </div>

              {/* Copies Sold - conditionally shown */}
              {!batch.paidUpfront && (
                <div>
                  <Label className="text-stone-700 font-serif text-xs mb-1 block">Sold</Label>
                  <Input
                    type="number"
                    min="0"
                    max={batch.copiesPlaced}
                    value={editData.copiesSold}
                    onChange={(e) => handleChange("copiesSold", e.target.value)}
                    className="h-8 bg-white border-stone-300 font-mono text-xs"
                    placeholder="0"
                  />
                </div>
              )}

              {/* Payment Status */}
              <div>
                <Label className="text-stone-700 font-serif text-xs mb-1 block">Paid</Label>
                <div className="flex items-center h-8 bg-white px-2 rounded border border-stone-300">
                  <Checkbox
                    checked={editData.isPaid}
                    onCheckedChange={(checked) => handleChange("isPaid", checked)}
                    className="scale-75"
                  />
                  <span className="text-xs text-stone-700 font-mono ml-1">Received</span>
                </div>
              </div>

              {/* Next Check-in */}
              <div>
                <Label className="text-stone-700 font-serif text-xs mb-1 block">Next Check</Label>
                <Input
                  type="date"
                  value={editData.nextCheckIn}
                  onChange={(e) => handleChange("nextCheckIn", e.target.value)}
                  className="h-8 bg-white border-stone-300 font-mono text-xs"
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
                Save
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
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Current values display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-stone-500 text-xs font-mono">Sold: </span>
                <span className="font-semibold text-stone-800 font-mono">
                  {batch.paidUpfront ? "N/A (Paid Upfront)" : `${batch.copiesSold || 0}`}
                </span>
              </div>
              <div>
                <span className="text-stone-500 text-xs font-mono">Payment: </span>
                <span className={`font-semibold font-mono ${batch.isPaid ? "text-emerald-600" : "text-amber-600"}`}>
                  {batch.isPaid ? "Received" : "Pending"}
                </span>
              </div>
              <div>
                <span className="text-stone-500 text-xs font-mono">Next Check: </span>
                <span className="font-semibold text-stone-800 font-mono">
                  {batch.nextCheckIn
                    ? new Date(batch.nextCheckIn).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "Not set"}
                </span>
              </div>
              <div>
                <span className="text-stone-500 text-xs font-mono">Last Update: </span>
                <span className="font-semibold text-stone-800 font-mono">
                  {batch.lastCheckIn?.date
                    ? new Date(batch.lastCheckIn.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
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
            <div className="flex justify-end">
              <Button
                onClick={() => setIsEditing(true)}
                size="sm"
                variant="outline"
                className="border-stone-300 text-stone-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 font-serif"
              >
                <Edit className="h-3 w-3 mr-1" />
                Update
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BatchCard({ batch, isArchived = false }: { batch: any; isArchived?: boolean }) {
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
            <CardTitle className="text-lg font-semibold text-stone-800 mb-1">{batch.storeName}</CardTitle>
            <div className="flex items-center text-stone-600 text-sm">
              <MapPin className="h-3 w-3 mr-1" />
              {batch.city}
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
            <div className="font-semibold text-stone-800">{batch.copiesPlaced} copies</div>
          </div>
          <div className="bg-blue-50 p-2 rounded border border-blue-100">
            <div className="text-stone-600 mb-1 text-xs">Sold</div>
            <div className="font-semibold text-stone-800">{batch.copiesSold} copies</div>
          </div>
          <div className="bg-orange-50 p-2 rounded border border-orange-100">
            <div className="text-stone-600 mb-1 text-xs">Price</div>
            <div className="font-semibold text-stone-800">${batch.pricePerCopy}</div>
          </div>
          <div className="bg-slate-50 p-2 rounded border border-slate-100">
            <div className="text-stone-600 mb-1 text-xs">Split</div>
            <div className="font-semibold text-stone-800">{batch.split}</div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span className="text-stone-600">Date placed:</span>
            <span className="font-mono text-stone-800">{new Date(batch.datePlaced).toLocaleDateString()}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span className="text-stone-600">Payment received:</span>
            <div className="flex items-center gap-2">
              <Checkbox checked={batch.isPaid} disabled />
              <span className={batch.isPaid ? "text-emerald-600" : "text-amber-600"}>
                {batch.isPaid ? "Paid" : "Pending"}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span className="text-stone-600">Last check-in:</span>
            <span className="font-mono text-stone-800">
              {batch.lastCheckIn?.date ? new Date(batch.lastCheckIn.date).toLocaleDateString() : "No check-ins yet"}
            </span>
          </div>
        </div>

        {/* Last check-in note */}
        {batch.lastCheckIn?.note && (
          <div className="bg-slate-50 p-2 rounded border border-slate-100">
            <div className="text-xs text-stone-600 mb-1">Latest note:</div>
            <div className="text-sm text-stone-700 italic">"{batch.lastCheckIn.note}"</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ZineDetailPage() {
  const [activeBatches, setActiveBatches] = useState(initialActiveBatches)

  const handleBatchSave = (batchId: number, updates: any) => {
    setActiveBatches((prev) => prev.map((batch) => (batch.id === batchId ? { ...batch, ...updates } : batch)))
    console.log("Batch updated:", batchId, updates)
    // Here you would save to your backend
  }

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
                src={zineData.coverImage || "/placeholder.svg"}
                alt={`${zineData.title} cover`}
                className="w-48 h-64 object-cover rounded-lg shadow-md border border-stone-200 mx-auto lg:mx-0"
              />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-stone-800 mb-3">{zineData.title}</h1>
                <p className="text-stone-700 leading-relaxed">{zineData.description}</p>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-stone-800">{zineData.activeBatches}</div>
                  <div className="text-sm text-stone-600">Active Batches</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-stone-800">{zineData.totalCopiesOut}</div>
                  <div className="text-sm text-stone-600">Copies Out</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-stone-800">{zineData.totalCopiesSold}</div>
                  <div className="text-sm text-stone-600">Copies Sold</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-stone-800">${zineData.totalRevenue}</div>
                  <div className="text-sm text-stone-600">Revenue</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add New Batch Form */}
        <AddBatchForm />

        {/* Active Batches - Compact Editable */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-stone-800">Currently Stocked</h2>
            <span className="text-sm text-stone-500">{activeBatches.length} active batches</span>
          </div>

          <div className="space-y-4">
            {activeBatches.map((batch) => (
              <CompactEditableBatchCard key={batch.id} batch={batch} onSave={handleBatchSave} />
            ))}
          </div>
        </div>

        {/* Archived Batches */}
        {archivedBatches.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-stone-800">Past Batches</h2>
              <span className="text-sm text-stone-500">{archivedBatches.length} completed</span>
            </div>

            <div className="space-y-4">
              {archivedBatches.map((batch) => (
                <BatchCard key={batch.id} batch={batch} isArchived={true} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
