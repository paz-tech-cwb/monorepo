# Guest Form — Casa de Paz Checkbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `via_casa_de_paz` boolean field to the existing Convidado (form-guests) form so leaders can flag when a guest was invited through a Casa de Paz event.

**Architecture:** Additive change only — one nullable boolean column on `form_guests` table, propagated through backend DTO/entity, admin-ui form, and KMP mobile (shared model + Android + iOS). No new tables, no new slugs, no new permissions.

**Tech Stack:** NestJS 11 / TypeORM / PostgreSQL 16 (backend) · Next.js 15 / React Hook Form + Zod (admin-ui) · Kotlin Multiplatform + Kotlinx Serialization (KMP shared/Android) · Swift / SwiftUI (iOS)

---

## File Map

| File | Change |
|------|--------|
| `backend/database/migrations/1780900000006-AddViaCasaDePazToFormGuests.ts` | New migration — add nullable boolean column |
| `backend/src/form-guests/entities/form-guest.entity.ts` | Add `viaCasaDePaz` column |
| `backend/src/form-guests/dto/create-form-guest.dto.ts` | Add optional `viaCasaDePaz` field |
| `admin-ui/app/(dashboard)/formularios/form-guests/new/form-guests-form.tsx` | Add checkbox UI field |
| `kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/Form.kt` | Add `viaCasaDePaz` to `GuestForm` |
| `kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailUiState.kt` | Add checkbox field def for Android |
| `kmp-mobile/ios/PazChurch/Features/Formularios/FormDetailView.swift` | Add checkbox field def + map in submission for iOS |

---

## Task 1: Backend — Migration

**Files:**
- Create: `backend/database/migrations/1780900000006-AddViaCasaDePazToFormGuests.ts`

- [ ] **Step 1: Create the migration file**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddViaCasaDePazToFormGuests1780900000006
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "form_guests" ADD COLUMN "via_casa_de_paz" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "form_guests" DROP COLUMN "via_casa_de_paz"`,
    );
  }
}
```

- [ ] **Step 2: Run the migration**

```bash
cd backend
npm run migration:run
```

Expected: `query: ALTER TABLE "form_guests" ADD COLUMN "via_casa_de_paz" boolean NOT NULL DEFAULT false`

- [ ] **Step 3: Commit**

```bash
cd backend
git add database/migrations/1780900000006-AddViaCasaDePazToFormGuests.ts
git commit -m "feat: add via_casa_de_paz column to form_guests"
```

---

## Task 2: Backend — Entity + DTO

**Files:**
- Modify: `backend/src/form-guests/entities/form-guest.entity.ts`
- Modify: `backend/src/form-guests/dto/create-form-guest.dto.ts`

- [ ] **Step 1: Add column to entity**

In `form-guest.entity.ts`, add after the `notes` column:

```typescript
@Column({ name: 'via_casa_de_paz', type: 'boolean', default: false })
viaCasaDePaz: boolean;
```

Full updated file:
```typescript
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('form_guests')
export class FormGuest {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'full_name', type: 'varchar', length: 180 }) fullName: string;
  @Column({ type: 'varchar', length: 180, nullable: true }) email: string | null;
  @Column({ type: 'varchar', length: 32 }) phone: string;
  @Column({ type: 'text', nullable: true }) address: string | null;
  @Column({ name: 'invited_by', type: 'varchar', length: 180 }) invitedBy: string;
  @Column({ name: 'how_met_church', type: 'varchar', length: 40, nullable: true }) howMetChurch: string | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ name: 'via_casa_de_paz', type: 'boolean', default: false }) viaCasaDePaz: boolean;
  @Column({ name: 'area_id', type: 'int', nullable: true }) areaId: number | null;
  @Column({ name: 'sector_id', type: 'int', nullable: true }) sectorId: number | null;
  @Column({ name: 'life_group_id', type: 'int', nullable: true }) lifeGroupId: number | null;
  @ManyToOne(() => User, { nullable: false }) submittedBy: User;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt: Date | null;
}
```

