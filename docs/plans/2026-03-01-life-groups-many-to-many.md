# Life Groups Many-to-Many Membership Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the single `lifeGroupId` FK on users with a `user_life_groups` join table, expose member-management endpoints on the life-groups API, and rebuild the admin-ui life groups page to use the real API with a full create/edit form.

**Architecture:** Backend migration drops the old FK and creates the join table; TypeORM `@ManyToMany` relations replace the old `@ManyToOne`; two new controller routes (`POST/DELETE /life-groups/:id/members/:userId`) manage membership. The admin-ui gets a new endpoint file, rewritten hooks, and a rebuilt management UI with a create/edit dialog containing all group fields.

**Tech Stack:** NestJS 11 · TypeORM · PostgreSQL · Next.js 15 App Router · TanStack Query 5 · shadcn/ui · React Hook Form + Zod

**Design doc:** `docs/plans/2026-03-01-life-groups-many-to-many-design.md`

---

## Task 1: Migration — drop `lifeGroupId`, create `user_life_groups`

**Files:**
- Create: `backend/database/migrations/1757250000019-LifeGroupsManyToMany.ts`

**Step 1: Create the migration file**

```typescript
// backend/database/migrations/1757250000019-LifeGroupsManyToMany.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class LifeGroupsManyToMany1757250000019 implements MigrationInterface {
  name = 'LifeGroupsManyToMany1757250000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop FK constraint and column from users
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP CONSTRAINT IF EXISTS "FK_users_life_group"
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "lifeGroupId"
    `);

    // 2. Create many-to-many join table
    await queryRunner.query(`
      CREATE TABLE "user_life_groups" (
        "user_id" integer NOT NULL,
        "life_group_id" integer NOT NULL,
        CONSTRAINT "PK_user_life_groups" PRIMARY KEY ("user_id", "life_group_id"),
        CONSTRAINT "FK_user_life_groups_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_life_groups_life_group"
          FOREIGN KEY ("life_group_id") REFERENCES "life_groups"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_life_groups_user" ON "user_life_groups" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_life_groups_life_group" ON "user_life_groups" ("life_group_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_user_life_groups_life_group"`);
    await queryRunner.query(`DROP INDEX "IDX_user_life_groups_user"`);
    await queryRunner.query(`DROP TABLE "user_life_groups"`);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "lifeGroupId" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD CONSTRAINT "FK_users_life_group"
        FOREIGN KEY ("lifeGroupId") REFERENCES "life_groups"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }
}
```

**Step 2: Run the migration**

```bash
cd backend && npm run migration:run
```

Expected output: `1 migrations are new migrations must be executed` → success message.

**Step 3: Commit**

```bash
cd backend && git add database/migrations/1757250000019-LifeGroupsManyToMany.ts
git commit -m "chore(db): replace lifeGroupId FK with user_life_groups join table"
```

---

## Task 2: Update `User` and `LifeGroup` entities

**Files:**
- Modify: `backend/src/users/entities/user.entity.ts`
- Modify: `backend/src/life-groups/entities/life-group.entity.ts`

**Step 1: Update `User` entity**

Replace the `@ManyToOne` life group relation with `@ManyToMany`:

```typescript
// Remove these lines:
@ManyToOne(() => LifeGroup, { nullable: true })
lifeGroup: LifeGroup | null;

// Replace with:
@ManyToMany(() => LifeGroup, (lifeGroup) => lifeGroup.users)
@JoinTable({
  name: 'user_life_groups',
  joinColumn: { name: 'user_id', referencedColumnName: 'id' },
  inverseJoinColumn: { name: 'life_group_id', referencedColumnName: 'id' },
})
lifeGroups: LifeGroup[];
```

Add `JoinTable` to the imports from `typeorm`.

**Step 2: Update `LifeGroup` entity**

Add the inverse side of the relation. Add `ManyToMany` and `User` import:

```typescript
import { ManyToMany, /* existing imports */ } from 'typeorm';
import { User } from '../../users/entities/user.entity';

