"use client"

import { useState, useEffect } from 'react'
import { X, Upload, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'

interface AddZineModalProps {
  user: User | null
  show: boolean
  onClose: () => void
  onSuccess: () => void
  mode?: 'create' | 'edit'
  zine?: any // For edit mode
}

// Function to generate permalink from title
const generatePermalink = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50) // Limit length
}

export default function AddZineModal({ user, show, onClose, onSuccess, mode = 'create', zine }: AddZineModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Debug logging
  console.log('AddZineModal render:', { mode, zine: zine?.id, show, user: user?.id })

  // Initialize form data when editing
  useEffect(() => {
    if (mode === 'edit' && zine) {
      setTitle(zine.title || '')
      setDescription(zine.description || '')
      setCoverImagePreview(zine.cover_image || null)
    } else {
      setTitle('')
      setDescription('')
      setCoverImage(null)
      setCoverImagePreview(null)
    }
  }, [mode, zine, show])

  // Function to compress image
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()
      
      img.onload = () => {
        // Calculate new dimensions (max 800px width/height)
        const maxSize = 800
        let { width, height } = img
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          0.8 // 80% quality
        )
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (1MB limit)
      if (file.size > 1024 * 1024) {
        setError('Image must be smaller than 1MB')
        return
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file')
        return
      }

      setError('') // Clear any previous errors
      setCoverImage(file)
      
      // Create preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setCoverImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!user) {
      setError('You must be logged in to add a zine')
      return
    }

    setLoading(true)
    setError('')

    try {
      let coverImageUrl = null

      // Upload cover image if provided
      if (coverImage) {
        // Compress the image first
        const compressedImage = await compressImage(coverImage)
        
        // Generate unique filename
        const timestamp = Date.now()
        const fileName = `${user.id}/${timestamp}.jpg`
        
        console.log('Uploading image:', fileName, 'Size:', compressedImage.size)
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('zine-covers')
          .upload(fileName, compressedImage, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          if (uploadError.message.includes('bucket')) {
            throw new Error('Storage bucket not found. Please contact support.')
          }
          throw new Error('Failed to upload cover image: ' + uploadError.message)
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('zine-covers')
          .getPublicUrl(fileName)

        coverImageUrl = urlData.publicUrl
        console.log('Image uploaded successfully:', coverImageUrl)
      }

      if (mode === 'create') {
        // Insert new zine into database
        const { error: insertError } = await supabase
          .from('zines')
          .insert({
            user_id: user.id,
            title: title.trim(),
            description: description.trim() || null,
            cover_image: coverImageUrl,
            permalink: generatePermalink(title.trim())
          })

        if (insertError) {
          console.error('Insert error:', insertError)
          throw new Error('Failed to create zine')
        }
      } else if (mode === 'edit' && zine) {
        // Update existing zine
        const updateData: any = {
          title: title.trim(),
          description: description.trim() || null,
          permalink: generatePermalink(title.trim())
        }

        // Only update cover image if a new one was uploaded
        if (coverImageUrl) {
          updateData.cover_image = coverImageUrl
        }

        const { error: updateError } = await supabase
          .from('zines')
          .update(updateData)
          .eq('id', zine.id)
          .eq('user_id', user.id)

        if (updateError) {
          console.error('Update error:', updateError)
          throw new Error('Failed to update zine')
        }
      }

      // Reset form
      setTitle('')
      setDescription('')
      setCoverImage(null)
      setCoverImagePreview(null)
      
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error saving zine:', err)
      setError(err instanceof Error ? err.message : 'Failed to save zine')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setTitle('')
      setDescription('')
      setCoverImage(null)
      setCoverImagePreview(null)
      setError('')
      onClose()
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-stone-800">
            {mode === 'edit' ? 'Edit Zine' : 'Add New Zine'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium text-stone-700">
              Title *
            </Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter zine title"
              className="mt-1"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium text-stone-700">
              Description (optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your zine..."
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Cover Image */}
          <div>
            <Label className="text-sm font-medium text-stone-700">
              Cover Image (optional)
            </Label>
            <div className="mt-1">
              {coverImagePreview ? (
                <div className="relative">
                  <img
                    src={coverImagePreview}
                    alt="Cover preview"
                    className="w-full h-32 object-cover rounded-lg border border-stone-200"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCoverImage(null)
                      setCoverImagePreview(null)
                    }}
                    className="absolute top-2 right-2 h-6 w-6 p-0 bg-white/80 hover:bg-white"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-stone-300 rounded-lg p-6 text-center hover:border-stone-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="cover-image"
                  />
                  <label htmlFor="cover-image" className="cursor-pointer">
                    <ImageIcon className="h-8 w-8 text-stone-400 mx-auto mb-2" />
                    <p className="text-sm text-stone-600">Click to upload cover image</p>
                    <p className="text-xs text-stone-500 mt-1">JPG, PNG, GIF up to 1MB</p>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Form Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white"
            >
              {loading ? 'Saving...' : mode === 'edit' ? 'Update Zine' : 'Create Zine'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 