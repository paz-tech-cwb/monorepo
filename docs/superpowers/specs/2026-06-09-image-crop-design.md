# Image Crop on Upload — Design Spec

**Date:** 2026-06-09
**Scope:** admin-ui — all image fields (events, announcements, courses, etc.)

## Goal

Add a crop step to the upload flow in `MediaPickerDialog` so admins can frame images correctly before they reach Firebase Storage. The default aspect ratio (4:3) matches the KMP event detail hero (`full-width × 300pt fixed`, `.scaledToFill()`). Other callers can override the ratio or allow free crop.

## What is NOT in scope

- Cropping images selected from the library (existing Firebase URLs) — library path unchanged.
- Android-side crop.
- Backend changes.

## Architecture

```
file picked/dropped
        │
        ▼
ImageCropDialog (new)
  - renders react-image-crop with locked aspect ratio
  - confirm → canvas.toBlob() → File
        │
        ▼
handleUploadFile(croppedFile)
  - compress (existing browser-image-compression step)
  - upload to Firebase
        │
        ▼
onSelect(url) → ImageField value
```

## Components

### New: `components/ui/image-crop-dialog.tsx`

A `Dialog` that:
- Accepts `file: File | null`, `aspectRatio?: number`, `onCrop: (blob: Blob) => void`, `onCancel: () => void`
- Creates an object URL from the file and renders `<ReactCrop>` with `aspect={aspectRatio}`
- On confirm: draws the crop region onto an offscreen `<canvas>`, calls `canvas.toBlob("image/jpeg", 0.95)`, passes the blob to `onCrop`, revokes the object URL
- On cancel: calls `onCancel`, revokes the object URL

### Modified: `components/ui/media-picker.tsx`

- Add state: `cropFile: File | null`
- After file is picked (input `onChange`) or dropped: set `cropFile = file` instead of calling `handleUploadFile` directly
- Render `<ImageCropDialog>` when `cropFile !== null`
- On crop confirm: convert blob to `File`, call `handleUploadFile(croppedFile)`, clear `cropFile`
- On cancel: clear `cropFile`
- Add prop: `cropAspectRatio?: number` (forwarded to `ImageCropDialog`)

### Modified: `components/ui/image-field.tsx`

- Add prop: `cropAspectRatio?: number` (default `4/3`)
- Forward to `<MediaPickerDialog cropAspectRatio={cropAspectRatio} />`

## Dependency

`react-image-crop` — lightweight (~15 kB), works on local object URLs (no CORS concern), ships its own types.

```bash
pnpm add react-image-crop
```

## Aspect ratio defaults

| Caller | Ratio | Why |
|--------|-------|-----|
| Events (`ImageField` default) | `4/3` | Matches KMP hero: full-width × 300pt |
| Announcements | `4/3` (inherited default) | Consistent with events |
| Courses / other | `4/3` (inherited default) | Can be overridden per field if needed |

## Error handling

- `canvas.toBlob` returns `null` on failure → show `toast.error("Erro ao processar imagem")`, keep crop dialog open
- Existing 10 MB file size check and image type check remain in `handleUploadFile` (applied to the cropped blob)

## Testing checklist

- Upload a landscape image → crop dialog appears → confirm → image uploads with correct crop
- Upload a portrait image → crop enforces 4:3 → uploaded result is landscape
- Drag-and-drop triggers crop dialog same as file input
- Cancel on crop dialog → returns to upload drop zone (no upload)
- Library tab: no crop dialog, select works as before