// Add inside the class (after existing columns):
@ManyToMany(() => User, (user) => user.lifeGroups)
users: User[];
```

**Step 3: Verify the app still compiles**

```bash
cd backend && npm run build
```

Expected: build succeeds with no TypeScript errors.

**Step 4: Commit**

```bash
git add src/users/entities/user.entity.ts src/life-groups/entities/life-group.entity.ts
git commit -m "feat: update User and LifeGroup entities to ManyToMany"
```

---

## Task 3: Update `UsersService` — response shape + remove single-group assignment

**Files:**
- Modify: `backend/src/users/users.service.ts`
- Modify: `backend/src/users/dto/update-user.dto.ts`

**Step 1: Update `toResponse()` in `UsersService`**

Replace the single `life_group_id` / `life_group` fields:

```typescript
// Remove:
life_group_id: user.lifeGroup?.id ?? null,
life_group: user.lifeGroup
  ? { id: user.lifeGroup.id, name: user.lifeGroup.name }
  : null,

// Replace with:
life_group_ids: user.lifeGroups?.map((lg) => lg.id) ?? [],
life_groups: user.lifeGroups?.map((lg) => ({ id: lg.id, name: lg.name })) ?? [],
```

**Step 2: Update all relation loads from `lifeGroup` to `lifeGroups`**

In `findAll`, `findOne`, `findOneEntity`, `create`, and `update` — every place that reads:
```typescript
relations: ['sector', 'lifeGroup', 'completedCourses'],
```
change to:
```typescript
relations: ['sector', 'lifeGroups', 'completedCourses'],
```

**Step 3: Remove single-group assignment from `create()` and `update()`**

In `create()`, remove the entire block that resolves `lifeGroup` from `dto.lifeGroupId` and sets `user.lifeGroup = lifeGroup`. Life group membership is now managed exclusively via `/life-groups/:id/members/:userId`.

In `update()`, remove the `if (dto.lifeGroupId !== undefined)` block entirely.

Also remove the `LifeGroup` import from `users.service.ts` (no longer needed).

**Step 4: Update `UpdateUserDto` — remove `lifeGroupId` field**

```typescript
// Remove from UpdateUserDto:
@Expose({ name: 'life_group_id' })
@IsOptional()
@IsNumber()
lifeGroupId?: number;
```

**Step 5: Run backend tests**

```bash
cd backend && npm run test
```

Expected: all tests pass (or only pre-existing failures).

**Step 6: Commit**

```bash
git add src/users/users.service.ts src/users/dto/update-user.dto.ts
git commit -m "feat: update UsersService to emit life_group_ids array"
```

---

## Task 4: Add member methods to `LifeGroupsService`

**Files:**
- Modify: `backend/src/life-groups/life-groups.service.ts`

**Step 1: Update `toResponse()` to include members**

```typescript
private toResponse(lifeGroup: LifeGroup) {
  return {
    id: lifeGroup.id,
    name: lifeGroup.name,
    leader_id: lifeGroup.leader?.id ?? null,
    sector_id: lifeGroup.sector?.id ?? null,
    location: lifeGroup.location ?? null,
    meeting_day: lifeGroup.meetingDay ?? null,
    meeting_time: lifeGroup.meetingTime ?? null,
    member_count: lifeGroup.users?.length ?? 0,
    members: lifeGroup.users?.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email ?? '',
    })) ?? [],
    created_at: lifeGroup.createdAt,
    updated_at: lifeGroup.updatedAt,
  };
}
```

**Step 2: Update `findAll` and `findOne` to load `users` relation**

```typescript
// findAll — update find options:
const lifeGroups = await this.entityManager.find(LifeGroup, {
  relations: ['leader', 'sector', 'users'],
  order: { name: 'ASC' },
});

// findOne — update findOne options:
const lifeGroup = await this.entityManager.findOne(LifeGroup, {
  where: { id },
  relations: ['leader', 'sector', 'users'],
});

// findOneEntity — same:
const lifeGroup = await this.entityManager.findOne(LifeGroup, {
  where: { id },
  relations: ['leader', 'sector', 'users'],
});
```

**Step 3: Also load `users` in `create` and `update` reload queries**

After `this.entityManager.findOne(LifeGroup, { where: { id: saved.id }, relations: ['leader', 'sector'] })` in both `create()` and `update()`, add `'users'` to the relations array.

**Step 4: Add `addMember` and `removeMember` methods**

Add these two methods to the service class. Import `User` from the users entity:

```typescript
import { User } from '../users/entities/user.entity';

