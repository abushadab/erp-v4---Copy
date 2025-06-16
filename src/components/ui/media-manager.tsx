"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, X, Check, Image as ImageIcon, Search, Filter, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface MediaItem {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploadDate: string
  alt?: string
}

interface MediaManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (media: MediaItem) => void
  selectedId?: string
  allowMultiple?: boolean
}

// Mock media library data
const mockMediaLibrary: MediaItem[] = [
  {
    id: "IMG001",
    name: "punjabi-cotton-premium.jpg",
    url: "https://images.unsplash.com/photo-1621072156002-e2fccdc0b176?w=400&h=400&fit=crop",
    size: 245760,
    type: "image/jpeg",
    uploadDate: "2024-01-15T10:00:00Z",
    alt: "Premium Cotton Punjabi"
  },
  {
    id: "IMG002", 
    name: "formal-shirt-white.jpg",
    url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop",
    size: 189440,
    type: "image/jpeg",
    uploadDate: "2024-01-14T15:30:00Z",
    alt: "White Formal Shirt"
  },
  {
    id: "IMG003",
    name: "tshirt-casual-blue.jpg", 
    url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
    size: 156680,
    type: "image/jpeg",
    uploadDate: "2024-01-13T09:15:00Z",
    alt: "Casual Blue T-Shirt"
  },
  {
    id: "IMG004",
    name: "formal-pant-black.jpg",
    url: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop", 
    size: 298760,
    type: "image/jpeg",
    uploadDate: "2024-01-12T11:45:00Z",
    alt: "Black Formal Pant"
  },
  {
    id: "IMG005",
    name: "denim-jeans-blue.jpg",
    url: "https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=400&h=400&fit=crop",
    size: 334560,
    type: "image/jpeg", 
    uploadDate: "2024-01-11T14:20:00Z",
    alt: "Blue Denim Jeans"
  },
  {
    id: "IMG006",
    name: "kurti-ladies-pink.jpg",
    url: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop",
    size: 267890,
    type: "image/jpeg",
    uploadDate: "2024-01-10T16:00:00Z",
    alt: "Pink Ladies Kurti"
  }
]

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short', 
    day: 'numeric'
  })
}

// Confirmation Dialog Component
interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  mediaName: string
}