- [ ] **Step 2: Add field to DTO**

In `create-form-guest.dto.ts`, add after the `notes` field:

```typescript
@Expose({ name: 'via_casa_de_paz' })
@IsOptional()
@IsBoolean()
viaCasaDePaz?: boolean;
```

Add `IsBoolean` to the import line:
```typescript
import { IsBoolean, IsInt, IsOptional, IsString, Matches } from 'class-validator';
```

- [ ] **Step 3: Verify the backend compiles**

```bash
cd backend
npm run build 2>&1 | tail -5
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
cd backend
git add src/form-guests/entities/form-guest.entity.ts src/form-guests/dto/create-form-guest.dto.ts
git commit -m "feat: expose via_casa_de_paz in FormGuest entity and DTO"
```

---

## Task 3: Admin-UI — Form checkbox

**Files:**
- Modify: `admin-ui/app/(dashboard)/formularios/form-guests/new/form-guests-form.tsx`

- [ ] **Step 1: Add `via_casa_de_paz` to the Zod schema**

In `form-guests-form.tsx`, add to the `schema` object:

```typescript
via_casa_de_paz: z.boolean().optional(),
```

- [ ] **Step 2: Add the Checkbox import**

Add to the existing imports at the top of the file:

```typescript
import { Checkbox } from "@/components/ui/checkbox"
```

- [ ] **Step 3: Add the checkbox field to the form JSX**

Add this block after the `Observações` textarea and before the submit button:

```tsx
<div className="flex items-center gap-2">
  <Controller
    control={control}
    name="via_casa_de_paz"
    render={({ field }) => (
      <Checkbox
        id="via_casa_de_paz"
        checked={field.value ?? false}
        onCheckedChange={field.onChange}
      />
    )}
  />
  <Label htmlFor="via_casa_de_paz">Convidado veio de uma Casa de Paz</Label>
</div>
```

- [ ] **Step 4: Verify the form renders without errors**

```bash
cd admin-ui
npm run lint
```

Expected: no lint errors.

- [ ] **Step 5: Commit**

```bash
cd admin-ui
git add app/\(dashboard\)/formularios/form-guests/new/form-guests-form.tsx
git commit -m "feat: add casa de paz checkbox to guest form"
```

---

## Task 4: KMP Shared — GuestForm model

**Files:**
- Modify: `kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/Form.kt`

- [ ] **Step 1: Add `viaCasaDePaz` to `GuestForm`**

Find the `GuestForm` data class (line ~70) and add the new field:

```kotlin
@Serializable
data class GuestForm(
    val name: String,
    val phone: String? = null,
    @SerialName("invited_by") val invitedBy: String? = null,
    @SerialName("via_casa_de_paz") val viaCasaDePaz: Boolean = false,
    val date: String,
)
```

- [ ] **Step 2: Verify shared module compiles**

```bash
cd kmp-mobile
./gradlew :shared:compileKotlinIosArm64 --quiet 2>&1 | tail -10
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 3: Commit**

```bash
cd kmp-mobile
git add shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/Form.kt
git commit -m "feat: add viaCasaDePaz to GuestForm shared model"
```

---

## Task 5: KMP Android — Form field definition

**Files:**
- Modify: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailUiState.kt`

- [ ] **Step 1: Add checkbox field def for Android**

Find the `FormType.guest ->` block (around line 44) and add the `via_casa_de_paz` field:

```kotlin
FormType.guest ->
    listOf(
        FormFieldDef("name", "Nome do Visitante", "Nome completo", required = true, fieldType = FormFieldType.NAME),
        FormFieldDef("phone", "Telefone", "(41) 9 9999-9999", fieldType = FormFieldType.PHONE),
        FormFieldDef("invited_by", "Convidado por", "Nome de quem convidou"),
        FormFieldDef("via_casa_de_paz", "Veio de uma Casa de Paz?", fieldType = FormFieldType.BOOLEAN),
        FormFieldDef("date", "Data da Visita", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
    )
```