async addMember(lifeGroupId: number, userId: number): Promise<void> {
  const lifeGroup = await this.findOneEntity(lifeGroupId);
  const user = await this.entityManager.findOne(User, {
    where: { id: userId },
    relations: ['lifeGroups'],
  });
  if (!user) {
    throw new NotFoundException(`User with ID ${userId} not found`);
  }
  const alreadyMember = user.lifeGroups.some((lg) => lg.id === lifeGroupId);
  if (!alreadyMember) {
    user.lifeGroups.push(lifeGroup);
    await this.entityManager.save(User, user);
  }
}

async removeMember(lifeGroupId: number, userId: number): Promise<void> {
  const user = await this.entityManager.findOne(User, {
    where: { id: userId },
    relations: ['lifeGroups'],
  });
  if (!user) {
    throw new NotFoundException(`User with ID ${userId} not found`);
  }
  user.lifeGroups = user.lifeGroups.filter((lg) => lg.id !== lifeGroupId);
  await this.entityManager.save(User, user);
}
```

**Step 5: Run backend tests**

```bash
cd backend && npm run test
```

**Step 6: Commit**

```bash
git add src/life-groups/life-groups.service.ts
git commit -m "feat: add addMember/removeMember to LifeGroupsService"
```

---

## Task 5: Add member routes to `LifeGroupsController`

**Files:**
- Modify: `backend/src/life-groups/life-groups.controller.ts`

**Step 1: Add two new routes**

Add `HttpCode` and `HttpStatus` to existing imports (already present). Add `ParseIntPipe` if not already imported (already present).

```typescript
@Post(':id/members/:userId')
@HttpCode(HttpStatus.NO_CONTENT)
addMember(
  @Param('id', ParseIntPipe) id: number,
  @Param('userId', ParseIntPipe) userId: number,
) {
  return this.lifeGroupsService.addMember(id, userId);
}

@Delete(':id/members/:userId')
@HttpCode(HttpStatus.NO_CONTENT)
removeMember(
  @Param('id', ParseIntPipe) id: number,
  @Param('userId', ParseIntPipe) userId: number,
) {
  return this.lifeGroupsService.removeMember(id, userId);
}
```

**Step 2: Build to verify no TypeScript errors**

```bash
cd backend && npm run build
```

**Step 3: Smoke-test manually**

Start the backend and confirm existing life-groups routes still work:
```bash
npm run start:dev
# GET http://localhost:3001/api/life-groups → 200
```

**Step 4: Commit**

```bash
git add src/life-groups/life-groups.controller.ts
git commit -m "feat: add POST/DELETE /life-groups/:id/members/:userId routes"
```

---

## Task 6: Update admin-ui types

**Files:**
- Modify: `admin-ui/lib/api/types/life-groups.ts`
- Modify: `admin-ui/lib/api/types/users.ts`
- Modify: `admin-ui/lib/api/types/index.ts` (barrel — add new exports if needed)

**Step 1: Replace `lib/api/types/life-groups.ts` entirely**

```typescript
import type { AdminUser } from "./users"

export interface LifeGroupMember {
  id: number
  name: string
  email: string
}

