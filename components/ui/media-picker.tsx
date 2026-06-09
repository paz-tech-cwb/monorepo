"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, ImageIcon, Upload, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { uploadMedia, listMedia, type MediaItem } from "@/lib/firebase/storage"
import { cn } from "@/lib/utils"
import { ImageCropDialog } from "@/components/ui/image-crop-dialog"

// ── MediaPickerDialog ──────────────────────────────────────────────────────────

interface MediaPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: string
  onSelect: (url: string) => void
  cropAspectRatio?: number
}

export function MediaPickerDialog({ open, onOpenChange, category, onSelect, cropAspectRatio = 4 / 3 }: MediaPickerDialogProps) {
  const [tab, setTab] = useState<"library" | "upload">("library")
  const [items, setItems] = useState<MediaItem[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [libraryError, setLibraryError] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)

  const loadLibrary = useCallback(async () => {
    setLoadingLibrary(true)
    setLibraryError(false)
    try {
      const result = await listMedia("media/")
      setItems(result)
    } catch {
      setLibraryError(true)
    } finally {
      setLoadingLibrary(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setSelected(null)
      loadLibrary()
    }
  }, [open, loadLibrary])

  const handleUploadFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10 MB.")
      return
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas.")
      return
    }

    setUploading(true)
    setUploadProgress(0)
    try {
      const url = await uploadMedia(file, category, setUploadProgress)
      toast.success("Imagem enviada")
      onSelect(url)
      onOpenChange(false)
    } catch {
      toast.error("Erro ao enviar imagem")
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setCropFile(file)
    e.target.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) setCropFile(file)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Selecionar Imagem</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "library" | "upload")}>
          <TabsList>
            <TabsTrigger value="library">Biblioteca</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          {/* Library tab */}
          <TabsContent value="library" className="mt-4">
            {loadingLibrary ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-md" />
                ))}
              </div>
            ) : libraryError ? (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                <AlertCircle className="h-8 w-8" />
                <p>Erro ao carregar imagens.</p>
                <Button variant="outline" onClick={loadLibrary}>Tentar novamente</Button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
                <p>Nenhuma imagem na biblioteca.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {items.map((item) => (
                    <button
                      key={item.fullPath}
                      type="button"
                      onClick={() => setSelected(item.url)}
                      className={cn(
                        "relative rounded-md overflow-hidden border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        selected === item.url ? "border-primary ring-2 ring-primary" : "border-transparent",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full aspect-square object-cover"
                      />
                      {selected === item.url && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <CheckCircle2 className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground truncate px-1 py-0.5 bg-background/80">
                        {item.name}
                      </p>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button disabled={!selected} onClick={() => { if (selected) { onSelect(selected); onOpenChange(false) } }}>
                    Selecionar
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Upload tab */}
          <TabsContent value="upload" className="mt-4">
            {uploading ? (
              <div className="space-y-3 py-8">
                <p className="text-sm text-center text-muted-foreground">Enviando imagem...</p>
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">{Math.round(uploadProgress)}%</p>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg py-16 cursor-pointer transition-colors",
                  dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary hover:bg-muted/30",
                )}
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">Arraste uma imagem ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-1">Apenas imagens · Máximo 10 MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFilePicked}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      <ImageCropDialog
        file={cropFile}
        aspectRatio={cropAspectRatio}
        onCrop={(blob) => {
          const name = cropFile?.name ?? "cropped.jpg"
          setCropFile(null)
          handleUploadFile(new File([blob], name, { type: "image/jpeg" }))
        }}
        onCancel={() => setCropFile(null)}
      />
    </Dialog>
  )
}
