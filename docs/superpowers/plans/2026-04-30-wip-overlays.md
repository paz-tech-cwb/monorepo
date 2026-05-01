# WIP Overlays Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent "WIP" badge overlay to every mocked/hardcoded feature in admin-ui and mobile-app, and create a root-level markdown checklist of all mocked features.

**Architecture:** A reusable `WipOverlay` wrapper component (React) and widget (Flutter) renders children normally, then absolutely positions an orange "WIP" badge in the top-right corner. Each mocked UI section is wrapped with it. The root `docs/wip-features.md` tracks all 8 items as a markdown checklist.

**Tech Stack:** Next.js 15 / React 19 / Tailwind CSS (admin-ui), Flutter 3.7+ / GetX (mobile-app)

---

### Task 1: Create `WipOverlay` React component

**Files:**
- Create: `admin-ui/components/ui/wip-overlay.tsx`

- [ ] **Step 1: Create the component**

```tsx
// admin-ui/components/ui/wip-overlay.tsx
import { cn } from '@/lib/utils'

interface WipOverlayProps {
  children: React.ReactNode
  label?: string
  className?: string
}

export function WipOverlay({ children, label = 'WIP', className }: WipOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      <span className="pointer-events-none absolute right-1 top-1 z-50 rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
        {label}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd admin-ui
git add components/ui/wip-overlay.tsx
git commit -m "feat: add WipOverlay component"
```

---

### Task 2: Wrap notification CHANNELS, ROLES, CATEGORIES

**Files:**
- Modify: `admin-ui/app/(dashboard)/notifications/notification-system.tsx`

The three hardcoded constant arrays (`CHANNELS`, `ROLES`, `CATEGORIES`) are used in a channel-picker row and a role filter row. Wrap those UI sections with `<WipOverlay>`.

- [ ] **Step 1: Add import at the top of the file**

Find this line (around line 1):
```tsx
'use client'
```

Add the import after the existing import block (after the last `import` statement):
```tsx
import { WipOverlay } from '@/components/ui/wip-overlay'
```

- [ ] **Step 2: Find the channels grid**

Search for `CHANNELS.map` in the file. It renders a grid of channel toggle cards. Identify the outermost container `<div>` that holds the entire channels section. Wrap it:

```tsx
<WipOverlay>
  <div ...> {/* existing channels container */}
    {CHANNELS.map(...)}
  </div>
</WipOverlay>
```

- [ ] **Step 3: Find the roles section**

Search for `ROLES.map` in the file. Wrap its outermost container the same way:

```tsx
<WipOverlay>
  <div ...>
    {ROLES.map(...)}
  </div>
</WipOverlay>
```

- [ ] **Step 4: Find the categories section**

Search for `CATEGORIES.map` in the file. Wrap its outermost container:

```tsx
<WipOverlay>
  <div ...>
    {CATEGORIES.map(...)}
  </div>
</WipOverlay>
```

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/notifications/notification-system.tsx
git commit -m "feat: add WIP overlay to hardcoded notification channels, roles, categories"
```

---

### Task 3: Wrap Member Journey stage messages

**Files:**
- Modify: `admin-ui/app/(dashboard)/members/journey-sheet.tsx`

`STAGE_MESSAGES` is used at lines 123–128 to render a title + message + copy button. Wrap that block.

- [ ] **Step 1: Add import**

Add after the last `import` line:
```tsx
import { WipOverlay } from '@/components/ui/wip-overlay'
```

- [ ] **Step 2: Wrap the stage message block**

Find lines 123–130 (the `<p>` title, `<p>` message, and copy button). They are inside a parent container. Wrap the entire parent `<div>` that contains both `<p>` elements and the copy button:

```tsx
<WipOverlay>
  <div ...> {/* existing container */}
    <p className="font-medium text-foreground mb-0.5">{STAGE_MESSAGES[stageKey].title}</p>
    <p className="leading-relaxed">{STAGE_MESSAGES[stageKey].message}</p>
    {/* copy button */}
  </div>
</WipOverlay>
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/members/journey-sheet.tsx
git commit -m "feat: add WIP overlay to hardcoded member journey stage messages"
```

---

### Task 4: Wrap Conversion form hardcoded dropdowns

**Files:**
- Modify: `admin-ui/app/(dashboard)/conversions/new/conversion-form.tsx`

Multiple radio groups and selects use hardcoded values. Wrap each one individually.

- [ ] **Step 1: Add import**

```tsx
import { WipOverlay } from '@/components/ui/wip-overlay'
```

- [ ] **Step 2: Wrap conversion type select**

Find the `<SelectItem value="primeira_vez">` and `<SelectItem value="reconciliacao">` block (around line 189). Wrap the parent `<Select>` element:

```tsx
<WipOverlay>
  <Select ...>
    <SelectTrigger>...</SelectTrigger>
    <SelectContent>
      <SelectItem value="primeira_vez">Primeira Vez</SelectItem>
      <SelectItem value="reconciliacao">Reconciliação</SelectItem>
    </SelectContent>
  </Select>
