# Paz Church Admin UI

## Conventions

### API JSON Payloads — snake_case

All JSON payloads sent to and received from the backend API **must use snake_case** for property names.

TypeScript interfaces in `lib/api/types/` mirror the exact JSON shape — no transformation layer.

```typescript
// Correct
export interface Member {
  id: number
  life_group?: string
  birth_date: string
  membership_date: string
  created_at: string
  updated_at: string
}

// Wrong — do NOT use camelCase for API fields
export interface Member {
  id: number
  lifeGroup?: string
  birthDate: string
}
```

This applies to all request/response DTOs (`Create*Request`, `Update*Request`, etc.).

### Architecture

- **Types**: `lib/api/types/` — one file per domain, exported from `index.ts`
- **Endpoints**: `lib/api/endpoints/` — thin wrappers around `api.get/post/put/delete`
- **Hooks**: `lib/hooks/` — TanStack Query hooks with analytics tracking
- **Components**: `app/(dashboard)/` — one page per feature, `"use client"` management components
