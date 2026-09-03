# shadcn/UI Component Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every raw HTML element with its shadcn/UI equivalent and ensure every installed shadcn component is used at least once in a meaningful location across the admin dashboard.

**Architecture:** Build two shared wrapper components first (`<FormDrawer>` and `<ConfirmDeleteDialog>`), then migrate all 13 management pages to use them. Complex forms (3+ fields) get a right-side `Drawer`; simple forms (1–2 fields) keep `Dialog`. Raw `<select>`, `<button>`, `<input>`, and `<input type="checkbox">` elements are replaced with shadcn equivalents. New components (Tabs, Badge, Avatar, Switch, Collapsible, Separator, Checkbox) are added where they genuinely improve UX.

**Tech Stack:** Next.js 15, React 19, TypeScript, shadcn/ui (New York), Tailwind CSS 4, vaul (Drawer), TanStack Query, Lucide React

---

## File Map

### New files
- `components/ui/form-drawer.tsx` — right-side Drawer wrapper used by all complex forms
- `components/ui/confirm-delete-dialog.tsx` — AlertDialog wrapper for all delete confirmations

### Modified files (in order)
- `app/(dashboard)/announcements/announcements-management.tsx`
- `app/(dashboard)/areas/areas-management.tsx`
- `app/(dashboard)/calendar/calendar-management.tsx`
- `app/(dashboard)/church-data/church-data-management.tsx`
- `app/(dashboard)/contributions/contributions-management.tsx`
- `app/(dashboard)/courses/courses-management.tsx`
- `app/(dashboard)/events/events-management.tsx`
- `app/(dashboard)/life-groups/life-groups-management.tsx`
- `app/(dashboard)/member-journey/member-journey-management.tsx`
- `app/(dashboard)/members/members-management.tsx`
- `app/(dashboard)/members/journey-sheet.tsx`
- `app/(dashboard)/notifications/notification-system.tsx`
- `app/(dashboard)/sectors/sectors-management.tsx`
- `app/(dashboard)/users/users-management.tsx`
- `app/(dashboard)/formularios/member-registrations/new/member-registrations-form.tsx`
- `app/(dashboard)/formularios/multiplications/new/multiplications-form.tsx`

---

## Task 1: Build `<FormDrawer>` wrapper

**Files:**
- Create: `components/ui/form-drawer.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/ui/form-drawer.tsx
"use client"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

interface FormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  isLoading?: boolean
  onSubmit: () => void
  submitLabel?: string
  children: React.ReactNode
}

export function FormDrawer({
  open,
  onOpenChange,
  title,
  description,
  isLoading = false,
  onSubmit,
  submitLabel = "Salvar",
  children,
}: FormDrawerProps) {
  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px]">
        <DrawerHeader className="border-b p-4">
          <DrawerTitle>{title}</DrawerTitle>
          {description && (
            <DrawerDescription>{description}</DrawerDescription>
          )}
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        <DrawerFooter className="border-t p-4">
          <div className="flex justify-end gap-2">
            <DrawerClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DrawerClose>
            <Button onClick={onSubmit} disabled={isLoading}>
              {isLoading ? "Salvando..." : submitLabel}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
cd /Users/jonathalima/Developer/church/admin-ui
npm run build 2>&1 | tail -20
```

Expected: No TypeScript errors on the new file.

- [ ] **Step 3: Commit**

```bash
git add components/ui/form-drawer.tsx
git commit -m "feat: add FormDrawer shared wrapper component"
```

---

## Task 2: Build `<ConfirmDeleteDialog>` wrapper

**Files:**
- Create: `components/ui/confirm-delete-dialog.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/ui/confirm-delete-dialog.tsx
"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityName: string
  onConfirm: () => void
  isLoading?: boolean
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  entityName,
  onConfirm,
  isLoading = false,
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Excluir {entityName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. {entityName} será removido(a)
            permanentemente do sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/confirm-delete-dialog.tsx
git commit -m "feat: add ConfirmDeleteDialog shared wrapper component"
```

---

## Task 3: Migrate Announcements — Dialog → Drawer + Badge + Switch + Separator

**Files:**
- Modify: `app/(dashboard)/announcements/announcements-management.tsx`

- [ ] **Step 1: Replace imports**

Remove all `Dialog*`, `AlertDialog*` imports. Add `FormDrawer`, `ConfirmDeleteDialog`, `Badge`, `Switch`, `Separator`:

```tsx
import { FormDrawer } from "@/components/ui/form-drawer"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
```

- [ ] **Step 2: Add `is_active` to form state**

```tsx
const [formData, setFormData] = useState<CreateAnnouncementRequest>({
  title: "",
  subtitle: "",
  image_url: "",
  markdown_content: "",
  action_url: "",
  is_active: true,
})
```

- [ ] **Step 3: Replace the Add Dialog with FormDrawer**

Replace:
```tsx
<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
  <DialogTrigger asChild>
    <Button>...</Button>
  </DialogTrigger>
  <DialogContent ...>
    ...
  </DialogContent>
</Dialog>
```

With — the Button trigger stays outside the FormDrawer (click sets `isAddDialogOpen(true)`), and FormDrawer is rendered separately:

