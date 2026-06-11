# Image Compression on Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compress every uploaded image client-side before sending to Firebase Storage — resize to max 1920px on either dimension and reduce quality — without touching any consumer of `uploadMedia()`.

**Architecture:** Install `browser-image-compression` and run it inside `uploadMedia()` in `lib/firebase/storage.ts` as a single pre-upload step. All callers (`media-picker.tsx` and any future consumer) get compression automatically. File type is preserved (JPEG→JPEG, PNG→PNG).

**Tech Stack:** browser-image-compression, Firebase Storage SDK, Next.js / TypeScript

---

### Task 1: Install `browser-image-compression`

**Files:**
- Modify: `package.json` (via pnpm)
- Modify: `pnpm-lock.yaml` (auto-updated)

- [ ] **Step 1: Install the package**

```bash
cd /Users/jonathalima/Developer/church/admin-ui
pnpm add browser-image-compression
```

Expected output: a line like `+ browser-image-compression X.Y.Z` with no errors.

- [ ] **Step 2: Verify the type declarations are included**

```bash
node -e "require('browser-image-compression'); console.log('ok')"
```

Expected: `ok` (the package ships its own types — no `@types/` package needed).

- [ ] **Step 3: Commit**

```bash
cd /Users/jonathalima/Developer/church/admin-ui
git add package.json pnpm-lock.yaml
git commit -m "chore: add browser-image-compression"
```

---

### Task 2: Add compression step to `uploadMedia()`

**Files:**
- Modify: `lib/firebase/storage.ts`

- [ ] **Step 1: Open `lib/firebase/storage.ts` and add the import at the top**

Add this import after the existing firebase imports:

```ts
import imageCompression from "browser-image-compression"
```

- [ ] **Step 2: Add the compression step inside `uploadMedia()`, before the `uploadBytesResumable` call**

Replace the current `uploadMedia` function body with:

```ts
export async function uploadMedia(
  file: File,
  category: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const storage = getFirebaseStorage()

  const compressed = await imageCompression(file, {
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: file.type as "image/jpeg" | "image/png" | "image/webp",
  })

  const filename = `${crypto.randomUUID()}-${file.name}`
  const storageRef = ref(storage, `media/${category}/${filename}`)

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, compressed)

    task.on(
      "state_changed",
      (snapshot) => {
        const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress?.(pct)
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        resolve(url)
      },
    )
  })
}
```

- [ ] **Step 3: Verify TypeScript compiles with no errors**

```bash
cd /Users/jonathalima/Developer/church/admin-ui
pnpm exec tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 4: Commit**

```bash
cd /Users/jonathalima/Developer/church/admin-ui
git add lib/firebase/storage.ts
git commit -m "feat: compress images before upload (max 1920px, lossy quality)"
```

---

### Task 3: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/jonathalima/Developer/church/admin-ui
pnpm dev
```

- [ ] **Step 2: Open the app and upload a large image**

Navigate to any screen that uses `ImageField` (e.g. Announcements → create or edit). Upload an image larger than 1920px wide or a file over 1 MB. Open DevTools → Network and find the Firebase Storage PUT request. Confirm the payload size is visibly smaller than the original file.

- [ ] **Step 3: Verify the uploaded image renders correctly**

After upload, the selected image URL should load and display normally in the `ImageField` preview.

- [ ] **Step 4: Verify PNG transparency is preserved (if applicable)**

Upload a PNG with a transparent background. Confirm the stored image still has transparency when viewed via its Firebase URL (it should not be converted to JPEG).