</WipOverlay>
```

- [ ] **Step 3: Wrap "how they heard" radio group**

Find `<RadioGroupItem value="convite_amigo"` block (around line 216). Wrap the entire `<RadioGroup>`:

```tsx
<WipOverlay>
  <RadioGroup ...>
    {/* all radio items */}
  </RadioGroup>
</WipOverlay>
```

- [ ] **Step 4: Wrap gender radio group**

Find `<RadioGroupItem value="feminino"` block (around line 280). Wrap its `<RadioGroup>`:

```tsx
<WipOverlay>
  <RadioGroup ...>
    <RadioGroupItem value="feminino" ... />
    <RadioGroupItem value="masculino" ... />
  </RadioGroup>
</WipOverlay>
```

- [ ] **Step 5: Wrap civil status select**

Find `<SelectItem value="solteiro">` block (around line 329). Wrap its `<Select>`:

```tsx
<WipOverlay>
  <Select ...>
    <SelectTrigger>...</SelectTrigger>
    <SelectContent>
      <SelectItem value="solteiro">Solteiro</SelectItem>
      ...
    </SelectContent>
  </Select>
</WipOverlay>
```

- [ ] **Step 6: Commit**

```bash
git add app/\(dashboard\)/conversions/new/conversion-form.tsx
git commit -m "feat: add WIP overlay to hardcoded conversion form dropdowns"
```

---

### Task 5: Wrap role pickers in Users and Members management

**Files:**
- Modify: `admin-ui/app/(dashboard)/users/users-management.tsx`
- Modify: `admin-ui/app/(dashboard)/members/members-management.tsx`

`ROLE_OPTIONS` is rendered in a `<select>` (users) and `<Select>` (members) at lines 203 and 320 (users), 234 and 386 (members). Wrap each role picker.

- [ ] **Step 1: Add import to users-management.tsx**

```tsx
import { WipOverlay } from '@/components/ui/wip-overlay'
```

- [ ] **Step 2: Wrap both role selects in users-management.tsx**

Around line 203 — wrap the `<select>` element that maps `ROLE_OPTIONS`:
```tsx
<WipOverlay>
  <select id="role" ... >
    {ROLE_OPTIONS.map((opt) => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
</WipOverlay>
```

Do the same for the second occurrence around line 320.

- [ ] **Step 3: Add import to members-management.tsx**

```tsx
import { WipOverlay } from '@/components/ui/wip-overlay'
```

- [ ] **Step 4: Wrap both role selects in members-management.tsx**

Around lines 234 and 386 — wrap each `<Select>` that maps `ROLE_OPTIONS`:
```tsx
<WipOverlay>
  <Select ...>
    <SelectTrigger>...</SelectTrigger>
    <SelectContent>
      {ROLE_OPTIONS.map((opt) => (
        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</WipOverlay>
```

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/users/users-management.tsx app/\(dashboard\)/members/members-management.tsx
git commit -m "feat: add WIP overlay to hardcoded role pickers in users and members"
```

---

### Task 6: Wrap Life Groups meeting days picker

**Files:**
- Modify: `admin-ui/app/(dashboard)/life-groups/life-groups-management.tsx`

`MEETING_DAYS` is rendered in a `<Select>` around line 548. Wrap it.

- [ ] **Step 1: Add import**

```tsx
import { WipOverlay } from '@/components/ui/wip-overlay'
```

- [ ] **Step 2: Wrap the meeting day Select**

```tsx
<WipOverlay>
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
</WipOverlay>
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/life-groups/life-groups-management.tsx
git commit -m "feat: add WIP overlay to hardcoded meeting days picker in life groups"
```

---

### Task 7: Create `WipOverlay` Flutter widget

**Files:**
- Create: `mobile-app/lib/components/wip_overlay.dart`

- [ ] **Step 1: Create the widget**

```dart
// mobile-app/lib/components/wip_overlay.dart
import 'package:flutter/material.dart';

class WipOverlay extends StatelessWidget {
  const WipOverlay({super.key, required this.child, this.label = 'WIP'});

  final Widget child;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        child,
        Positioned(
          top: 4,
          right: 4,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.orange,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 1,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd mobile-app
git add lib/components/wip_overlay.dart
git commit -m "feat: add WipOverlay widget"
```

---

### Task 8: Wrap Academy course list with WIP overlay

**Files:**
- Modify: `mobile-app/lib/features/academy/academy_page.dart`

The `_CourseList` widget (passed `onTap: controller.onCourseTap`) is rendered in a `SliverToBoxAdapter` around line 122. Wrap its `Padding` with `WipOverlay`.

- [ ] **Step 1: Add import**

```dart
import 'package:paz_app/components/wip_overlay.dart';
```

- [ ] **Step 2: Wrap the _CourseList**

Find the `SliverToBoxAdapter` that holds `_CourseList` (around line 121):

```dart
SliverToBoxAdapter(
  child: WipOverlay(
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTokens.spaceLg),
      child: _CourseList(
        courses: selectedTrack.courses,
        onTap: controller.onCourseTap,
      ),
    ),
  ),
),
```

- [ ] **Step 3: Commit**

```bash
git add lib/features/academy/academy_page.dart
git commit -m "feat: add WIP overlay to academy course list (tap not implemented)"
```

---

### Task 9: Wrap Ministries video list with WIP overlay

**Files:**
- Modify: `mobile-app/lib/features/ministries/ministries_page.dart`

The `ListView.builder` renders video items with a silent error handler. Wrap the entire `ListView.builder` with `WipOverlay`.

- [ ] **Step 1: Add import**

```dart
import 'package:paz_app/components/wip_overlay.dart';
```

- [ ] **Step 2: Wrap the ListView.builder**

```dart
return WipOverlay(
  child: ListView.builder(
    itemCount: videos.items.length,
    itemBuilder: (context, index) {
      // existing item builder
    },
  ),
);
```

- [ ] **Step 3: Commit**

```bash
git add lib/features/ministries/ministries_page.dart
git commit -m "feat: add WIP overlay to ministries video list (error handling stub)"
```

---

### Task 10: Create root-level WIP features checklist

**Files:**
- Create: `docs/wip-features.md` (at repo root `/Users/jonathalima/Developer/church/docs/`)

- [ ] **Step 1: Create the file**

```markdown
# WIP Features

Features currently using hardcoded/mocked data instead of the real API and database.
Each item links to the relevant source file.

## admin-ui

- [ ] **Notification channels, roles, categories** — `app/(dashboard)/notifications/notification-system.tsx`
  - `CHANNELS`, `ROLES`, `CATEGORIES` arrays are hardcoded; should be fetched from the API.

- [ ] **Member Journey stage messages** — `app/(dashboard)/members/journey-sheet.tsx` + `lib/api/types/member-journey.ts`
  - `JOURNEY_STAGES` and `STAGE_MESSAGES` are hardcoded client-side; should come from the API.

- [ ] **Conversion form dropdown options** — `app/(dashboard)/conversions/new/conversion-form.tsx`
  - Conversion type, how-they-heard, gender, civil status, visit count, LG invite options are hardcoded.
  - Leader field is a free-text input instead of an API-backed dropdown.

- [ ] **Role pickers (Users + Members)** — `app/(dashboard)/users/users-management.tsx`, `app/(dashboard)/members/members-management.tsx`
  - `ROLE_OPTIONS` is hardcoded in both files; should be fetched from the API.

- [ ] **Life Groups meeting days** — `app/(dashboard)/life-groups/life-groups-management.tsx`
  - `MEETING_DAYS` is hardcoded; should come from an API enum or config endpoint.

## mobile-app

- [ ] **Academy course detail** — `lib/features/academy/academy_page.dart`, `lib/features/academy/academy_controller.dart`
  - `onCourseTap()` shows a snackbar stub. Course detail screen not yet implemented.

- [ ] **Ministries error handling** — `lib/features/ministries/ministries_controller.dart`
  - `catch` block in `fetchPlaylistVideos()` is empty; API failures are silently swallowed.
```

- [ ] **Step 2: Commit from root**

```bash
cd /path/to/church  # root repo
git add docs/wip-features.md
git commit -m "docs: add WIP features checklist"
```

---

## Self-Review

**Spec coverage:**
- ✅ WipOverlay React component (Task 1)
- ✅ Notification channels/roles/categories (Task 2)
- ✅ Member Journey stage messages (Task 3)
- ✅ Conversion form hardcoded dropdowns (Task 4)
- ✅ Users + Members role pickers (Task 5)
- ✅ Life Groups meeting days (Task 6)
- ✅ WipOverlay Flutter widget (Task 7)
- ✅ Academy course list overlay (Task 8)
- ✅ Ministries video list overlay (Task 9)
- ✅ Root-level wip-features.md (Task 10)

**No placeholders found.**

**Type consistency:** `WipOverlay` props (`children`, `label`, `className`) used consistently throughout. Flutter widget uses `child` and `label` consistently.