```tsx
<Button onClick={() => setIsAddDialogOpen(true)}>
  <Plus className="mr-2 h-4 w-4" />
  Criar Aviso
</Button>

{/* Add drawer */}
<FormDrawer
  open={isAddDialogOpen}
  onOpenChange={setIsAddDialogOpen}
  title="Criar Novo Aviso"
  description="Preencha os dados do aviso"
  isLoading={createMutation.isPending}
  onSubmit={handleAddAnnouncement}
  submitLabel="Criar Aviso"
>
  <div className="grid gap-4">
    <div className="space-y-1.5">
      <Label htmlFor="title">Título</Label>
      <Input
        id="title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Título do aviso"
      />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="subtitle">Subtítulo</Label>
      <Input
        id="subtitle"
        value={formData.subtitle}
        onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
        placeholder="Subtítulo do aviso"
      />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="image_url">URL da Imagem</Label>
      <Input
        id="image_url"
        value={formData.image_url}
        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
        placeholder="https://exemplo.com/imagem.jpg"
      />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="action_url">URL de Ação (opcional)</Label>
      <Input
        id="action_url"
        value={formData.action_url}
        onChange={(e) => setFormData({ ...formData, action_url: e.target.value })}
        placeholder="https://exemplo.com/acao"
      />
    </div>
    <Separator />
    <div className="space-y-1.5">
      <Label>Conteúdo (Markdown)</Label>
      <MarkdownEditor
        value={formData.markdown_content}
        onChange={(value) => setFormData({ ...formData, markdown_content: value })}
        placeholder="Conteúdo do aviso em Markdown"
      />
    </div>
    <Separator />
    <div className="flex items-center justify-between">
      <Label htmlFor="is_active">Aviso ativo</Label>
      <Switch
        id="is_active"
        checked={formData.is_active ?? true}
        onCheckedChange={(checked) =>
          setFormData({ ...formData, is_active: checked })
        }
      />
    </div>
  </div>
</FormDrawer>
```

- [ ] **Step 4: Replace the Edit Dialog with FormDrawer**

Replace the `<Dialog open={!!editingAnnouncement} ...>` block with:

```tsx
<FormDrawer
  open={!!editingAnnouncement}
  onOpenChange={() => { setEditingAnnouncement(null); resetForm() }}
  title="Editar Aviso"
  description="Atualize os dados do aviso"
  isLoading={updateMutation.isPending}
  onSubmit={handleUpdateAnnouncement}
  submitLabel="Salvar"
>
  {/* same fields as add, using formData state */}
  <div className="grid gap-4">
    <div className="space-y-1.5">
      <Label htmlFor="edit-title">Título</Label>
      <Input
        id="edit-title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Título do aviso"
      />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="edit-subtitle">Subtítulo</Label>
      <Input
        id="edit-subtitle"
        value={formData.subtitle}
        onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
        placeholder="Subtítulo do aviso"
      />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="edit-image_url">URL da Imagem</Label>
      <Input
        id="edit-image_url"
        value={formData.image_url}
        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
        placeholder="https://exemplo.com/imagem.jpg"
      />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="edit-action_url">URL de Ação (opcional)</Label>
      <Input
        id="edit-action_url"
        value={formData.action_url}
        onChange={(e) => setFormData({ ...formData, action_url: e.target.value })}
        placeholder="https://exemplo.com/acao"
      />
    </div>
    <Separator />
    <div className="space-y-1.5">
      <Label>Conteúdo (Markdown)</Label>
      <MarkdownEditor
        value={formData.markdown_content}
        onChange={(value) => setFormData({ ...formData, markdown_content: value })}
        placeholder="Conteúdo do aviso em Markdown"
      />
    </div>
    <Separator />
    <div className="flex items-center justify-between">
      <Label htmlFor="edit-is_active">Aviso ativo</Label>
      <Switch
        id="edit-is_active"
        checked={formData.is_active ?? true}
        onCheckedChange={(checked) =>
          setFormData({ ...formData, is_active: checked })
        }
      />
    </div>
  </div>
</FormDrawer>
```

- [ ] **Step 5: Replace the Delete AlertDialog with ConfirmDeleteDialog**

Replace the existing `<AlertDialog open={deletingAnnouncementId !== null} ...>` block with:

```tsx
<ConfirmDeleteDialog
  open={deletingAnnouncementId !== null}
  onOpenChange={(open) => { if (!open) setDeletingAnnouncementId(null) }}
  entityName="este aviso"
  onConfirm={() => {
    if (deletingAnnouncementId !== null) handleDeleteAnnouncement(deletingAnnouncementId)
  }}
  isLoading={deleteMutation.isPending}
/>
```

- [ ] **Step 6: Add Badge to table rows**

In the `filteredAnnouncements.map(...)` table rows, replace the plain "Sim"/"Não" text with Badge:

```tsx
<TableCell>
  {announcement.image_url ? (
    <Badge variant="secondary">Com imagem</Badge>
  ) : (
    <Badge variant="outline">Sem imagem</Badge>
  )}
</TableCell>
```

- [ ] **Step 7: Verify the build compiles**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 8: Commit**

```bash
git add app/\(dashboard\)/announcements/announcements-management.tsx
git commit -m "feat(announcements): migrate to FormDrawer + Badge + Switch + Separator"
```

---

## Task 4: Migrate Areas — verify Dialog, add ConfirmDeleteDialog

**Files:**
- Modify: `app/(dashboard)/areas/areas-management.tsx`

- [ ] **Step 1: Replace AlertDialog import with ConfirmDeleteDialog**

```tsx
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Badge } from "@/components/ui/badge"
```

Remove `AlertDialog*` imports.

- [ ] **Step 2: Replace the Delete AlertDialog block**

```tsx
<ConfirmDeleteDialog
  open={deletingAreaId !== null}
  onOpenChange={(open) => { if (!open) setDeletingAreaId(null) }}
  entityName="esta área"
  onConfirm={() => { if (deletingAreaId !== null) handleDelete(deletingAreaId) }}
  isLoading={deleteMutation.isPending}
/>
```

- [ ] **Step 3: Add Badge for area ID in table**

In the table row, wrap the ID cell:

