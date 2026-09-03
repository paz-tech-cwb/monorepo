# Image Crop on Upload — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a crop step to the upload flow in `MediaPickerDialog` so admins can frame images before they reach Firebase Storage, with a default 4:3 aspect ratio matching the KMP event detail hero.

**Architecture:** Install `react-image-crop`, create a new `ImageCropDialog` component that renders after a file is picked in the Upload tab, and wire it into `MediaPickerDialog` via a new `cropFile` state. The crop result (canvas blob) is converted to a `File` and passed to the existing `handleUploadFile` path unchanged. The library tab is untouched.

**Tech Stack:** react-image-crop, HTML Canvas API, Next.js / TypeScript / shadcn/ui

---

### Task 1: Install react-image-crop

**Files:**
- Modify: `package.json` (via pnpm)

- [ ] **Step 1: Install the package**

```bash
cd /Users/jonathalima/Developer/church/admin-ui
pnpm add react-image-crop
```

Expected output: a line like `+ react-image-crop X.Y.Z` with no errors.

- [ ] **Step 2: Verify types are available**

```bash
node -e "require('react-image-crop'); console.log('ok')"
```

Expected: `ok` (the package ships its own types).

- [ ] **Step 3: Commit**

```bash
cd /Users/jonathalima/Developer/church/admin-ui
git add package.json pnpm-lock.yaml
git commit -m "chore: add react-image-crop"
```

---

### Task 2: Create ImageCropDialog component

**Files:**
- Create: `components/ui/image-crop-dialog.tsx`

This component receives a `File`, renders it inside a `ReactCrop` control with a locked aspect ratio, and on confirm draws the selected crop region onto an offscreen canvas and calls `onCrop` with the resulting `Blob`.

- [ ] **Step 1: Create the file**

```bash
touch /Users/jonathalima/Developer/church/admin-ui/components/ui/image-crop-dialog.tsx
```

- [ ] **Step 2: Write the component**

```tsx
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
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/jonathalima/Developer/church/admin-ui
pnpm exec tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 4: Commit**

```bash
git add components/ui/image-crop-dialog.tsx
git commit -m "feat: add ImageCropDialog component with react-image-crop"
```

---

### Task 3: Wire ImageCropDialog into MediaPickerDialog

**Files:**
- Modify: `components/ui/media-picker.tsx`

Add `cropAspectRatio?: number` prop, add `cropFile: File | null` state, replace the direct `handleUploadFile` call in `handleFilePicked` and `handleDrop` with `setCropFile(file)`, render `<ImageCropDialog>` at the bottom of the dialog.

- [ ] **Step 1: Read the current file**

Open `components/ui/media-picker.tsx` and confirm the current top of the file matches what's expected (imports, interface, state declarations).

- [ ] **Step 2: Add the import and update the interface + state**

At the top of the file, add the import:

```tsx
import { ImageCropDialog } from "@/components/ui/image-crop-dialog"
```

Change the interface from:

```tsx
interface MediaPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: string
  onSelect: (url: string) => void
}
```

to:

```tsx
interface MediaPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: string
  onSelect: (url: string) => void
  cropAspectRatio?: number
}
```

Update the function signature from:

```tsx
export function MediaPickerDialog({ open, onOpenChange, category, onSelect }: MediaPickerDialogProps) {
```

to:

```tsx
export function MediaPickerDialog({ open, onOpenChange, category, onSelect, cropAspectRatio = 4 / 3 }: MediaPickerDialogProps) {
```

Add `cropFile` state after the existing state declarations (after the `fileInputRef` line):

```tsx
const [cropFile, setCropFile] = useState<File | null>(null)
```

- [ ] **Step 3: Replace handleFilePicked and handleDrop to route through crop**

Replace:

```tsx
const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (file) handleUploadFile(file)
}

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault()
  setDragging(false)
  const file = e.dataTransfer.files?.[0]
  if (file) handleUploadFile(file)
}
```

with:

```tsx
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
```

Note: `e.target.value = ""` resets the input so the same file can be re-picked if the user cancels.

- [ ] **Step 4: Add ImageCropDialog render and crop/cancel handlers**

Inside the `return` block, just before the closing `</Dialog>` tag, add:

```tsx
<ImageCropDialog
  file={cropFile}
  aspectRatio={cropAspectRatio}
  onCrop={(blob) => {
    setCropFile(null)
    const croppedFile = new File([blob], cropFile?.name ?? "cropped.jpg", { type: "image/jpeg" })
    handleUploadFile(croppedFile)
  }}
  onCancel={() => setCropFile(null)}
/>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/jonathalima/Developer/church/admin-ui
pnpm exec tsc --noEmit
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add components/ui/media-picker.tsx
git commit -m "feat: show crop dialog before upload in MediaPickerDialog"
```

---

### Task 4: Forward cropAspectRatio through ImageField

**Files:**
- Modify: `components/ui/image-field.tsx`

- [ ] **Step 1: Add the prop to ImageFieldProps**

Open `components/ui/image-field.tsx`. Change the interface from:

```tsx
interface ImageFieldProps {
  value: string
  onChange: (url: string) => void
  category: string
  label?: string
}
```

to:

```tsx
interface ImageFieldProps {
  value: string
  onChange: (url: string) => void
  category: string
  label?: string
  cropAspectRatio?: number
}
```

- [ ] **Step 2: Update the function signature and forward the prop**

Change:

```tsx
export function ImageField({ value, onChange, category, label = "Imagem (opcional)" }: ImageFieldProps) {
```

to:

```tsx
export function ImageField({ value, onChange, category, label = "Imagem (opcional)", cropAspectRatio }: ImageFieldProps) {
```

In the JSX, change:

```tsx
<MediaPickerDialog
  open={open}
  onOpenChange={setOpen}
  category={category}
  onSelect={(url) => { onChange(url); setOpen(false) }}
/>
```

to:

```tsx
<MediaPickerDialog
  open={open}
  onOpenChange={setOpen}
  category={category}
  onSelect={(url) => { onChange(url); setOpen(false) }}
  cropAspectRatio={cropAspectRatio}
/>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/jonathalima/Developer/church/admin-ui
pnpm exec tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add components/ui/image-field.tsx
git commit -m "feat: forward cropAspectRatio prop through ImageField"
```

---

### Task 5: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/jonathalima/Developer/church/admin-ui
pnpm dev
```

- [ ] **Step 2: Open an event form and test the upload flow**

Navigate to `http://localhost:3000` → Events → create or edit an event. Click "Escolher imagem" → Upload tab. Pick any image. Confirm: crop dialog appears with a 4:3 crop selection centered on the image.

- [ ] **Step 3: Confirm the crop**

Adjust the crop selection and click "Confirmar recorte". Confirm: the upload progress bar appears, then the cropped image preview appears in the ImageField with the correct 4:3 framing.

- [ ] **Step 4: Test cancel**

Pick another image. In the crop dialog, click "Cancelar". Confirm: you return to the Upload tab drop zone with no upload started.

- [ ] **Step 5: Test drag-and-drop**

Drag an image file onto the Upload tab drop zone. Confirm: crop dialog appears (same as file input).

- [ ] **Step 6: Verify library tab is unchanged**

Switch to the Biblioteca tab. Select an existing image and click "Selecionar". Confirm: no crop dialog appears — the URL is returned directly.

- [ ] **Step 7: Commit**

```bash
cd /Users/jonathalima/Developer/church/admin-ui
git add -A
git commit -m "chore: image crop upload — verified working"
```