export interface LifeGroup {
  id: number
  name: string
  location: string | null
  meeting_day: string | null
  meeting_time: string | null
  leader_id: number | null
  sector_id: number | null
  member_count: number
  members: LifeGroupMember[]
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

**Step 2: Update `AdminUser` in `lib/api/types/users.ts`**

Replace:
```typescript
life_group?: string
life_group_id?: number | null
```
With:
```typescript
life_group_ids: number[]
life_groups: { id: number; name: string }[]
```

In `CreateUserRequest` and `UpdateUserRequest`, remove `life_group` and `life_group_id`; add `life_group_ids?: number[]`.

**Step 3: Check the barrel export**

Open `admin-ui/lib/api/types/index.ts` and ensure `life-groups.ts` exports are re-exported. Add if missing:
```typescript
export * from "./life-groups"
```

**Step 4: Commit**

```bash
cd admin-ui
git add lib/api/types/life-groups.ts lib/api/types/users.ts lib/api/types/index.ts
git commit -m "feat: update LifeGroup and AdminUser types for many-to-many"
```

---

## Task 7: Create life-groups endpoint file and rewrite hooks

**Files:**
- Create: `admin-ui/lib/api/endpoints/life-groups.ts`
- Modify: `admin-ui/lib/hooks/use-life-groups.ts`

**Step 1: Create `lib/api/endpoints/life-groups.ts`**

```typescript
import { api } from "../client"
import type { LifeGroup, CreateLifeGroupRequest, UpdateLifeGroupRequest } from "../types"

export const lifeGroupsApi = {
  getAll: () => api.get<LifeGroup[]>("/life-groups"),

  create: (data: CreateLifeGroupRequest) =>
    api.post<LifeGroup>("/life-groups", data),

  update: (id: number, data: UpdateLifeGroupRequest) =>
    api.put<LifeGroup>(`/life-groups/${id}`, data),

  remove: (id: number) =>
    api.delete<void>(`/life-groups/${id}`),

  addMember: (id: number, userId: number) =>
    api.post<void>(`/life-groups/${id}/members/${userId}`),

  removeMember: (id: number, userId: number) =>
    api.delete<void>(`/life-groups/${id}/members/${userId}`),
}
```

**Step 2: Rewrite `lib/hooks/use-life-groups.ts`**

```typescript
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { lifeGroupsApi } from "@/lib/api/endpoints/life-groups"
import type { CreateLifeGroupRequest, UpdateLifeGroupRequest } from "@/lib/api/types"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = ["life-groups"]
const USERS_KEY = ["users"]

export function useLifeGroups() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => lifeGroupsApi.getAll(),
  })
}

export function useCreateLifeGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateLifeGroupRequest) => lifeGroupsApi.create(data),
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("life_group_created", { life_group_id: group.id })
    },
  })
}

export function useUpdateLifeGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateLifeGroupRequest }) =>
      lifeGroupsApi.update(id, data),
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("life_group_updated", { life_group_id: group.id })
    },
  })
}

export function useDeleteLifeGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => lifeGroupsApi.remove(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("life_group_deleted", { life_group_id: id })
    },
  })
}

export function useAddLifeGroupMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ lifeGroupId, userId }: { lifeGroupId: number; userId: number }) =>
      lifeGroupsApi.addMember(lifeGroupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: USERS_KEY })
    },
  })
}

export function useRemoveLifeGroupMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ lifeGroupId, userId }: { lifeGroupId: number; userId: number }) =>
      lifeGroupsApi.removeMember(lifeGroupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: USERS_KEY })
    },
  })
}
```

**Step 3: Commit**

```bash
git add lib/api/endpoints/life-groups.ts lib/hooks/use-life-groups.ts
git commit -m "feat: add life-groups API endpoint and rewrite hooks for real API"
```

---

## Task 8: Rebuild life-groups management UI

**Files:**
- Modify: `admin-ui/app/(dashboard)/life-groups/life-groups-management.tsx`

This is the largest task. Replace the file completely.

**Step 1: Write the new `life-groups-management.tsx`**

Key structural changes from the current file:
- `useLifeGroups()` now returns real `LifeGroup[]` with `id`, `location`, `meeting_day`, `meeting_time`, `leader_id`, `members[]`
- Replace `useUpdateUser` membership calls with `useAddLifeGroupMember` / `useRemoveLifeGroupMember`
- Add `useCreateLifeGroup`, `useUpdateLifeGroup`, `useDeleteLifeGroup`
- Add a Create/Edit dialog with all fields (name, location, meeting_day, meeting_time, leader picker, sector picker)
- The Manage Members dialog now reads `group.members` instead of scanning all users
- Add Location and Meeting columns to the table
- Add Edit and Delete to the dropdown

```typescript
"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  MoreHorizontal,
  Users2,
  User,
  BarChart3,
  UserPlus,
  UserMinus,
  Loader2,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import {
  useLifeGroups,
  useCreateLifeGroup,
  useUpdateLifeGroup,
  useDeleteLifeGroup,
  useAddLifeGroupMember,
  useRemoveLifeGroupMember,
} from "@/lib/hooks/use-life-groups"
import { useUsers } from "@/lib/hooks/use-users"
import { useSectors } from "@/lib/hooks/use-sectors"
import type { LifeGroup, CreateLifeGroupRequest } from "@/lib/api/types"
import type { AdminUser } from "@/lib/api/types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MEETING_DAYS = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
  "Sem dia fixo",
] as const

// ---------------------------------------------------------------------------
// LifeGroup form — used for both Create and Edit
// ---------------------------------------------------------------------------

interface LifeGroupFormData {
  name: string
  location: string
  meeting_day: string
  meeting_time: string
  leader_id: string   // string for select value; converted to number on submit
  sector_id: string
}

const EMPTY_FORM: LifeGroupFormData = {
  name: "",
  location: "",
  meeting_day: "",
  meeting_time: "",
  leader_id: "",
  sector_id: "",
}

function groupToForm(g: LifeGroup): LifeGroupFormData {
  return {
    name: g.name,
    location: g.location ?? "",
    meeting_day: g.meeting_day ?? "",
    meeting_time: g.meeting_time ?? "",
    leader_id: g.leader_id != null ? String(g.leader_id) : "",
    sector_id: g.sector_id != null ? String(g.sector_id) : "",
  }
}

function formToRequest(f: LifeGroupFormData): CreateLifeGroupRequest {
  return {
    name: f.name.trim(),
    location: f.location.trim() || null,
    meeting_day: f.meeting_day || null,
    meeting_time: f.meeting_time || null,
    leader_id: f.leader_id ? Number(f.leader_id) : null,
    sector_id: f.sector_id ? Number(f.sector_id) : null,
  }
}

// ---------------------------------------------------------------------------
// MemberItem sub-component
// ---------------------------------------------------------------------------

interface MemberItemProps {
  member: AdminUser
  isCurrentMember: boolean
  onAdd: (member: AdminUser) => void
  onRemove: (member: AdminUser) => void
  isPending: boolean
}

const MemberItem = ({ member, isCurrentMember, onAdd, onRemove, isPending }: MemberItemProps) => (
  <div
    className={`flex items-center justify-between p-3 rounded-lg border ${
      isCurrentMember ? "border-primary bg-primary/5" : "border-border"
    }`}
  >
    <div className="flex-1">
      <p className="text-sm font-medium">{member.name}</p>
      <p className="text-xs text-muted-foreground">{member.email}</p>
    </div>
    {isCurrentMember ? (
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => onRemove(member)}
        className="text-destructive hover:text-destructive"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserMinus className="h-4 w-4 mr-1" />Remover</>}
      </Button>
    ) : (
      <Button variant="outline" size="sm" disabled={isPending} onClick={() => onAdd(member)}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-1" />Adicionar</>}
      </Button>
    )}
  </div>
)

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LifeGroupsManagement() {
  const { data: lifeGroups = [], isLoading } = useLifeGroups()
  const { data: allUsers = [] } = useUsers()
  const { data: sectors = [] } = useSectors()

  const createLifeGroup = useCreateLifeGroup()
  const updateLifeGroup = useUpdateLifeGroup()
  const deleteLifeGroup = useDeleteLifeGroup()
  const addMember = useAddLifeGroupMember()
  const removeMember = useRemoveLifeGroupMember()

  // Group list state
  const [searchTerm, setSearchTerm] = useState("")

  // Create / Edit dialog state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<LifeGroup | null>(null)
  const [form, setForm] = useState<LifeGroupFormData>(EMPTY_FORM)

  // Members dialog state
  const [managingGroup, setManagingGroup] = useState<LifeGroup | null>(null)
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false)
  const [memberSearchTerm, setMemberSearchTerm] = useState("")
  const [pendingMemberId, setPendingMemberId] = useState<number | null>(null)

  // ----- derived stats -------------------------------------------------------

  const totalGroups = lifeGroups.length
  const totalMembers = allUsers.length
  const membersInAGroup = allUsers.filter((u) => u.life_group_ids?.length > 0).length
  const avgPerGroup = totalGroups > 0
    ? Math.round(lifeGroups.reduce((s, g) => s + g.member_count, 0) / totalGroups)
    : 0

  const filteredGroups = lifeGroups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ----- members dialog ------------------------------------------------------

  const currentGroupMemberIds = useMemo(
    () => new Set(managingGroup?.members.map((m) => m.id) ?? []),
    [managingGroup]
  )

  const filteredUsers = useMemo(
    () => allUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(memberSearchTerm.toLowerCase())
    ),
    [allUsers, memberSearchTerm]
  )

  const currentGroupMembers = filteredUsers.filter((u) => currentGroupMemberIds.has(u.id))
  const nonGroupMembers = filteredUsers.filter((u) => !currentGroupMemberIds.has(u.id))

  // ----- handlers ------------------------------------------------------------

  function openCreate() {
    setEditingGroup(null)
    setForm(EMPTY_FORM)
    setIsFormOpen(true)
  }

  function openEdit(group: LifeGroup) {
    setEditingGroup(group)
    setForm(groupToForm(group))
    setIsFormOpen(true)
  }

  function handleFormSubmit() {
    if (!form.name.trim()) return
    const request = formToRequest(form)

    if (editingGroup) {
      updateLifeGroup.mutate(
        { id: editingGroup.id, data: request },
        {
          onSuccess: () => {
            toast.success("Grupo atualizado")
            setIsFormOpen(false)
          },
          onError: () => toast.error("Erro ao atualizar grupo"),
        }
      )
    } else {
      createLifeGroup.mutate(request, {
        onSuccess: (newGroup) => {
          toast.success("Grupo criado")
          setIsFormOpen(false)
          // Immediately open member management for the new group
          setManagingGroup(newGroup)
          setMemberSearchTerm("")
          setIsMembersDialogOpen(true)
        },
        onError: () => toast.error("Erro ao criar grupo"),
      })
    }
  }

  function handleDelete(group: LifeGroup) {
    deleteLifeGroup.mutate(group.id, {
      onSuccess: () => toast.success(`"${group.name}" excluído`),
      onError: () => toast.error("Erro ao excluir grupo"),
    })
  }

  function handleManageMembers(group: LifeGroup) {
    setManagingGroup(group)
    setMemberSearchTerm("")
    setIsMembersDialogOpen(true)
  }

  function handleAddMember(member: AdminUser) {
    if (!managingGroup) return
    setPendingMemberId(member.id)
    addMember.mutate(
      { lifeGroupId: managingGroup.id, userId: member.id },
      {
        onSuccess: () => {
          toast.success(`${member.name} adicionado ao grupo`)
          setPendingMemberId(null)
        },
        onError: () => {
          toast.error("Erro ao adicionar membro")
          setPendingMemberId(null)
        },
      }
    )
  }

  function handleRemoveMember(member: AdminUser) {
    if (!managingGroup) return
    setPendingMemberId(member.id)
    removeMember.mutate(
      { lifeGroupId: managingGroup.id, userId: member.id },
      {
        onSuccess: () => {
          toast.success(`${member.name} removido do grupo`)
          setPendingMemberId(null)
        },
        onError: () => {
          toast.error("Erro ao remover membro")
          setPendingMemberId(null)
        },
      }
    )
  }

  const isFormPending = createLifeGroup.isPending || updateLifeGroup.isPending

  // ----- loading state -------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Life Groups</h1>
        <p className="text-muted-foreground">Gerencie os grupos de vida da igreja</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Grupos</CardTitle>
            <Users2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGroups}</div>
            <p className="text-xs text-muted-foreground">grupos ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membros em Grupos</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{membersInAGroup}</div>
            <p className="text-xs text-muted-foreground">de {totalMembers} membros</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Grupo</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPerGroup}</div>
            <p className="text-xs text-muted-foreground">membros por grupo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem Grupo</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers - membersInAGroup}</div>
            <p className="text-xs text-muted-foreground">membros não alocados</p>
          </CardContent>
        </Card>
      </div>

      {/* Groups table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Life Groups</CardTitle>
              <CardDescription>{filteredGroups.length} grupo(s) encontrado(s)</CardDescription>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Grupo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar grupos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm
                ? `Nenhum grupo encontrado para "${searchTerm}"`
                : "Nenhum grupo cadastrado. Crie o primeiro grupo clicando em \"Novo Grupo\"."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Reunião</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead className="w-[70px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <p className="font-medium">{group.name}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">{group.location ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      {group.meeting_day || group.meeting_time ? (
                        <div className="text-sm">
                          {group.meeting_day && <p>{group.meeting_day}</p>}
                          {group.meeting_time && (
                            <p className="text-muted-foreground">{group.meeting_time}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{group.member_count} membro(s)</p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {group.members.slice(0, 3).map((m) => m.name).join(", ")}
                        {group.member_count > 3 && ` +${group.member_count - 3} outros`}
                      </p>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleManageMembers(group)}>
                            <Users2 className="mr-2 h-4 w-4" />
                            Gerenciar Membros
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(group)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(group)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Editar Life Group" : "Novo Life Group"}</DialogTitle>
            <DialogDescription>
              {editingGroup
                ? "Atualize os dados do grupo."
                : "Preencha os dados do novo grupo. Você poderá adicionar membros em seguida."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="lg-name">Nome *</Label>
              <Input
                id="lg-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Grupo da Quarta"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="lg-location">Local</Label>
              <Input
                id="lg-location"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Ex: Rua das Flores, 123"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Dia da Reunião</Label>
                <Select
                  value={form.meeting_day}
                  onValueChange={(v) => setForm((f) => ({ ...f, meeting_day: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MEETING_DAYS.map((day) => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="lg-time">Horário</Label>
                <Input
                  id="lg-time"
                  type="time"
                  value={form.meeting_time}
                  onChange={(e) => setForm((f) => ({ ...f, meeting_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Líder</Label>
              <Select
                value={form.leader_id}
                onValueChange={(v) => setForm((f) => ({ ...f, leader_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um líder..." />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Setor</Label>
              <Select
                value={form.sector_id}
                onValueChange={(v) => setForm((f) => ({ ...f, sector_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um setor..." />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleFormSubmit} disabled={!form.name.trim() || isFormPending}>
              {isFormPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingGroup ? "Salvar" : "Criar e Adicionar Membros"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Gerenciar Membros — {managingGroup?.name}</DialogTitle>
            <DialogDescription>
              Adicione ou remova membros deste grupo. As alterações são aplicadas imediatamente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-[50vh] space-y-4 pr-1">
            {currentGroupMembers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users2 className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold text-primary">
                    Membros do Grupo ({currentGroupMembers.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {currentGroupMembers.map((member) => (
                    <MemberItem
                      key={member.id}
                      member={member}
                      isCurrentMember={true}
                      onAdd={handleAddMember}
                      onRemove={handleRemoveMember}
                      isPending={pendingMemberId === member.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {currentGroupMembers.length > 0 && nonGroupMembers.length > 0 && (
              <div className="border-t border-border" />
            )}

            {nonGroupMembers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    Outros Membros ({nonGroupMembers.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {nonGroupMembers.map((member) => (
                    <MemberItem
                      key={member.id}
                      member={member}
                      isCurrentMember={false}
                      onAdd={handleAddMember}
                      onRemove={handleRemoveMember}
                      isPending={pendingMemberId === member.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {currentGroupMembers.length === 0 && nonGroupMembers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum membro encontrado para &quot;{memberSearchTerm}&quot;
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMembersDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

**Step 2: Check for TypeScript errors**

```bash
cd admin-ui && npm run lint
```

Fix any import or type errors reported.

**Step 3: Commit**

```bash
git add app/(dashboard)/life-groups/life-groups-management.tsx
git commit -m "feat: rebuild life-groups management UI with real API and full create/edit form"
```

---

## Task 9: Check for usages of old `life_group` / `life_group_id` fields across admin-ui

**Files:** Any file in `admin-ui/` that references the old fields

**Step 1: Search for stale references**

```bash
cd admin-ui && grep -r "life_group_id\|\.life_group[^s_]" --include="*.tsx" --include="*.ts" -l
```

**Step 2: Update each found file**

For each file, replace single `life_group_id` with `life_group_ids[0] ?? null` (or remove if the field is only used for display in life-groups page) and `life_group` string with `life_groups[0]?.name ?? null` for display-only cases.

**Step 3: Commit**

```bash
git add -p
git commit -m "fix: update stale life_group references to life_group_ids / life_groups"
```

---

## Final verification

```bash
# Backend: all tests pass
cd backend && npm run test

# Backend: full build clean
npm run build

# Admin-ui: lint clean
cd admin-ui && npm run lint

# Manual: start full stack and test the flow end-to-end
cd .. && npm run dev
# 1. Create a new life group with all fields filled
# 2. Add two members to it
# 3. Verify members appear in the group row
# 4. Edit the group name
# 5. Remove a member
# 6. Delete the group
# 7. Verify the users page still loads correctly
```