```tsx
<TableCell>
  <Badge variant="outline">#{area.id}</Badge>
</TableCell>
```

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/areas/areas-management.tsx
git commit -m "feat(areas): use ConfirmDeleteDialog + Badge"
```

---

## Task 5: Migrate Calendar — Dialog → Drawer + Select + Badge

**Files:**
- Modify: `app/(dashboard)/calendar/calendar-management.tsx`

- [ ] **Step 1: Update imports**

```tsx
import { FormDrawer } from "@/components/ui/form-drawer"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
```

Remove `Dialog*`, `AlertDialog*` imports.

- [ ] **Step 2: Replace the Add Dialog with FormDrawer**

Replace `<Dialog open={isAddDialogOpen} ...>` block with — Button triggers `setIsAddDialogOpen(true)`, FormDrawer rendered separately:

```tsx
<Button onClick={() => setIsAddDialogOpen(true)}>
  <Plus className="mr-2 h-4 w-4" />
  Criar Evento
</Button>

<FormDrawer
  open={isAddDialogOpen}
  onOpenChange={setIsAddDialogOpen}
  title="Criar Evento"
  description="Adicione um novo evento ao calendário"
  isLoading={createMutation?.isPending ?? false}
  onSubmit={handleAdd}
  submitLabel="Criar Evento"
>
  <div className="grid gap-4">
    <div className="space-y-1.5">
      <Label htmlFor="cal-title">Título</Label>
      <Input
        id="cal-title"
        value={newEvent.title}
        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
        placeholder="Título do evento"
      />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="cal-description">Descrição</Label>
      <Textarea
        id="cal-description"
        value={newEvent.description}
        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
        placeholder="Descrição do evento"
      />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="cal-initial_date">Data inicial</Label>
      <Input
        id="cal-initial_date"
        type="date"
        value={newEvent.initial_date}
        onChange={(e) => setNewEvent({ ...newEvent, initial_date: e.target.value })}
      />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="cal-final_date">Data final</Label>
      <Input
        id="cal-final_date"
        type="date"
        value={newEvent.final_date}
        onChange={(e) => setNewEvent({ ...newEvent, final_date: e.target.value })}
      />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="cal-recurrence">Recorrência</Label>
      <Select
        value={newEvent.recurrence_type}
        onValueChange={(v) =>
          setNewEvent({ ...newEvent, recurrence_type: v as RecurrenceType | "" })
        }
      >
        <SelectTrigger id="cal-recurrence">
          <SelectValue placeholder="Sem recorrência" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Sem recorrência</SelectItem>
          <SelectItem value="WEEKLY">Semanal</SelectItem>
          <SelectItem value="MONTHLY">Mensal</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
</FormDrawer>
```

- [ ] **Step 3: Replace the Delete AlertDialog with ConfirmDeleteDialog**

```tsx
<ConfirmDeleteDialog
  open={deletingEventId !== null}
  onOpenChange={(open) => { if (!open) setDeletingEventId(null) }}
  entityName="este evento"
  onConfirm={() => { if (deletingEventId !== null) handleDelete(deletingEventId) }}
  isLoading={deleteMutation?.isPending ?? false}
/>
```

- [ ] **Step 4: Add Badge for recurrence type in table**

In `getRecurrenceBadge` or inline in the table map, replace the existing return with:

```tsx
const RECURRENCE_LABELS: Record<string, string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
}

// In table row:
<TableCell>
  {event.recurrence_type ? (
    <Badge variant="secondary">
      {RECURRENCE_LABELS[event.recurrence_type] ?? event.recurrence_type}
    </Badge>
  ) : (
    <Badge variant="outline">Único</Badge>
  )}
</TableCell>
```

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 6: Commit**

```bash
git add app/\(dashboard\)/calendar/calendar-management.tsx
git commit -m "feat(calendar): migrate to FormDrawer + Select + Badge"
```

---

## Task 6: Migrate Courses — Dialog → Drawer + Select + Switch + Badge + Separator

**Files:**
- Modify: `app/(dashboard)/courses/courses-management.tsx`

- [ ] **Step 1: Update imports**

```tsx
import { FormDrawer } from "@/components/ui/form-drawer"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
```

Remove `Dialog*`, `AlertDialog*` imports.

- [ ] **Step 2: Add `is_published` to form state**

```tsx
const [formData, setFormData] = useState({
  title: "",
  description: "",
  creator: "",
  estimated_hours: 0,
  category: "" as CourseCategory,
  url: "",
  image_url: "",
  is_published: false,
})
```

- [ ] **Step 3: Replace the Add Dialog with FormDrawer**

```tsx
<Button onClick={() => setIsAddDialogOpen(true)}>
  <Plus className="mr-2 h-4 w-4" />
  Criar Curso
</Button>

<FormDrawer
  open={isAddDialogOpen}
  onOpenChange={setIsAddDialogOpen}
  title="Criar Novo Curso"
  description="Preencha os dados do curso"
  isLoading={createMutation.isPending}
  onSubmit={handleAdd}
  submitLabel="Criar Curso"