function ConfirmDeleteDialog({ open, onOpenChange, onConfirm, mediaName }: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{mediaName}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200"
              onClick={() => {
                onConfirm()
                onOpenChange(false)
              }}
            >
              Delete Image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function MediaManager({ 
  open, 
  onOpenChange, 
  onSelect, 
  selectedId,
  allowMultiple = false 
}: MediaManagerProps) {
  const [mediaLibrary, setMediaLibrary] = React.useState<MediaItem[]>(mockMediaLibrary)
  const [selectedMedia, setSelectedMedia] = React.useState<MediaItem | null>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [dragActive, setDragActive] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [mediaToDelete, setMediaToDelete] = React.useState<MediaItem | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Filter media based on search
  const filteredMedia = mediaLibrary.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.alt?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Handle file upload
  const handleFileUpload = async (files: FileList | File[]) => {
    setUploading(true)
    const newMedia: MediaItem[] = []

    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        // Create mock uploaded media item
        const newItem: MediaItem = {
          id: `IMG${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          url: URL.createObjectURL(file), // In real app, this would be the uploaded URL
          size: file.size,
          type: file.type,
          uploadDate: new Date().toISOString(),
          alt: file.name.replace(/\.[^/.]+$/, "")
        }
        newMedia.push(newItem)
      }
    }

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setMediaLibrary(prev => [...newMedia, ...prev])
    setUploading(false)

    // Auto-select the first uploaded image
    if (newMedia.length > 0) {
      setSelectedMedia(newMedia[0])
    }
  }

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const handleSelectMedia = (media: MediaItem) => {
    setSelectedMedia(media)
  }

  const handleConfirmSelection = () => {
    if (selectedMedia) {
      onSelect(selectedMedia)
      onOpenChange(false)
    }
  }

  const handleRemoveMedia = (media: MediaItem) => {
    setMediaToDelete(media)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = () => {
    if (mediaToDelete) {
      setMediaLibrary(prev => prev.filter(item => item.id !== mediaToDelete.id))
      if (selectedMedia?.id === mediaToDelete.id) {
        setSelectedMedia(null)
      }
      setMediaToDelete(null)
    }
  }

  // Initialize selected media from selectedId prop
  React.useEffect(() => {
    if (selectedId && open) {
      const media = mediaLibrary.find(item => item.id === selectedId)
      if (media) {
        setSelectedMedia(media)
      }
    }
  }, [selectedId, open, mediaLibrary])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Media Library</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="library" className="flex-1 flex flex-col">
          <TabsList className="mx-6 w-fit">
            <TabsTrigger value="library">Media Library</TabsTrigger>
            <TabsTrigger value="upload">Upload Files</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="flex-1 p-6 pt-4">
            {/* Search and Filter */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search images..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="secondary">
                {filteredMedia.length} {filteredMedia.length === 1 ? 'image' : 'images'}
              </Badge>
            </div>

            {/* Media Grid */}
            <div className="flex gap-8 h-[450px]">
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4 pr-4">
                  {filteredMedia.map((media) => (
                    <div
                      key={media.id}
                      className={cn(
                        "relative aspect-square rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 group",
                        selectedMedia?.id === media.id
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border"
                      )}
                      onClick={() => handleSelectMedia(media)}
                    >
                      <div className="absolute inset-0 bg-muted rounded-lg flex items-center justify-center z-0">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <img
                        src={media.url}
                        alt={media.alt || media.name}
                        className="w-full h-full object-cover rounded-lg relative z-10"
                        onLoad={(e) => {
                          // Hide the placeholder when image loads
                          const placeholder = e.currentTarget.parentElement?.querySelector('.z-0') as HTMLElement
                          if (placeholder) placeholder.style.display = 'none'
                        }}
                        onError={(e) => {
                          // Show placeholder if image fails to load
                          e.currentTarget.style.display = 'none'
                          const placeholder = e.currentTarget.parentElement?.querySelector('.z-0') as HTMLElement
                          if (placeholder) placeholder.style.display = 'flex'
                        }}
                      />
                      {selectedMedia?.id === media.id && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 z-20">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 left-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-red-100 text-red-800 hover:bg-red-200 border-red-200 z-20"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveMedia(media)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Media Details */}
              {selectedMedia && (
                <div className="w-72 border-l pl-6">
                  <div className="space-y-4">
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden relative">
                      <ImageIcon className="h-12 w-12 text-muted-foreground absolute" />
                      <img
                        src={selectedMedia.url}
                        alt={selectedMedia.alt || selectedMedia.name}
                        className="w-full h-full object-cover relative z-10"
                        onLoad={(e) => {
                          // Hide the placeholder icon when image loads
                          const icon = e.currentTarget.parentElement?.querySelector('.absolute') as HTMLElement
                          if (icon) icon.style.display = 'none'
                        }}
                        onError={(e) => {
                          // Show placeholder icon if image fails to load
                          e.currentTarget.style.display = 'none'
                          const icon = e.currentTarget.parentElement?.querySelector('.absolute') as HTMLElement
                          if (icon) icon.style.display = 'block'
                        }}
                      />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filename</Label>
                        <p className="text-sm font-medium mt-1">{selectedMedia.name}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">File size</Label>
                        <p className="text-sm mt-1">{formatFileSize(selectedMedia.size)}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upload date</Label>
                        <p className="text-sm mt-1">{formatDate(selectedMedia.uploadDate)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="flex-1 p-6 pt-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-semibold">
                  {uploading ? "Uploading..." : "Drag and drop images here"}
                </p>
                <p className="text-muted-foreground">
                  or{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    browse your files
                  </Button>
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports: JPG, PNG, GIF, WebP (Max: 5MB each)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileUpload(e.target.files)
                  }
                }}
              />
            </div>

            {uploading && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  Uploading files... Please wait.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="border-t p-6 flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmSelection}
            disabled={!selectedMedia}
          >
            Select Image
          </Button>
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        mediaName={mediaToDelete?.name || ''}
      />
    </Dialog>
  )
} 