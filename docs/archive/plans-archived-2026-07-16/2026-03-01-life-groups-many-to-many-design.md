# Life Groups — Many-to-Many Membership Design

**Date:** 2026-03-01
**Status:** Approved
**Scope:** Backend (migration + API) + Admin-UI (types, hooks, UI)

---

## Problem

The current system models life group membership as a single FK (`users.lifeGroupId → life_groups.id`), preventing a user from attending more than one group. The admin-ui is also disconnected from the real `/api/life-groups` API — it derives groups from a deprecated string field on users.

## Decision

Replace the single FK with a `user_life_groups` join table (many-to-many, equal memberships — no primary group concept). Fully connect the admin-ui to the real `/api/life-groups` REST API.

---

## Section 1 — Database & Backend

### Migration

- Drop `users.lifeGroupId` FK column
- Create `user_life_groups` join table:
  - `user_id` INTEGER FK → `users.id` ON DELETE CASCADE
  - `life_group_id` INTEGER FK → `life_groups.id` ON DELETE CASCADE
  - Composite PK `(user_id, life_group_id)`

### Entity Changes

**`User` entity:**
- Remove `@ManyToOne(() => LifeGroup) lifeGroup: LifeGroup | null`
- Add `@ManyToMany(() => LifeGroup) @JoinTable({ name: 'user_life_groups', joinColumn: { name: 'user_id' }, inverseJoinColumn: { name: 'life_group_id' } }) lifeGroups: LifeGroup[]`

**`LifeGroup` entity:**
- Add inverse side: `@ManyToMany(() => User, (u) => u.lifeGroups) users: User[]`

### UsersService

- Load `lifeGroups` relation (plural) in all find/findOne queries
- `toResponse()` emits:
  - `life_group_ids: number[]`
  - `life_groups: { id: number; name: string }[]`
- `update()` removes the `lifeGroupId` single-assignment logic (life group membership is managed exclusively via the life-groups member endpoints)

### LifeGroupsService — new member methods

```
addMember(lifeGroupId: number, userId: number): Promise<void>
removeMember(lifeGroupId: number, userId: number): Promise<void>
```

- `findAll` / `findOne` load the `users` relation and include `member_count` + `members: [{ id, name, email }]` in the response

### LifeGroupsController — new routes

```
POST   /api/life-groups/:id/members/:userId
DELETE /api/life-groups/:id/members/:userId
```

Both protected by `AuthGuard('jwt')`.

---

## Section 2 — Admin-UI API Layer

### `lib/api/types/life-groups.ts`

```typescript
export interface LifeGroup {
  id: number
  name: string
  location: string | null
  meeting_day: string | null
  meeting_time: string | null
  leader_id: number | null
  sector_id: number | null
  member_count: number
  members: { id: number; name: string; email: string }[]
  created_at: string
  updated_at: string
}

export interface CreateLifeGroupRequest {
  name: string
  location?: string | null
  meeting_day?: string | null
  meeting_time?: string | null
  leader_id?: number | null
  sector_id?: number | null
}

export type UpdateLifeGroupRequest = Partial<CreateLifeGroupRequest>
```

### `lib/api/types/users.ts` — `AdminUser` update

Replace single `life_group_id / life_group` fields with:
```typescript
life_group_ids: number[]
life_groups: { id: number; name: string }[]
```

Same change in `CreateUserRequest` and `UpdateUserRequest` (remove `life_group_id`, add `life_group_ids`).

### `lib/api/endpoints/life-groups.ts` (new file)

```typescript
export const lifeGroupsApi = {
  getAll:       ()                             => api.get<LifeGroup[]>('/life-groups'),
  create:       (data: CreateLifeGroupRequest) => api.post<LifeGroup>('/life-groups', data),
  update:       (id: number, data: UpdateLifeGroupRequest) => api.put<LifeGroup>(`/life-groups/${id}`, data),
  remove:       (id: number)                   => api.delete(`/life-groups/${id}`),
  addMember:    (id: number, userId: number)   => api.post(`/life-groups/${id}/members/${userId}`),
  removeMember: (id: number, userId: number)   => api.delete(`/life-groups/${id}/members/${userId}`),
}
```

### `lib/hooks/use-life-groups.ts` (rewrite)

| Hook | Type | Query key | Side effects |
|---|---|---|---|
| `useLifeGroups()` | query | `["life-groups"]` | — |
| `useCreateLifeGroup()` | mutation | — | invalidate `["life-groups"]` |
| `useUpdateLifeGroup()` | mutation | — | invalidate `["life-groups"]` |
| `useDeleteLifeGroup()` | mutation | — | invalidate `["life-groups"]` |
| `useAddLifeGroupMember(lifeGroupId)` | mutation | — | invalidate `["life-groups"]`, `["users"]` |
| `useRemoveLifeGroupMember(lifeGroupId)` | mutation | — | invalidate `["life-groups"]`, `["users"]` |

---

## Section 3 — Admin-UI Life Groups Management UI

### Groups Table

Columns: **Grupo** · **Local** · **Reunião** (day + time) · **Líder** · **Membros** · **Ações**

Dropdown actions per row: **Editar** · **Gerenciar Membros** · **Excluir**

### Create Life Group Dialog ("Novo Grupo" button)

Fields:
- `name` — text input, required
- `location` — text input, optional
- `meeting_day` — select (Segunda–Domingo + "Sem dia fixo"), optional
- `meeting_time` — time input, optional
- `leader_id` — searchable user picker (from `useUsers()`), optional
- `sector_id` — select from `useSectors()`, optional

On submit: `POST /api/life-groups` → on success, immediately opens Manage Members dialog for the new group.

### Edit Life Group Dialog

Same form as Create, pre-populated from the selected group. On submit: `PUT /api/life-groups/:id`.

### Manage Members Dialog

- Current members sourced from `lifeGroup.members[]` (no full-user scan)
- Add: calls `POST /api/life-groups/:id/members/:userId`
- Remove: calls `DELETE /api/life-groups/:id/members/:userId`
- Both mutations invalidate `["life-groups"]` and `["users"]`

### Delete

Dropdown action → calls `DELETE /api/life-groups/:id` → success toast.