>
  <div className="grid gap-4">
    <div className="space-y-1.5">
      <Label htmlFor="course-title">Título</Label>
      <Input
        id="course-title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Título do curso"
      />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="course-description">Descrição</Label>
      <Textarea
        id="course-description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="Descrição do curso"
      />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="course-creator">Criador</Label>
      <Input
        id="course-creator"
        value={formData.creator}
        onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
        placeholder="Nome do criador"
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="course-hours">Horas estimadas</Label>
        <Input
          id="course-hours"
          type="number"
          value={formData.estimated_hours}
          onChange={(e) =>
            setFormData({ ...formData, estimated_hours: Number(e.target.value) })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="course-category">Categoria</Label>
        <Select
          value={formData.category}
          onValueChange={(v) =>
            setFormData({ ...formData, category: v as CourseCategory })
          }
        >
          <SelectTrigger id="course-category">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="teologia">Teologia</SelectItem>
            <SelectItem value="lideranca">Liderança</SelectItem>
            <SelectItem value="ministerio">Ministério</SelectItem>
            <SelectItem value="discipulado">Discipulado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <Separator />
    <div className="space-y-1.5">
      <Label htmlFor="course-url">URL do curso (opcional)</Label>
      <Input
        id="course-url"
        value={formData.url}
        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
        placeholder="https://..."
      />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="course-image_url">URL da imagem (opcional)</Label>
      <Input
        id="course-image_url"
        value={formData.image_url}
        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
        placeholder="https://..."
      />
    </div>
    <Separator />
    <div className="flex items-center justify-between">
      <Label htmlFor="course-published">Publicado</Label>
      <Switch
        id="course-published"
        checked={formData.is_published}
        onCheckedChange={(checked) =>
          setFormData({ ...formData, is_published: checked })
        }
      />
    </div>
  </div>
</FormDrawer>
```

- [ ] **Step 4: Replace Edit Dialog with FormDrawer**

Mirror the Add FormDrawer above but with `open={!!editingCourse}`, `onOpenChange={() => { setEditingCourse(null); resetForm() }}`, `onSubmit={handleUpdate}`, and `submitLabel="Salvar"`.

- [ ] **Step 5: Replace Delete AlertDialog with ConfirmDeleteDialog**

```tsx
<ConfirmDeleteDialog
  open={deletingCourseId !== null}
  onOpenChange={(open) => { if (!open) setDeletingCourseId(null) }}
  entityName="este curso"
  onConfirm={() => { if (deletingCourseId !== null) handleDelete(deletingCourseId) }}
  isLoading={deleteMutation.isPending}
/>
```

- [ ] **Step 6: Add Badge for category in table rows**

```tsx
const CATEGORY_LABELS: Record<string, string> = {
  teologia: "Teologia",
  lideranca: "Liderança",
  ministerio: "Ministério",
  discipulado: "Discipulado",
}

// In table row:
<TableCell>
  <Badge variant="secondary">
    {CATEGORY_LABELS[course.category] ?? course.category}
  </Badge>
</TableCell>
```

- [ ] **Step 7: Commit**

```bash
git add app/\(dashboard\)/courses/courses-management.tsx
git commit -m "feat(courses): migrate to FormDrawer + Select + Switch + Badge + Separator"
```

---

## Task 7: Enrich Events — Select + Badge + Switch + Avatar

**Files:**
- Modify: `app/(dashboard)/events/events-management.tsx`

- [ ] **Step 1: Replace raw `<select>` with shadcn Select**

Find the raw `<select id="recurrence_type" ...>` and replace with:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Replace the raw select element:
<Select
  value={formData.recurrence_type || ""}
  onValueChange={(v) =>
    onChange({ ...formData, recurrence_type: v as RecurrenceType | "" })
  }
>
  <SelectTrigger>
    <SelectValue placeholder="Sem recorrência" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">Sem recorrência</SelectItem>
    <SelectItem value="WEEKLY">Semanal</SelectItem>
    <SelectItem value="MONTHLY">Mensal</SelectItem>
  </SelectContent>
</Select>
```

- [ ] **Step 2: Add Badge import and replace color dot in table**

```tsx
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
```

Replace the `<div style={{ backgroundColor: getTypeColor(...) }} className="w-2 h-2 rounded-full" />` in table rows:

```tsx
<Badge variant="outline">
  {event.recurrence_type === "WEEKLY"
    ? "Semanal"
    : event.recurrence_type === "MONTHLY"
    ? "Mensal"
    : "Único"}
</Badge>
```

- [ ] **Step 3: Add Avatar to event rows (organizer initials)**

In the event table row, add an Avatar showing organizer initials (use event `title` first letter as fallback):

```tsx
<TableCell>
  <div className="flex items-center gap-2">
    <Avatar size="sm">
      <AvatarFallback>
        {event.title.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <span>{event.title}</span>
  </div>
</TableCell>
```

- [ ] **Step 4: Add Switch for highlight field inside the existing Drawer form**

Inside the existing Drawer form body (before the footer), add:

```tsx
<Separator />
<div className="flex items-center justify-between">
  <Label htmlFor="event-highlight">Destacar evento</Label>
  <Switch
    id="event-highlight"
    checked={formData.is_highlighted ?? false}
    onCheckedChange={(checked) =>
      onChange({ ...formData, is_highlighted: checked })
    }
  />
</div>
```

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/events/events-management.tsx
git commit -m "feat(events): replace raw select + add Badge, Avatar, Switch"
```

---

## Task 8: Migrate Life Groups — Dialog → Drawer + Avatar + Badge + Separator + Collapsible

**Files:**
- Modify: `app/(dashboard)/life-groups/life-groups-management.tsx`

- [ ] **Step 1: Update imports**

```tsx
import { FormDrawer } from "@/components/ui/form-drawer"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
```

Remove `Dialog*`, `AlertDialog*` imports.

- [ ] **Step 2: Replace Add Dialog with FormDrawer**

```tsx
<Button onClick={() => setIsAddDialogOpen(true)}>
  <Plus className="mr-2 h-4 w-4" />
  Criar Grupo
</Button>

<FormDrawer
  open={isAddDialogOpen}
  onOpenChange={setIsAddDialogOpen}
  title="Criar Grupo de Vida"
  description="Preencha os dados do grupo"
  isLoading={createMutation.isPending}
  onSubmit={handleAdd}
  submitLabel="Criar Grupo"
>
  <div className="grid gap-4">
    <div className="space-y-1.5">
      <Label htmlFor="lg-name">Nome</Label>
      <Input
        id="lg-name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Nome do grupo"
      />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="lg-leader">Líder</Label>
      <Input
        id="lg-leader"
        value={formData.leader_name ?? ""}
        onChange={(e) => setFormData({ ...formData, leader_name: e.target.value })}
        placeholder="Nome do líder"
      />
    </div>
    <Separator />
    <div className="space-y-1.5">
      <Label htmlFor="lg-meeting-day">Dia de reunião</Label>
      <Input
        id="lg-meeting-day"
        value={formData.meeting_day ?? ""}
        onChange={(e) => setFormData({ ...formData, meeting_day: e.target.value })}
        placeholder="Ex: Quinta-feira"
      />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="lg-meeting-time">Horário</Label>
      <Input
        id="lg-meeting-time"
        value={formData.meeting_time ?? ""}
        onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
        placeholder="Ex: 19:30"
      />
    </div>
  </div>
</FormDrawer>
```

- [ ] **Step 3: Replace Edit Dialog with FormDrawer**

Mirror Add FormDrawer: `open={!!editingGroup}`, `onOpenChange={() => { setEditingGroup(null); resetForm() }}`, `onSubmit={handleUpdate}`, `submitLabel="Salvar"`.

- [ ] **Step 4: Replace Delete AlertDialog with ConfirmDeleteDialog**

```tsx
<ConfirmDeleteDialog
  open={deletingGroupId !== null}
  onOpenChange={(open) => { if (!open) setDeletingGroupId(null) }}
  entityName="este grupo de vida"
  onConfirm={() => { if (deletingGroupId !== null) handleDelete(deletingGroupId) }}
  isLoading={deleteMutation.isPending}
/>
```

- [ ] **Step 5: Add Collapsible advanced filters above the table**

Add state: `const [filtersOpen, setFiltersOpen] = useState(false)`

```tsx
<Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
  <CollapsibleTrigger asChild>
    <Button variant="outline" size="sm">
      <Filter className="mr-2 h-4 w-4" />
      Filtros avançados
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent className="mt-3 grid grid-cols-2 gap-3">
    <div className="space-y-1.5">
      <Label>Setor</Label>
      <Input
        placeholder="Filtrar por setor"
        value={sectorFilter}
        onChange={(e) => setSectorFilter(e.target.value)}
      />
    </div>
  </CollapsibleContent>
</Collapsible>
```

Add state: `const [sectorFilter, setSectorFilter] = useState("")`

- [ ] **Step 6: Add Avatar + Badge in table rows**

```tsx
// Avatar showing leader initials
<TableCell>
  <div className="flex items-center gap-2">
    <Avatar size="sm">
      <AvatarFallback>
        {(group.leader_name ?? "G").charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <span>{group.leader_name ?? "—"}</span>
  </div>
</TableCell>

// Badge for sector
<TableCell>
  <Badge variant="outline">{group.sector_name ?? "—"}</Badge>
</TableCell>
```

- [ ] **Step 7: Commit**

```bash
git add app/\(dashboard\)/life-groups/life-groups-management.tsx
git commit -m "feat(life-groups): migrate to FormDrawer + Avatar + Badge + Separator + Collapsible"
```

---

## Task 9: Migrate Sectors — verify Dialog + ConfirmDeleteDialog + Badge

**Files:**
- Modify: `app/(dashboard)/sectors/sectors-management.tsx`

- [ ] **Step 1: Replace AlertDialog import**

```tsx
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Badge } from "@/components/ui/badge"
```

- [ ] **Step 2: Replace Delete AlertDialog block**

```tsx
<ConfirmDeleteDialog
  open={deletingSectorId !== null}
  onOpenChange={(open) => { if (!open) setDeletingSectorId(null) }}
  entityName="este setor"
  onConfirm={() => { if (deletingSectorId !== null) handleDelete(deletingSectorId) }}
  isLoading={deleteMutation.isPending}
/>
```

- [ ] **Step 3: Add Badge for area name in table**

```tsx
<TableCell>
  <Badge variant="secondary">{sector.area_name ?? "—"}</Badge>
</TableCell>
```

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/sectors/sectors-management.tsx
git commit -m "feat(sectors): use ConfirmDeleteDialog + Badge"
```

---

## Task 10: Migrate Users — Dialog → Drawer + Select + Avatar + Badge + Switch + Separator

**Files:**
- Modify: `app/(dashboard)/users/users-management.tsx`

- [ ] **Step 1: Update imports**

```tsx
import { FormDrawer } from "@/components/ui/form-drawer"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
```

Remove `Dialog*`, `AlertDialog*` imports. Keep existing `Badge` import (already defined in the file via `ROLE_OPTIONS`).

- [ ] **Step 2: Replace Add Dialog with FormDrawer**

The file already has `ROLE_OPTIONS` array. Use it in the Select:

```tsx
<Button onClick={() => setIsAddDialogOpen(true)}>
  <Plus className="mr-2 h-4 w-4" />
  Novo Usuário
</Button>

<FormDrawer
  open={isAddDialogOpen}
  onOpenChange={setIsAddDialogOpen}
  title="Novo Usuário"
  description="Preencha os dados do usuário"
  isLoading={createMutation.isPending}
  onSubmit={handleAdd}
  submitLabel="Criar Usuário"
>
  <div className="grid gap-4">
    <div className="space-y-1.5">
      <Label htmlFor="user-name">Nome</Label>
      <Input
        id="user-name"
        value={newUser.name}
        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
        placeholder="Nome completo"
      />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="user-email">E-mail</Label>
      <Input
        id="user-email"
        type="email"
        value={newUser.email}
        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
        placeholder="email@exemplo.com"
      />
    </div>
    <Separator />
    <div className="space-y-1.5">
      <Label htmlFor="user-role">Função</Label>
      <Select
        value={newUser.role}
        onValueChange={(v) => setNewUser({ ...newUser, role: v as UserRole })}
      >
        <SelectTrigger id="user-role">
          <SelectValue placeholder="Selecione uma função" />
        </SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <Separator />
    <div className="flex items-center justify-between">
      <Label htmlFor="user-active">Usuário ativo</Label>
      <Switch
        id="user-active"
        checked={newUser.is_active ?? true}
        onCheckedChange={(checked) =>
          setNewUser({ ...newUser, is_active: checked })
        }
      />
    </div>
  </div>
</FormDrawer>
```

- [ ] **Step 3: Replace Edit Dialog with FormDrawer**

Mirror Add FormDrawer: `open={!!editingUser}`, `onOpenChange={() => { setEditingUser(null); resetForm() }}`, use `newUser` state, `onSubmit={handleUpdate}`, `submitLabel="Salvar"`. Replace the second raw `<select id="edit-role">` with the same `<Select>` pattern.

- [ ] **Step 4: Replace Delete AlertDialog**

```tsx
<ConfirmDeleteDialog
  open={deletingUserId !== null}
  onOpenChange={(open) => { if (!open) setDeletingUserId(null) }}
  entityName="este usuário"
  onConfirm={() => { if (deletingUserId !== null) handleDelete(deletingUserId) }}
  isLoading={deleteMutation.isPending}
/>
```

- [ ] **Step 5: Add Avatar to table rows**

```tsx
<TableCell>
  <div className="flex items-center gap-2">
    <Avatar size="sm">
      <AvatarFallback>
        {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <span className="font-medium">{user.name}</span>
  </div>
</TableCell>
```

- [ ] **Step 6: Commit**

```bash
git add app/\(dashboard\)/users/users-management.tsx
git commit -m "feat(users): migrate to FormDrawer + Select + Avatar + Switch + Separator"
```

---

## Task 11: Migrate Members — Dialog → Drawer + Select + Avatar + Badge + Tabs + Collapsible + Checkbox

**Files:**
- Modify: `app/(dashboard)/members/members-management.tsx`

- [ ] **Step 1: Update imports**

```tsx
import { FormDrawer } from "@/components/ui/form-drawer"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
```

- [ ] **Step 2: Add role-filter tab state + bulk-select state**

```tsx
const [roleTab, setRoleTab] = useState<"all" | "lg-leader" | "member">("all")
const [selectedIds, setSelectedIds] = useState<number[]>([])
const [filtersOpen, setFiltersOpen] = useState(false)
```

- [ ] **Step 3: Add Tabs above the table for role filtering**

```tsx
<Tabs value={roleTab} onValueChange={(v) => setRoleTab(v as typeof roleTab)}>
  <TabsList>
    <TabsTrigger value="all">Todos</TabsTrigger>
    <TabsTrigger value="lg-leader">Líderes</TabsTrigger>
    <TabsTrigger value="member">Membros</TabsTrigger>
  </TabsList>
  <TabsContent value={roleTab}>
    {/* table goes here */}
  </TabsContent>
</Tabs>
```

Filter `filteredMembers` by `roleTab`:
```tsx
const displayedMembers = filteredMembers.filter(
  (m) => roleTab === "all" || m.role === roleTab
)
```

- [ ] **Step 4: Add Collapsible advanced filters**

Below the search input, add:

```tsx
<Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
  <CollapsibleTrigger asChild>
    <Button variant="outline" size="sm">
      <Filter className="mr-2 h-4 w-4" />
      Filtros avançados
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent className="mt-3 grid grid-cols-2 gap-3">
    <div className="space-y-1.5">
      <Label>Setor</Label>
      <Select
        value={sectorFilter}
        onValueChange={setSectorFilter}
      >
        <SelectTrigger><SelectValue placeholder="Todos os setores" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos</SelectItem>
          {sectors.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </CollapsibleContent>
</Collapsible>
```

Add `sectorFilter` state: `const [sectorFilter, setSectorFilter] = useState("")`

- [ ] **Step 5: Add Checkbox bulk-select column to table**

Table header:
```tsx
<TableHead className="w-10">
  <Checkbox
    checked={
      displayedMembers.length > 0 &&
      displayedMembers.every((m) => selectedIds.includes(m.id))
    }
    onCheckedChange={(checked) =>
      setSelectedIds(checked ? displayedMembers.map((m) => m.id) : [])
    }
  />
</TableHead>
```

Table row:
```tsx
<TableCell>
  <Checkbox
    checked={selectedIds.includes(member.id)}
    onCheckedChange={(checked) =>
      setSelectedIds((prev) =>
        checked ? [...prev, member.id] : prev.filter((id) => id !== member.id)
      )
    }
  />
</TableCell>
```

- [ ] **Step 6: Add Avatar + Badge in table rows**

```tsx
<TableCell>
  <div className="flex items-center gap-2">
    <Avatar size="sm">
      <AvatarFallback>
        {member.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <span className="font-medium">{member.name}</span>
  </div>
</TableCell>
<TableCell>
  <Badge variant={member.role === "lg-leader" ? "default" : "secondary"}>
    {member.role === "lg-leader" ? "Líder" : "Membro"}
  </Badge>
</TableCell>
```

- [ ] **Step 7: Replace raw `<select>` fields with shadcn Select**

Replace both raw `<select id="role" ...>` and `<select id="edit-role" ...>` with `<Select>` using `ROLE_OPTIONS` or `["admin","pastor","supervisor","lg-leader","member"]` values.

- [ ] **Step 8: Replace Delete AlertDialog**

```tsx
<ConfirmDeleteDialog
  open={deletingMemberId !== null}
  onOpenChange={(open) => { if (!open) setDeletingMemberId(null) }}
  entityName="este membro"
  onConfirm={() => { if (deletingMemberId !== null) handleDelete(deletingMemberId) }}
  isLoading={deleteMutation.isPending}
/>
```

- [ ] **Step 9: Migrate Add/Edit Dialog to FormDrawer**

Move the add and edit forms (with name, phone, address, role, life group fields) into `<FormDrawer>` wrappers following the same pattern as Tasks 3–10.

- [ ] **Step 10: Commit**

```bash
git add app/\(dashboard\)/members/members-management.tsx
git commit -m "feat(members): migrate to FormDrawer + Tabs + Collapsible + Checkbox + Avatar + Badge + Select"
```

---

## Task 12: Replace raw buttons in Members journey-sheet

**Files:**
- Modify: `app/(dashboard)/members/journey-sheet.tsx`

- [ ] **Step 1: Add Button import**

```tsx
import { Button } from "@/components/ui/button"
```

- [ ] **Step 2: Replace raw `<button>` with Button variant="link"**

```tsx
// Before:
<button
  className="mt-1.5 inline-flex items-center gap-1 text-primary hover:underline"
  onClick={() => { navigator.clipboard.writeText(STAGE_MESSAGES[stageKey].message) }}
>
  Copiar mensagem
</button>

// After:
<Button
  variant="link"
  size="sm"
  className="mt-1.5 h-auto p-0 text-primary"
  onClick={() => { navigator.clipboard.writeText(STAGE_MESSAGES[stageKey].message) }}
>
  Copiar mensagem
</Button>
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/members/journey-sheet.tsx
git commit -m "feat(journey-sheet): replace raw button with Button variant=link"
```

---

## Task 13: Replace raw buttons in Notifications

**Files:**
- Modify: `app/(dashboard)/notifications/notification-system.tsx`

- [ ] **Step 1: Ensure Button import exists**

```tsx
import { Button } from "@/components/ui/button"
```

- [ ] **Step 2: Replace category toggle buttons (line ~255)**

```tsx
// Before:
<button
  key={cat.value}
  type="button"
  onClick={() => { /* toggle logic */ }}
  className="..."
>
  {cat.label}
</button>

// After:
<Button
  key={cat.value}
  type="button"
  variant={selectedCategories.includes(cat.value) ? "default" : "outline"}
  size="sm"
  onClick={() => toggleCategory(cat.value)}
>
  {cat.label}
</Button>
```

- [ ] **Step 3: Replace channel toggle buttons (line ~309)**

```tsx
<Button
  key={ch.value}
  type="button"
  variant={selectedChannels.includes(ch.value) ? "default" : "outline"}
  size="sm"
  onClick={() => toggleChannel(ch.value)}
>
  {ch.label}
</Button>
```

- [ ] **Step 4: Replace filter remove button (line ~345)**

```tsx
// Before:
<button
  onClick={() => removeFilter(i)}
  className="ml-1 hover:text-destructive"
  aria-label={`Remover filtro ${f.type}: ${f.value}`}
>
  ×
</button>

// After:
<Button
  variant="ghost"
  size="sm"
  className="ml-1 h-auto p-0 hover:text-destructive"
  onClick={() => removeFilter(i)}
  aria-label={`Remover filtro ${f.type}: ${f.value}`}
>
  ×
</Button>
```

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/notifications/notification-system.tsx
git commit -m "feat(notifications): replace raw buttons with Button component"
```

---

## Task 14: Replace raw buttons in Member Journey

**Files:**
- Modify: `app/(dashboard)/member-journey/member-journey-management.tsx`

- [ ] **Step 1: Ensure Button import exists**

```tsx
import { Button } from "@/components/ui/button"
```

- [ ] **Step 2: Replace stage filter raw `<button>` (line ~231)**

```tsx
// Before:
<button
  key={stage.id}
  onClick={() => {
    setActiveStageFilter(isActive ? undefined : (stage.id as JourneyStageId))
  }}
  className="..."
>
  {stage.label}
</button>

// After:
<Button
  key={stage.id}
  variant={isActive ? "default" : "outline"}
  size="sm"
  onClick={() => {
    setActiveStageFilter(isActive ? undefined : (stage.id as JourneyStageId))
  }}
>
  {stage.label}
</Button>
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/member-journey/member-journey-management.tsx
git commit -m "feat(member-journey): replace raw button with Button component"
```

---

## Task 15: Migrate Church Data — Dialog → Drawer + Tabs + Separator

**Files:**
- Modify: `app/(dashboard)/church-data/church-data-management.tsx`

- [ ] **Step 1: Update imports**

```tsx
import { FormDrawer } from "@/components/ui/form-drawer"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
```

- [ ] **Step 2: Replace the Add/Edit Dialog with FormDrawer containing Tabs**

The form body uses Tabs with three sections:

```tsx
<FormDrawer
  open={isAddDialogOpen}
  onOpenChange={setIsAddDialogOpen}
  title="Editar Dados da Igreja"
  description="Atualize as informações da igreja"
  isLoading={updateMutation.isPending}
  onSubmit={handleUpdate}
  submitLabel="Salvar"
>
  <Tabs defaultValue="info">
    <TabsList className="w-full">
      <TabsTrigger value="info" className="flex-1">Informações</TabsTrigger>
      <TabsTrigger value="schedule" className="flex-1">Horários</TabsTrigger>
      <TabsTrigger value="social" className="flex-1">Redes Sociais</TabsTrigger>
    </TabsList>
    <TabsContent value="info" className="mt-4 grid gap-4">
      {/* name, phone, email, address fields */}
      <div className="space-y-1.5">
        <Label htmlFor="cd-name">Nome da Igreja</Label>
        <Input
          id="cd-name"
          value={formData.name ?? ""}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <Separator />
      {/* address fields */}
    </TabsContent>
    <TabsContent value="schedule" className="mt-4 grid gap-4">
      {/* culto schedule fields */}
    </TabsContent>
    <TabsContent value="social" className="mt-4 grid gap-4">
      {/* instagram, youtube, website fields */}
    </TabsContent>
  </Tabs>
</FormDrawer>
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/church-data/church-data-management.tsx
git commit -m "feat(church-data): migrate to FormDrawer with Tabs + Separator"
```

---

## Task 16: Migrate Contributions — Dialog → Drawer + Tabs + Collapsible + Badge

**Files:**
- Modify: `app/(dashboard)/contributions/contributions-management.tsx`

- [ ] **Step 1: Update imports**

```tsx
import { FormDrawer } from "@/components/ui/form-drawer"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
```

- [ ] **Step 2: Add period tab state**

```tsx
const [periodTab, setPeriodTab] = useState<"all" | "month" | "year">("all")
const [filtersOpen, setFiltersOpen] = useState(false)
```

- [ ] **Step 3: Add Tabs to filter contributions by period**

```tsx
<Tabs value={periodTab} onValueChange={(v) => setPeriodTab(v as typeof periodTab)}>
  <TabsList>
    <TabsTrigger value="all">Todos</TabsTrigger>
    <TabsTrigger value="month">Este mês</TabsTrigger>
    <TabsTrigger value="year">Este ano</TabsTrigger>
  </TabsList>
</Tabs>
```

- [ ] **Step 4: Add Collapsible advanced filters**

```tsx
<Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
  <CollapsibleTrigger asChild>
    <Button variant="outline" size="sm">
      <Filter className="mr-2 h-4 w-4" />
      Filtros avançados
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent className="mt-3">
    {/* category filter, member filter, etc. */}
  </CollapsibleContent>
</Collapsible>
```

- [ ] **Step 5: Replace Add Dialog with FormDrawer**

```tsx
<FormDrawer
  open={isAddDialogOpen}
  onOpenChange={setIsAddDialogOpen}
  title="Registrar Contribuição"
  description="Preencha os dados da contribuição"
  isLoading={createMutation.isPending}
  onSubmit={handleAdd}
  submitLabel="Registrar"
>
  <div className="grid gap-4">
    {/* member, amount, date, category, notes fields */}
  </div>
</FormDrawer>
```

- [ ] **Step 6: Replace Delete AlertDialog with ConfirmDeleteDialog + Badge in table**

Replace delete dialog. In table rows, add category Badge:

```tsx
<TableCell>
  <Badge variant="secondary">{contribution.category ?? "—"}</Badge>
</TableCell>
```

- [ ] **Step 7: Commit**

```bash
git add app/\(dashboard\)/contributions/contributions-management.tsx
git commit -m "feat(contributions): migrate to FormDrawer + Tabs + Collapsible + Badge"
```

---

## Task 17: Replace raw Checkbox in formulários/member-registrations

**Files:**
- Modify: `app/(dashboard)/formularios/member-registrations/new/member-registrations-form.tsx`

- [ ] **Step 1: Add Checkbox import**

```tsx
import { Checkbox } from "@/components/ui/checkbox"
```

- [ ] **Step 2: Replace raw `<input type="checkbox">` (line ~313)**

```tsx
// Before:
<input
  type="checkbox"
  value={c.id}
  checked={completedCourses.includes(c.id)}
  onChange={(e) => {
    const next = e.target.checked
      ? [...completedCourses, c.id]
      : completedCourses.filter((id) => id !== c.id)
    setCompletedCourses(next)
  }}
/>

// After:
<Checkbox
  id={`course-${c.id}`}
  checked={completedCourses.includes(c.id)}
  onCheckedChange={(checked) => {
    const next = checked
      ? [...completedCourses, c.id]
      : completedCourses.filter((id) => id !== c.id)
    setCompletedCourses(next)
  }}
/>
<Label htmlFor={`course-${c.id}`} className="ml-2 font-normal">
  {c.title}
</Label>
```

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/formularios/member-registrations/new/member-registrations-form.tsx"
git commit -m "feat(member-registrations): replace raw input[checkbox] with Checkbox"
```

---

## Task 18: Replace raw Checkbox in formulários/multiplications

**Files:**
- Modify: `app/(dashboard)/formularios/multiplications/new/multiplications-form.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
```

- [ ] **Step 2: Replace raw `<input type="checkbox">` (line ~331)**

The form uses react-hook-form. Replace `{...register(key as never)}` pattern:

```tsx
// Before:
<input type="checkbox" {...register(key as never)} />
{label}

// After:
<Checkbox
  id={key}
  checked={!!watch(key as never)}
  onCheckedChange={(checked) =>
    setValue(key as never, checked as never)
  }
/>
<Label htmlFor={key} className="ml-2 font-normal">
  {label}
</Label>
```

Ensure `watch` and `setValue` are destructured from `useForm`.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/formularios/multiplications/new/multiplications-form.tsx"
git commit -m "feat(multiplications): replace raw input[checkbox] with Checkbox"
```

---

## Task 19: Migrate Course Tracks — verify Dialog + ConfirmDeleteDialog + Badge

**Files:**
- Modify: `app/(dashboard)/course-tracks/course-tracks-management.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Badge } from "@/components/ui/badge"
```

- [ ] **Step 2: Replace Delete AlertDialog with ConfirmDeleteDialog**

```tsx
<ConfirmDeleteDialog
  open={deletingTrackId !== null}
  onOpenChange={(open) => { if (!open) setDeletingTrackId(null) }}
  entityName="esta trilha"
  onConfirm={() => { if (deletingTrackId !== null) handleDelete(deletingTrackId) }}
  isLoading={deleteMutation.isPending}
