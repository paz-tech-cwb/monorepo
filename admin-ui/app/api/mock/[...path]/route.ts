/**
 * Local mock server driven by the Postman collection.
 *
 * When NEXT_PUBLIC_API_MOCK_ENABLED=true, point NEXT_PUBLIC_API_BASE_URL at
 * this route:
 *
 *   NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/mock
 *   NEXT_PUBLIC_API_MOCK_ENABLED=true
 *
 * The handler reads postman/collections/Paz Church API.postman_collection.json,
 * finds the first example response whose HTTP method and path pattern match the
 * incoming request, and returns its body.
 *
 * Path matching supports:
 *   - Exact segments:    /members
 *   - Numeric IDs:       /members/1  matches  /members/:id  or  /members/1
 *   - Named params:      /events/:id
 *   - Nested routes:     /member-journey/42/stage
 *
 * To select a specific example (when an endpoint has more than one), add the
 * header:
 *   x-mock-response-name: 200 - Membro completo (todas as 8 etapas - ID 12)
 *
 * Unmatched requests return 404 JSON with a list of available routes.
 */

import { NextRequest, NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"

// ---------------------------------------------------------------------------
// Postman collection types (only what we need)
// ---------------------------------------------------------------------------

interface PostmanUrl {
  raw?: string
  path?: string[]
}

interface PostmanRequest {
  method: string
  url?: PostmanUrl
}

interface PostmanResponse {
  id: string
  name: string
  code: number
  status?: string
  body?: string
  header?: Array<{ key: string; value: string }>
  originalRequest?: { method?: string; url?: PostmanUrl }
}

interface PostmanItem {
  name: string
  id?: string
  request?: PostmanRequest
  response?: PostmanResponse[]
  item?: PostmanItem[]
}

interface PostmanCollection {
  item: PostmanItem[]
}

// ---------------------------------------------------------------------------
// Load and flatten the collection once per process lifetime
// ---------------------------------------------------------------------------

interface FlatEndpoint {
  method: string
  /** Normalised path segments, e.g. ["member-journey", ":id", "stage"] */
  segments: string[]
  responses: PostmanResponse[]
}

let _endpoints: FlatEndpoint[] | null = null

function loadEndpoints(): FlatEndpoint[] {
  if (_endpoints) return _endpoints

  const collectionPath = join(
    process.cwd(),
    "postman",
    "collections",
    "Paz Church API.postman_collection.json"
  )

  let collection: PostmanCollection
  try {
    collection = JSON.parse(readFileSync(collectionPath, "utf-8"))
  } catch {
    console.error("[mock] Could not read Postman collection:", collectionPath)
    return []
  }

  const results: FlatEndpoint[] = []

  function walk(items: PostmanItem[]) {
    for (const item of items) {
      if (item.item) {
        walk(item.item)
        continue
      }
      if (!item.request?.url) continue

      const rawUrl = item.request.url.raw ?? ""
      // Extract path after {{base_url}} or after the first path-only portion
      const pathPart = rawUrl
        .replace(/\{\{[^}]+\}\}/, "") // strip {{base_url}}
        .split("?")[0]               // drop query string

      if (!pathPart) continue

      const segments = normalisePath(pathPart)
      results.push({
        method: item.request.method.toUpperCase(),
        segments,
        responses: item.response ?? [],
      })
    }
  }

  walk(collection.item)
  _endpoints = results
  return results
}

// ---------------------------------------------------------------------------
// Path utilities
// ---------------------------------------------------------------------------

/** Normalise a raw path like "/member-journey/42/stage" → ["member-journey","42","stage"] */
function normalisePath(raw: string): string[] {
  return raw.split("/").filter(Boolean)
}

/**
 * Returns true if the request segments match the endpoint pattern segments.
 * A pattern segment that is a named param (":foo") or looks like a numeric
 * placeholder ("42", "1", etc.) matches any incoming segment.
 */
function segmentsMatch(pattern: string[], incoming: string[]): boolean {
  if (pattern.length !== incoming.length) return false

  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i]
    const v = incoming[i]
    // Named param
    if (p.startsWith(":")) continue
    // Numeric wildcard in pattern (the collection uses literal IDs like "42", "1")
    if (/^\d+$/.test(p)) continue
    // Exact match
    if (p === v) continue
    return false
  }

  return true
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params
  const method = req.method.toUpperCase()
  const wantedName = req.headers.get("x-mock-response-name") ?? null

  const endpoints = loadEndpoints()

  // Find all endpoints whose method + path pattern match
  const matches = endpoints.filter(
    (e) => e.method === method && segmentsMatch(e.segments, path)
  )

  if (matches.length === 0) {
    // Return a helpful 404 listing available routes
    const available = endpoints.map(
      (e) => `${e.method} /${e.segments.join("/")}`
    )
    return NextResponse.json(
      {
        error: "Mock route not found",
        requested: `${method} /${path.join("/")}`,
        available_routes: Array.from(new Set(available)).sort(),
      },
      { status: 404 }
    )
  }

  // Use the first match (most specific wins — they're all equal here)
  const endpoint = matches[0]

  // Pick which example to return
  let example: PostmanResponse | undefined

  if (wantedName) {
    example = endpoint.responses.find((r) => r.name === wantedName)
  }

  if (!example) {
    // Default: first 2xx response
    example = endpoint.responses.find((r) => r.code >= 200 && r.code < 300)
  }

  if (!example) {
    return NextResponse.json(
      { error: "No mock response configured for this endpoint" },
      { status: 501 }
    )
  }

  const contentType =
    example.header?.find((h) => h.key.toLowerCase() === "content-type")
      ?.value ?? "application/json"

  const body = example.body ?? ""

  // Preserve the status code from the example
  return new NextResponse(body, {
    status: example.code,
    headers: {
      "Content-Type": contentType,
      "X-Mock-Example": example.name,
      "X-Mock-Endpoint": `${endpoint.method} /${endpoint.segments.join("/")}`,
    },
  })
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
