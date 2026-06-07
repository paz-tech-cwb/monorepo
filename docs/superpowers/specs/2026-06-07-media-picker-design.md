# Media Picker — Design Spec

**Date:** 2026-06-07  
**Scope:** admin-ui  
**Status:** Approved

## Problem

The event form's image field is a plain URL `<Input>`. Staff must manually find and paste image URLs. The goal is to replace it with a picker that lets staff upload images from their computer or select from previously uploaded images — with the same picker reusable across events, announcements, and courses.

## Decision: Firebase Storage

Firebase Storage is already in the project (firebase v12). No new backend endpoint is needed — the `image` field remains a download URL string, so the backend API contract is unchanged.

## Storage Path Convention

```
media/{category}/{uuid}-{originalFilename}
```

Examples:
- `media/events/abc123-easter-banner.jpg`
- `media/announcements/def456-promo.png`

Each feature passes its own `category` string so uploads stay organised while the shared library modal can list all of `media/` if needed.

## New Files

| File | Purpose |
|------|---------|
| `lib/firebase/storage.ts` | `uploadMedia(file, category)` + `listMedia(folder)` helpers |
| `components/ui/media-picker.tsx` | `MediaPickerDialog` — Dialog with Biblioteca/Upload tabs |
| `components/ui/image-field.tsx` | `ImageField` — thumbnail preview + button that opens the dialog |

## Component API

```tsx
// ImageField — drop-in replacement for the URL <Input>
<ImageField
  value={formData.image}           // string (download URL) | ""
  onChange={(url) => onChange({ ...formData, image: url })}
  category="events"                // Firebase Storage folder
  label="Imagem (opcional)"
/>

// MediaPickerDialog — used internally by ImageField, also exportable
<MediaPickerDialog
  open={open}
  onOpenChange={setOpen}
  category="events"
  onSelect={(url) => { setValue(url); setOpen(false) }}
/>
```

## ImageField Behaviour

- **No image selected:** dashed border placeholder with `<ImageIcon>` + "Escolher imagem" button
- **Image selected:** thumbnail preview (aspect-video, object-cover) + "×" remove button + "Trocar" button to reopen picker

## MediaPickerDialog Behaviour

A `Dialog` (not Drawer) sized `max-w-3xl`.

### Biblioteca tab

- Calls `listMedia("media/")` on open via `listAll()` from Firebase Storage
- Shows a skeleton grid (9 cells) while loading
- Renders a responsive image grid (`grid-cols-3 sm:grid-cols-4`)
- Each cell: thumbnail + filename truncated below
- Selected item: checkmark overlay (`ring-2 ring-primary`)
- "Selecionar" button enabled when an item is chosen
- Error state: message + retry button if `listAll` fails

### Upload tab

- Drag-and-drop zone (`accept="image/*"`, max 10 MB client-side validation)
- Click-to-browse fallback via hidden `<input type="file">`
- On file chosen: upload via `uploadBytesResumable()`, show `<Progress>` bar
- On success: `getDownloadURL()` → call `onSelect(url)`, switch to Biblioteca tab, toast "Imagem enviada"
- On error: Sonner toast "Erro ao enviar imagem"

## Data Flow

```
ImageField (value: string)
  └─ MediaPickerDialog
       ├─ Biblioteca tab
       │    listAll("media/") → StorageReference[]
       │    getDownloadURL(ref) × N
       │    → grid of thumbnails → onSelect(url)
       └─ Upload tab
            uploadBytesResumable(file, ref)
            → getDownloadURL(ref)
            → onSelect(url)
```

`onSelect(url)` flows back into `ImageField.onChange(url)` → `formData.image = url`

## Backend

No changes. The `image` field in `CreateEventDto` / `UpdateEventDto` already accepts a URL string.

## Environment

`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` is already in `.env.local` and wired into `firebaseConfig`. Firebase Storage must be enabled in the Firebase Console for the project.

## Reuse in Other Features

To use in announcements or courses, replace the URL `<Input>` with:

```tsx
<ImageField value={formData.image_url} onChange={...} category="announcements" />
```

No other changes needed.

## Out of Scope

- Image deletion from Firebase Storage
- Pagination / infinite scroll in the media library (acceptable for current scale)
- File type enforcement beyond `accept="image/*"` client-side hint