/>
```

- [ ] **Step 3: Add Badge for course count in table**

```tsx
<TableCell>
  <Badge variant="secondary">{track.course_count ?? 0} cursos</Badge>
</TableCell>
```

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/course-tracks/course-tracks-management.tsx"
git commit -m "feat(course-tracks): use ConfirmDeleteDialog + Badge"
```

---

## Task 20: Final build verification

- [ ] **Step 1: Run full build**

```bash
cd /Users/jonathalima/Developer/church/admin-ui
npm run build 2>&1
```

Expected: Build completes with no TypeScript errors. Warnings about unused variables are acceptable but errors are not.

- [ ] **Step 2: Run lint**

```bash
npm run lint 2>&1
```

Expected: No errors (warnings acceptable).

- [ ] **Step 3: Verify component coverage**

```bash
# Every installed shadcn component should appear at least once:
for comp in alert-dialog avatar badge button calendar card checkbox collapsible date-input date-time-picker dialog drawer dropdown-menu input label phone-input popover select separator sheet skeleton sonner switch table tabs textarea; do
  count=$(grep -rl "from \"@/components/ui/$comp\"" app components --include="*.tsx" 2>/dev/null | wc -l)
  echo "$comp: $count files"
done
```

Expected: Every component shows at least 1 file.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: shadcn/UI component overhaul complete — all components in use"
```
