import { getStorage, ref, uploadBytesResumable, getDownloadURL, listAll } from "firebase/storage"
import imageCompression from "browser-image-compression"
import { getFirebaseApp } from "./config"

function getFirebaseStorage() {
  return getStorage(getFirebaseApp())
}

// `crypto.randomUUID()` only exists in secure contexts (HTTPS or localhost) — admin-ui is
// currently served over plain HTTP on its sslip.io host, where it's undefined and throws.
// This only needs to be unique per upload, not cryptographically random, so a timestamp +
// random suffix works everywhere without depending on the Web Crypto API being available.
function generateUploadId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

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

  const filename = `${generateUploadId()}-${file.name}`
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

export interface MediaItem {
  name: string
  url: string
  fullPath: string
}

export async function listMedia(folder: string): Promise<MediaItem[]> {
  const storage = getFirebaseStorage()
  const folderRef = ref(storage, folder)
  const result = await listAll(folderRef)

  const items = await Promise.all(
    result.items.map(async (itemRef) => {
      const url = await getDownloadURL(itemRef)
      return {
        name: itemRef.name,
        url,
        fullPath: itemRef.fullPath,
      }
    }),
  )

  // Also recurse into prefixes (subdirectories)
  const subItems = await Promise.all(
    result.prefixes.map((prefix) => listMedia(prefix.fullPath)),
  )

  return [...items, ...subItems.flat()]
}
