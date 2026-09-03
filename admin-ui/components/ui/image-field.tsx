"use client"

import { useState } from "react"
import { ImageIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MediaPickerDialog } from "@/components/ui/media-picker"

interface ImageFieldProps {
  value: string
  onChange: (url: string) => void
  category: string
  label?: string
  cropAspectRatio?: number
}

export function ImageField({ value, onChange, category, label = "Imagem (opcional)", cropAspectRatio }: ImageFieldProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {value ? (
        <div className="relative rounded-md overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Imagem selecionada" className="w-full aspect-video object-cover" />
          <div className="absolute top-2 right-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setOpen(true)}
            >
              Trocar
            </Button>
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="h-8 w-8"
              onClick={() => onChange("")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/30 py-8 cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors"
          onClick={() => setOpen(true)}
        >
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
          <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setOpen(true) }}>
            Escolher imagem
          </Button>
        </div>
      )}

      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        category={category}
        onSelect={(url) => { onChange(url); setOpen(false) }}
        cropAspectRatio={cropAspectRatio}
      />
    </div>
  )
}
