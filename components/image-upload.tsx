'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import { Upload, X } from 'lucide-react'

interface ImageUploadProps {
  eventId: string
  participantId: string
  onUploadComplete: (imageUrl: string) => void
  onError?: (error: string) => void
}

export function ImageUpload({ eventId, participantId, onUploadComplete, onError }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError?.('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      onError?.('Image size must be less than 5MB')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    const fileInput = document.getElementById('image-upload-input') as HTMLInputElement
    const file = fileInput?.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${eventId}/${participantId}/${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName)

      onUploadComplete(data.publicUrl)
      
      // Reset
      setPreview(null)
      if (fileInput) {
        fileInput.value = ''
      }
    } catch (err) {
      const error = err as Error
      onError?.(error.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    setPreview(null)
    const fileInput = document.getElementById('image-upload-input') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <input
        id="image-upload-input"
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />
      
      {preview ? (
        <div className="space-y-2">
          <div className="relative">
            <Image
              src={preview}
              alt="Preview"
              width={400}
              height={128}
              className="w-full h-32 object-cover rounded-md border"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={uploading}
              size="sm"
              className="flex-1"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              size="sm"
              disabled={uploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById('image-upload-input')?.click()}
          disabled={uploading}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Image
        </Button>
      )}
    </div>
  )
}

