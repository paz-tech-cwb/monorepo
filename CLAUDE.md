# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Admin dashboard for Paz Church Curitiba, built with **Next.js 15** (App Router), **React 19**, **TypeScript 5**, and **shadcn/ui**.

## Tech Stack

| Layer          | Technology                                              |
| -------------- | ------------------------------------------------------- |
| Framework      | Next.js 15.2.4 (App Router)                             |
| UI             | shadcn/ui (New York style) + Radix UI + Tailwind CSS 4  |
| State / Data   | TanStack Query 5 (React Query)                          |
| Forms          | React Hook Form 7 + Zod 3                               |
| Auth           | Firebase Auth (Google & Apple OAuth)                     |
| Analytics      | Firebase Analytics                                      |
| HTTP           | Custom fetch wrapper (`lib/api/client.ts`)               |
| Charts         | Recharts                                                |
| Icons          | Lucide React                                            |
| Dates          | date-fns 4                                              |
| Toasts         | Sonner                                                  |
| Markdown       | React Markdown + remark-gfm                             |

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build (TS/ESLint errors ignored in next.config)
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Project Structure

```
app/
├── page.tsx                        # Login page (root route)
├── layout.tsx                      # Root layout (providers)
├── globals.css                     # Tailwind theme (OKLCH CSS vars)
├── auth/login-form.tsx             # Social login component
└── (dashboard)/                    # Route group — protected pages
    ├── layout.tsx                  # Sidebar + dashboard shell
    ├── dashboard/                  # Home / stats
    ├── users/                      # Admin user management
    ├── members/                    # Church member directory
    ├── life-groups/                # Small groups
    ├── events/                     # Event management
    ├── calendar/                   # Calendar view
    ├── courses/                    # Course library
    ├── course-tracks/              # Learning paths
    ├── announcements/              # News / banners
    ├── contributions/              # Financial / donations
    ├── notifications/              # Push notifications
    └── church-data/                # Church settings

components/
├── ui/                             # shadcn/ui primitives (~70 components)
├── sidebar.tsx                     # Navigation sidebar (memoized)
├── theme-provider.tsx              # Light/dark theme
└── markdown-editor.tsx             # Markdown editor

lib/
├── api/
│   ├── client.ts                   # Fetch wrapper with token refresh
│   ├── config.ts                   # Zod-validated env config
│   ├── types/                      # Domain interfaces (snake_case)
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── announcements.ts
│   │   ├── contributions.ts
│   │   ├── courses.ts
│   │   ├── agenda.ts
│   │   ├── notifications.ts
│   │   ├── dashboard.ts
│   │   └── index.ts                # Barrel export
│   └── endpoints/                  # Thin API wrappers
│       ├── auth.ts
│       ├── users.ts
│       ├── announcements.ts
│       ├── contributions.ts
│       ├── courses.ts
│       ├── academy.ts
│       ├── agenda.ts
│       ├── dashboard.ts
│       ├── notifications.ts
│       └── home.ts
├── hooks/                          # TanStack Query hooks
│   ├── use-auth.ts
│   ├── use-users.ts
│   ├── use-announcements.ts
│   ├── use-contributions.ts
│   ├── use-courses.ts
│   ├── use-agenda.ts
│   ├── use-notifications.ts
│   ├── use-dashboard.ts
│   └── use-analytics.ts
├── firebase/
│   ├── config.ts                   # Firebase init
│   ├── auth.ts                     # Google/Apple OAuth
│   └── analytics.ts                # Event tracking
├── utils.ts                        # cn() — clsx + tailwind-merge
└── utils/cep.ts                    # Postal code helper

contexts/auth-context.tsx            # Auth state & session management
providers/
├── query-provider.tsx               # QueryClient (staleTime 60s, retry 1)
└── analytics-provider.tsx           # Page-view tracking
middleware.ts                        # Route protection (cookie-based)
```

## Conventions

### API JSON Payloads — snake_case at the transport layer

`snake_case` is the **API JSON transport convention only** — it is the wire format agreed between backend and clients.

TypeScript interfaces in `lib/api/types/` mirror the exact JSON shape with no transformation layer. This means `snake_case` keys flow from the API types directly into component code (form state, table cells, etc.).