> **Note:** `FormFieldType.BOOLEAN` renders as a checkbox/toggle. If that enum value doesn't exist yet, check `FormFieldType` enum and use the correct existing value (e.g. `CHECKBOX`) or add `BOOLEAN` to it.

- [ ] **Step 2: Check FormFieldType enum for the boolean/checkbox variant**

```bash
grep -n "BOOLEAN\|CHECKBOX\|TOGGLE" /Users/jonathalima/Developer/church/kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailUiState.kt
```

If no match, add it to the enum (look for the `enum class FormFieldType` definition in the same file or adjacent file) and add the rendering case in the form composable.

- [ ] **Step 3: Map `via_casa_de_paz` in the Android submission**

Find where Android assembles the `GuestForm` for submission and add the field:

```bash
grep -n "GuestForm\|submitGuest" /Users/jonathalima/Developer/church/kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailViewModel.kt
```

Update the `GuestForm(...)` instantiation to include:
```kotlin
viaCasaDePaz = fields["via_casa_de_paz"]?.toBooleanStrictOrNull() ?: false,
```

- [ ] **Step 4: Build Android**

```bash
cd kmp-mobile
./gradlew :android:assembleDebug --quiet 2>&1 | tail -10
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
cd kmp-mobile
git add android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailUiState.kt android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailViewModel.kt
git commit -m "feat: add via_casa_de_paz checkbox to Android guest form"
```

---

## Task 6: KMP iOS — Form field definition + submission

**Files:**
- Modify: `kmp-mobile/ios/PazChurch/Features/Formularios/FormDetailView.swift`

- [ ] **Step 1: Add checkbox field to iOS guest form definition**

Find the `case .guest:` array definition (around line 56) and add the `via_casa_de_paz` field:

```swift
case .guest:
    [
        FormFieldDef("name", "Nome do Visitante", placeholder: "Nome completo", required: true, fieldType: .name),
        FormFieldDef("phone", "Telefone", placeholder: "(41) 9 9999-9999", fieldType: .phone),
        FormFieldDef("invited_by", "Convidado por", placeholder: "Nome de quem convidou"),
        FormFieldDef("via_casa_de_paz", "Veio de uma Casa de Paz?", placeholder: "", fieldType: .toggle),
        FormFieldDef("date", "Data da Visita", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
    ]
```

> **Note:** Use `.toggle` if that `FormFieldType` case exists. Check with:
> ```bash
> grep -n "toggle\|boolean\|checkbox" /Users/jonathalima/Developer/church/kmp-mobile/ios/PazChurch/Features/Formularios/FormDetailView.swift
> ```
> Use the matching existing case, or add `.toggle` and its rendering in the form's `switch fieldType` block.

- [ ] **Step 2: Map `via_casa_de_paz` in the iOS guest submission**

Find the `case .guest:` submission block (around line 244) and update:

```swift
case .guest:
    _ = try await formsRepository.submitGuest(form: GuestForm(
        name: req("name"),
        phone: opt("phone"),
        invitedBy: opt("invited_by"),
        viaCasaDePaz: fields["via_casa_de_paz"] == "true",
        date: req("date")
    ))
```

- [ ] **Step 3: Build iOS**

```bash
cd kmp-mobile
./gradlew assembleSharedXCFramework --quiet 2>&1 | tail -5
xcodebuild -workspace ios/PazChurch.xcworkspace -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | grep -E "error:|BUILD"
```

Expected: BUILD SUCCEEDED

- [ ] **Step 4: Commit**

```bash
cd kmp-mobile
git add ios/PazChurch/Features/Formularios/FormDetailView.swift
git commit -m "feat: add via_casa_de_paz checkbox to iOS guest form"
```

---

## Task 7: Root repo — update submodule pointers

- [ ] **Step 1: Update root repo**

```bash
cd /Users/jonathalima/Developer/church
git add backend kmp-mobile admin-ui
git commit -m "chore: update submodule pointers — guest form casa de paz checkbox"
```
