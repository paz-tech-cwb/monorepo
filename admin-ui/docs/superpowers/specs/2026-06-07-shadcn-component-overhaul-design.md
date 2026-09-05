# shadcn/UI Component Overhaul — Admin Dashboard

**Date:** 2026-06-07  
**Scope:** admin-ui only  
**Goal:** Every installed shadcn/UI component appears at least once in a meaningful location. All popup forms migrate to Drawer (complex) or Dialog (simple). Delete confirmations always use AlertDialog.

---

## 1. Decision Rules

| Condition | Surface |
|-----------|---------|
| 1–2 field form | `Dialog` |
| 3+ fields or rich/markdown content | `Drawer` (direction: right) |
| Destructive confirmation | `AlertDialog` |
| Read-only detail panel | `Sheet` (keep existing pattern) |

---

## 2. Shared Wrapper Components

Two reusable wrappers are created once and consumed by all pages:

### `<FormDrawer>`
**File:** `components/ui/form-drawer.tsx`  
**Props:** `open`, `onOpenChange`, `title`, `description`, `isLoading`, `onSubmit`, `submitLabel`, `children`  
**Internals:** `Drawer` with `direction="right"` → `DrawerContent` (width ~480px) → `DrawerHeader` / scrollable body / `DrawerFooter` with Cancel + Submit buttons.

### `<ConfirmDeleteDialog>`
**File:** `components/ui/confirm-delete-dialog.tsx`  
**Props:** `open`, `onOpenChange`, `entityName`, `onConfirm`, `isLoading`  
**Internals:** `AlertDialog` → standard Portuguese copy ("Esta ação não pode ser desfeita.") + destructive confirm button.

These replace all inline Dialog/AlertDialog boilerplate across the 13 management pages.

---

## 3. Component Coverage Map

### Already used (keep + verify consistent usage)

| Component | Location |
|-----------|----------|
| `button` | All pages |
| `card` | All management pages |
| `table` | All list views |
| `input`, `label`, `select`, `textarea` | All forms |
| `dropdown-menu` | Row action menus (⋯) |
| `alert-dialog` | Wrapped in `<ConfirmDeleteDialog>` |
| `skeleton` | All loading states |
| `sonner` | Toast notifications |
| `sheet` | Members journey panel (read-only, keep as-is) |
| `drawer` | All complex forms (via `<FormDrawer>`) |
| `calendar`, `date-time-picker`, `date-input` | Date fields in forms |
| `phone-input`, `address-form` | Member registration form |
| `popover` | Used internally by date pickers (no change needed) |
| `dialog` | Simple 1–2 field forms (Areas, Sectors, Course Tracks, Member Journey notification) |
| `wip-overlay` | Already in use in Life Groups and Conversions — no change needed |

### New strategic placements

| Component | Placement |
|-----------|----------|
| `tabs` | Members page (Lista / Jornada tabs); Church Data Drawer (Info / Horários / Redes Sociais); Contributions page (Todos / Por período) |
| `badge` | User role chips; event status; announcement status; area/sector labels in list rows |
| `avatar` | Members table rows (initials fallback); Users table rows; Life Groups Drawer (leader avatar); Events Drawer |
| `switch` | Boolean fields inside Drawers: event highlight toggle, announcement active toggle, course published toggle, user active toggle |
| `collapsible` | Advanced filters panel in Members, Life Groups, and Contributions pages |
| `separator` | Section dividers inside Drawer forms (e.g., "Informações Básicas" / "Conteúdo" / "Links") |
| `checkbox` | Bulk-select column in Members and Users tables |

---

## 4. Page-by-Page Migration

### Drawer (right-side, 480px)
| Page | Form fields | Notes |
|------|-------------|-------|
| Announcements | title, subtitle, image_url, action_url, markdown_content | Separator between metadata and markdown editor sections; Switch for active status; Badge for status in table |
| Calendar | title, date, type, description | Badge for event type in table |
| Church Data | name, address, phone, social links, schedule | Tabs inside Drawer: Info / Horários / Redes Sociais |
| Contributions | member, amount, date, category, notes | Tabs on page for period filter; Collapsible for advanced filters; Badge for category |
| Courses | title, description, creator, hours, category, url, image_url | Switch for published; Badge for category in table; Separator between basic info and media |
| Events | Already uses Drawer ✅ | Add Badge for status; Switch for highlight; Avatar for organizer |
| Life Groups | name, leader, sector, meeting day/time, address | Avatar for leader in Drawer header; Badge for sector in table; Separator |
| Members | Full registration (name, phone, address, LG, role…) | Drawer for create; Sheet kept for journey panel; Tabs on page to filter by role (Todos / Líderes / Membros); Avatar in table; Badge for role; Collapsible for advanced filters; Checkbox for bulk select |
| Users | name, email, role, member link | Avatar in table and Drawer; Badge for role; Switch for active; Separator |

### Dialog (simple, 1–2 fields)
| Page | Form fields |
|------|-------------|
| Areas | name |
| Course Tracks | name |
| Sectors | name, area (Select) |
| Member Journey | notification message + stage (confirmation) |

### No form change
| Page | Reason |
|------|--------|
| Notifications | No form — push notification management, no CRUD modal |
| Formulários | Full-page forms, no popup needed |
| Dashboard | Read-only stats |

---

## 5. Architecture Notes

- **No new pages or routes** — all changes are within existing management components.
- **Form state stays local** — no global state management change; each management component keeps its own `useState` for open/form state.
- **`<FormDrawer>` and `<ConfirmDeleteDialog>` are the only new files** — all other changes are edits to existing management files.
- **Sheet stays separate from Drawer** — `Sheet` = read-only side panel (members journey); `Drawer` = editable form. Do not merge them.
- **`popover` needs no direct usage** — it is already used internally by `Calendar` and `DateTimePicker`. No forced placement needed.
- **Checkbox bulk-select** — adds a checkbox column to Members and Users tables with a "select all" header checkbox. No backend bulk-action API is required at this stage; selection state is local only.

---

## 6. Raw HTML Element Replacements

Several files use raw HTML elements instead of shadcn components. These must be replaced as part of the migration:

| File | Raw element | Replace with |
|------|-------------|--------------|
| `calendar/calendar-management.tsx` | `<select>` (event type) | `<Select>` |
| `courses/courses-management.tsx` | `<select>` (category) | `<Select>` |
| `users/users-management.tsx` | `<select>` (role ×2) | `<Select>` |
| `members/members-management.tsx` | `<select>` (sector, LG ×2) | `<Select>` |
| `events/events-management.tsx` | `<select>` (event type) | `<Select>` |
| `formularios/multiplications/new` | `<input type="checkbox">` | `<Checkbox>` |
| `formularios/member-registrations/new` | `<input>` | `<Input>` |

---

## 7. Implementation Order

1. Build `<FormDrawer>` wrapper
2. Build `<ConfirmDeleteDialog>` wrapper
3. Migrate simple-form pages: Areas, Sectors, Course Tracks, Member Journey (Dialog pattern, no Drawer needed — just verify consistency)
4. Migrate complex-form pages one by one: Announcements → Courses → Calendar → Contributions → Church Data → Life Groups → Users → Members
5. Events — already on Drawer, enrich with Badge/Switch/Avatar only
6. Add `tabs`, `collapsible`, `badge`, `avatar`, `switch`, `checkbox`, `separator` placements per the coverage map above

Each step is independently reviewable.