```typescript
// Correct — mirrors the API JSON shape
export interface AdminUser {
  id: number
  life_group?: string
  birth_date: string
  membership_date: string
  created_at: string
  updated_at: string
}

// Wrong — do NOT use camelCase for API types; there is no transform layer
export interface AdminUser {
  id: number
  lifeGroup?: string
  birthDate: string
}
```

This applies to all request/response types (`Create*Request`, `Update*Request`, etc.).

**Do NOT add a camelCase↔snake_case transformation layer** (e.g., axios interceptors that rename keys). The backend is responsible for emitting snake_case JSON; the admin-ui consumes it as-is.

### Three-Tier API Architecture

Every new backend feature follows this pattern:

1. **Types** (`lib/api/types/<domain>.ts`) — interfaces matching the API JSON shape, exported from `index.ts`
2. **Endpoints** (`lib/api/endpoints/<domain>.ts`) — thin wrappers calling `api.get/post/put/patch/delete`
3. **Hooks** (`lib/hooks/use-<domain>.ts`) — TanStack Query hooks with analytics tracking via `trackEvent`

```typescript
// 1. Type — lib/api/types/users.ts
export interface AdminUser { id: number; name: string; role: UserRole; /* ... */ }
export interface CreateUserRequest { name: string; email: string; /* ... */ }

// 2. Endpoint — lib/api/endpoints/users.ts
export const usersApi = {
  getAll: () => api.get<AdminUser[]>("/users"),
  create: (data: CreateUserRequest) => api.post<AdminUser>("/users", data),
}

// 3. Hook — lib/hooks/use-users.ts
export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: () => usersApi.getAll() })
}
export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUserRequest) => usersApi.create(data),
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: ["users"] })
      trackEvent("user_created", { user_id: user.id })
    },
  })
}
```

### Dashboard Page Pattern

Each feature page follows a two-file pattern:

- **`page.tsx`** — server component that imports the client management component
- **`<feature>-management.tsx`** — `"use client"` component with data fetching (hooks), forms, and CRUD UI

### Naming Conventions

| What                | Convention                     | Example                       |
| ------------------- | ------------------------------ | ----------------------------- |
| Type files          | Singular domain name           | `users.ts`, `agenda.ts`       |
| Request DTOs        | `Create<Entity>Request`        | `CreateUserRequest`           |
| Response DTOs       | `Update<Entity>Request`        | `UpdateUserRequest`           |
| Endpoint objects    | `<entity>Api`                  | `usersApi`, `coursesApi`      |
| Query hooks         | `use<Entity>()`                | `useUsers()`, `useUser(id)`   |
| Mutation hooks      | `use<Action><Entity>()`        | `useCreateUser()`             |
| Query keys          | `["<entity>"]`                 | `["users"]`, `["courses"]`    |
| Management files    | `<feature>-management.tsx`     | `users-management.tsx`        |
| Route directories   | kebab-case                     | `life-groups/`, `course-tracks/` |

### Styling

- **Tailwind CSS 4** with OKLCH CSS custom properties defined in `globals.css`
- **shadcn/ui** "New York" style — components in `components/ui/`
- **Dark mode** supported via `next-themes` (`.dark` class strategy)
- Use `cn()` from `@/lib/utils` for conditional class merging

### Path Aliases

Configured in `tsconfig.json`:

```
@/* → ./*
```

## Authentication Flow

1. User signs in via **Firebase Auth** (Google or Apple popup)
2. Firebase ID token is exchanged with the backend for **access + refresh tokens**
3. Tokens stored in **localStorage** (persistence) + **memory** (SSR safety)
4. A lightweight `auth_session` cookie is set so **Next.js middleware** can gate routes
5. On 401, the API client automatically **refreshes the token** (mutex-protected) and retries
6. On logout: all tokens cleared, Firebase sign-out, backend `/auth/logout` called

## Environment Variables

```bash
# API (required)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_API_MOCK_ENABLED=false

# Firebase (required)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

## TanStack Query Defaults

```typescript
queries:   { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false }
mutations: { retry: 0 }
```

DevTools enabled in development.

## User Roles

```typescript
type UserRole = "admin" | "pastor" | "supervisor" | "lg-leader" | "member"
```
