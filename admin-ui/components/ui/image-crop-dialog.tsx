"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"

interface ImageCropDialogProps {
  file: File | null
  aspectRatio?: number
  onCrop: (blob: Blob) => void
  onCancel: () => void
}

function centerAspectCrop(width: number, height: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
    width,
    height,
  )
}

export function ImageCropDialog({ file, aspectRatio = 4 / 3, onCrop, onCancel }: ImageCropDialogProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<Crop>()
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!file) { setObjectUrl(null); return }
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget
    setCrop(centerAspectCrop(width, height, aspectRatio))
  }, [aspectRatio])

  const handleConfirm = useCallback(() => {
    const img = imgRef.current
    if (!img || !completedCrop) return

    const canvas = document.createElement("canvas")
    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height
    canvas.width = completedCrop.width * scaleX
    canvas.height = completedCrop.height * scaleY
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(
      img,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    )

    canvas.toBlob(
      (blob) => {
        if (!blob) { toast.error("Erro ao processar imagem"); return }
        onCrop(blob)
      },
      "image/jpeg",
      0.95,
    )
  }, [completedCrop, onCrop])

  return (
    <Dialog open={!!file} onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recortar imagem</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center max-h-[60vh] overflow-auto">
          {objectUrl && (
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              minWidth={80}
              minHeight={60}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={objectUrl}
                alt="Recortar"
                onLoad={onImageLoad}
                style={{ maxHeight: "60vh", maxWidth: "100%" }}
              />
            </ReactCrop>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!completedCrop}>Confirmar recorte</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
