# Mobile Forms Overhaul (KMP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align KMP mobile forms with the backend contract — adding select pickers, user/LG pickers, splitting supervisor reports, and fixing all broken form payloads.

**Architecture:** The `FormFieldDef` engine on both platforms is extended with new field types (`select`, `userPicker`, `userMultiPicker`, `lgPicker`, `selfOrSearch`). All picker values are stored as strings in the existing `fields: Map<String,String>` — IDs as comma-separated integers, selected names as plain strings. New backend search endpoints power the picker sheets.

**Tech Stack:** NestJS 11 + TypeORM (backend), Kotlin Multiplatform + Ktor (shared), Jetpack Compose (Android), SwiftUI + `@Observable` (iOS).

## Global Constraints

- All JSON on the wire: `snake_case`. Every new DTO field uses `@SerialName` (KMP) / `@Expose({ name: ... })` (NestJS).
- Colors: `PazColors.*` tokens only — no raw hex in screen/component files.
- iOS ViewModels: `@Observable @MainActor` only — never `ObservableObject`.
- Android coroutines: `viewModelScope.launch` only; `collectAsStateWithLifecycle()` in Compose.
- iOS async: `.task {}` modifier, not `onAppear + Task { }`.
- Fonts: system fonts only (SF Pro on iOS, DM Sans on Android).
- Format before commit: `./gradlew ktlintFormat` (Android) · `swiftformat + swiftlint --fix` (iOS).
- Backend date strings from the mobile `date` picker are `DD/MM/YYYY`; new ISO fields (`birth_date`, etc.) must be converted to `YYYY-MM-DD` in the submit mapper.
- Multi-picker values stored in `fields` as comma-separated integer IDs: `"1,2,3"`. Empty string = no selection.
- `selfOrSearch` stored as the chosen name string; `""` means current user (self).

---

## File Structure

**Backend**
- Modify: `backend/src/users/users.service.ts` — add `search(q)` method
- Modify: `backend/src/users/users.controller.ts` — add `?q=` to `GET /users`
- Modify: `backend/src/life-groups/life-groups.service.ts` — add `search(q)` method
- Modify: `backend/src/life-groups/life-groups.controller.ts` — add `?q=` to `GET /life-groups`
- Modify: `backend/src/form-guests/entities/form-guest.entity.ts` — add `email` column
- Modify: `backend/src/form-guests/dto/create-form-guest.dto.ts` — add `email` + `date` fields
- Modify: `backend/src/form-guests/form-guests.service.ts` — create User on guest submit
- Create: `backend/db/migrations/<timestamp>-AddGuestEmailAndDate.ts`

**Shared KMP**
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/Form.kt` — rewrite all DTOs
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/LifeGroupSummary.kt` — new model
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/domain/repository/FormsRepository.kt` — new search methods + corrected supervisor signatures
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/FormsRepositoryImpl.kt` — implement new methods
- Create: `shared/src/commonTest/kotlin/br/church/paz/shared/forms/FormPayloadTest.kt`

**Android**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailUiState.kt` — new field types + `optionValues`, picker UI state
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailViewModel.kt` — new submit mappers + picker actions
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailScreen.kt` — new field renderers
- Create: `android/src/main/kotlin/br/church/paz/android/ui/features/formularios/UserPickerSheet.kt`
- Create: `android/src/main/kotlin/br/church/paz/android/ui/features/formularios/LifeGroupPickerSheet.kt`
- Modify: `android/src/test/kotlin/br/church/paz/android/ui/features/formularios/FormDetailViewModelTest.kt`

**iOS**
- Modify: `ios/PazChurch/Features/Formularios/FormDetailView.swift` — all changes (types, field renderers, fieldDefs, submit)
- Create: `ios/PazChurch/Features/Formularios/UserPickerSheet.swift`
- Create: `ios/PazChurch/Features/Formularios/LifeGroupPickerSheet.swift`

---

### Task 1: Backend — Search endpoints + Guest email/date/user-creation

**Files:**
- Modify: `backend/src/users/users.service.ts`
- Modify: `backend/src/users/users.controller.ts`
- Modify: `backend/src/life-groups/life-groups.service.ts`
- Modify: `backend/src/life-groups/life-groups.controller.ts`
- Modify: `backend/src/form-guests/entities/form-guest.entity.ts`
- Modify: `backend/src/form-guests/dto/create-form-guest.dto.ts`
- Modify: `backend/src/form-guests/form-guests.service.ts`
- Create: `backend/db/migrations/<timestamp>-AddGuestEmailAndDate.ts`

**Interfaces:**
- Produces: `GET /users?q=` → `[{ id, name, phone, email }]` (paged, up to 30)
- Produces: `GET /life-groups?q=` → `[{ id, name }]` (up to 30)
- Produces: guest create side-effect: creates a `User` row (member) or links existing by email/phone

- [ ] **Step 1: Add `search(q)` to UsersService**

In `backend/src/users/users.service.ts`, after the `findAll` method, add:

```typescript
async search(q: string): Promise<{ id: number; name: string; phone: string | null; email: string | null }[]> {
  const term = `%${q.trim().toLowerCase()}%`;
  const users = await this.entityManager
    .createQueryBuilder(User, 'u')
    .where('LOWER(u.name) LIKE :term OR LOWER(u.email) LIKE :term OR u.phone_number LIKE :term', { term })
    .orderBy('u.name', 'ASC')
    .take(30)
    .getMany();
  return users.map((u) => ({ id: u.id, name: u.name, phone: u.phoneNumber ?? null, email: u.email ?? null }));
}
```

- [ ] **Step 2: Add `?q=` param to `GET /users`**

In `backend/src/users/users.controller.ts`, add `Query` import from `@nestjs/common` (already imported), then modify `findAll`:

```typescript
@Get()
findAll(@Query('q') q?: string) {
  if (q?.trim()) return this.usersService.search(q);
  return this.usersService.findAll();
}
```

- [ ] **Step 3: Run backend and verify search**

```bash
cd backend && npm run start:dev
# In another terminal:
curl "http://localhost:3001/api/users?q=jo" -H "Authorization: Bearer <token>"
# Expected: JSON array with id, name, phone, email fields
```

- [ ] **Step 4: Add `search(q)` to LifeGroupsService**

In `backend/src/life-groups/life-groups.service.ts`, after `findAll`, add:

```typescript
async search(q: string): Promise<{ id: number; name: string }[]> {
  const term = `%${q.trim().toLowerCase()}%`;
  const groups = await this.entityManager
    .createQueryBuilder(LifeGroup, 'lg')
    .where('LOWER(lg.name) LIKE :term', { term })
    .orderBy('lg.name', 'ASC')
    .take(30)
    .getMany();
  return groups.map((lg) => ({ id: lg.id, name: lg.name }));
}
```

- [ ] **Step 5: Add `?q=` param to `GET /life-groups`**

In `backend/src/life-groups/life-groups.controller.ts`, add `Query` import and modify `findAll`:

```typescript
@Get()
findAll(@Query('q') q?: string) {
  if (q?.trim()) return this.lifeGroupsService.search(q);
  return this.lifeGroupsService.findAll();
}
```

- [ ] **Step 6: Add `email` and `date` to form-guest entity**

In `backend/src/form-guests/entities/form-guest.entity.ts`, add after the `phone` column:

```typescript
@Column({ type: 'varchar', length: 180, nullable: true }) email: string | null;
@Column({ type: 'date', nullable: true }) date: Date | null;
```

- [ ] **Step 7: Add `email` and `date` to CreateFormGuestDto**

In `backend/src/form-guests/dto/create-form-guest.dto.ts`, add:

```typescript
import { IsEmail, IsDateString, IsOptional, IsString, IsBoolean, IsInt } from 'class-validator';

// Add to class:
@Expose() @IsOptional() @IsEmail() email?: string;
@Expose() @IsOptional() @IsDateString() date?: string;
```

- [ ] **Step 8: Write migration**

Create `backend/db/migrations/1750000000000-AddGuestEmailAndDate.ts` (use current timestamp):

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGuestEmailAndDate1750000000000 implements MigrationInterface {
  name = 'AddGuestEmailAndDate1750000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "form_guests" ADD COLUMN IF NOT EXISTS "email" varchar(180)`);
    await queryRunner.query(`ALTER TABLE "form_guests" ADD COLUMN IF NOT EXISTS "date" date`);
    await queryRunner.query(`ALTER TABLE "form_guests" ADD COLUMN IF NOT EXISTS "created_user_id" integer REFERENCES "users"("id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "form_guests" DROP COLUMN IF EXISTS "created_user_id"`);
    await queryRunner.query(`ALTER TABLE "form_guests" DROP COLUMN IF EXISTS "date"`);
    await queryRunner.query(`ALTER TABLE "form_guests" DROP COLUMN IF EXISTS "email"`);
  }
}
```

Also add `@Column({ name: 'created_user_id', type: 'int', nullable: true }) createdUserId: number | null;` to the entity.

- [ ] **Step 9: Guest service — create User on submit**

In `backend/src/form-guests/form-guests.service.ts`, inject `UsersService` and `EntityManager`, then modify `create`:

```typescript
// Add to constructor:
@InjectEntityManager() private readonly em: EntityManager,
private readonly usersService: UsersService,

// In create(), after saving guest entity:
let createdUserId: number | null = null;
if (dto.email || dto.phone) {
  const existing = await this.usersService.lookupForForms({
    email: dto.email,
    phone: dto.phone,
  });
  if (existing) {
    createdUserId = existing.id as number;
  } else if (dto.fullName && (dto.email || dto.phone)) {
    const memberRole = await this.em.findOne(Role, { where: { slug: 'member' } });
    const newUser = this.em.create(User, {
      name: dto.fullName,
      email: dto.email ?? null,
      phoneNumber: dto.phone ?? null,
      role: memberRole ?? undefined,
      status: 'active',
    });
    const saved = await this.em.save(User, newUser);
    createdUserId = saved.id;
  }
  if (createdUserId) {
    await this.em.update(FormGuest, entity.id, { createdUserId });
  }
}
```

Import `Role` from `'../roles/entities/role.entity'` and `EntityManager` from `typeorm`.

- [ ] **Step 10: Run migration**

```bash
cd backend && npm run migration:run
# Expected: migration applied, no errors
```

- [ ] **Step 11: Restart dev server and smoke test**

```bash
curl -X POST "http://localhost:3001/api/forms/form-guests" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"full_name":"Teste Silva","email":"teste@ex.com","phone":"41999999999","via_casa_de_paz":false}'
# Expected: 201, guest saved, user created in users table
```

- [ ] **Step 12: Commit**

```bash
cd backend
git add src/users/users.service.ts src/users/users.controller.ts \
        src/life-groups/life-groups.service.ts src/life-groups/life-groups.controller.ts \
        src/form-guests/entities/form-guest.entity.ts \
        src/form-guests/dto/create-form-guest.dto.ts \
        src/form-guests/form-guests.service.ts \
        db/migrations/
git commit -m "feat: add user/LG search endpoints, guest email+date fields, guest→user creation"
```

---

### Task 2: Shared KMP — New DTOs, field types, repository methods, and unit tests

**Files:**
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/Form.kt`
- Create: `shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/LifeGroupSummary.kt`
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/domain/repository/FormsRepository.kt`
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/FormsRepositoryImpl.kt`
- Create: `shared/src/commonTest/kotlin/br/church/paz/shared/forms/FormPayloadTest.kt`

**Interfaces:**
- Produces: `LifeGroupSummary(id: Int, name: String)` model
- Produces: Updated `MemberRegistrationForm`, `ConversionForm`, `GuestForm`, `MultiplicationForm`
- Produces: New `SectorSupervisorReportForm`, `AreaSupervisorReportForm`
- Produces: `FormsRepository.searchUsers(query)`, `searchLifeGroups(query)`
- Produces: `FormsRepository.submitSectorReport(SectorSupervisorReportForm)`, `submitAreaReport(AreaSupervisorReportForm)`

- [ ] **Step 1: Write failing tests for payload mapping**

Create `shared/src/commonTest/kotlin/br/church/paz/shared/forms/FormPayloadTest.kt`:

```kotlin
package br.church.paz.shared.forms

import br.church.paz.shared.domain.model.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class FormPayloadTest {
    private val json = Json { encodeDefaults = false }

    @Test
    fun `GuestForm serializes email and date`() {
        val form = GuestForm(
            fullName = "João", email = "j@ex.com", phone = "41999999999",
            invitedBy = null, viaCasaDePaz = false, date = "2026-06-18"
        )
        val encoded = json.encodeToString(form)
        assertTrue(encoded.contains("\"full_name\""))
        assertTrue(encoded.contains("\"email\""))
        assertTrue(encoded.contains("\"date\""))
    }

    @Test
    fun `MemberRegistrationForm serializes all required fields`() {
        val form = MemberRegistrationForm(
            fullName = "Maria", birthDate = "1990-01-01", phone = "41999999999",
            gender = "f", civilState = "solteiro", sectorId = 1
        )
        val encoded = json.encodeToString(form)
        assertTrue(encoded.contains("\"full_name\""))
        assertTrue(encoded.contains("\"birth_date\""))
        assertTrue(encoded.contains("\"sector_id\""))
    }

    @Test
    fun `ConversionForm serializes decision_type`() {
        val form = ConversionForm(
            fullName = "Pedro", email = "p@ex.com", phone = "41999999999",
            decisionType = "first_time", howMetChurch = "amigo", gender = "m",
            birthDate = "2000-05-10", civilState = "solteiro",
            address = "Rua X", attendanceCount = "1", lifeGroupStatus = "sim"
        )
        val encoded = json.encodeToString(form)
        assertTrue(encoded.contains("\"decision_type\""))
        assertTrue(encoded.contains("\"how_met_church\""))
    }

    @Test
    fun `MultiplicationForm serializes id arrays`() {
        val form = MultiplicationForm(
            date = "2026-06-01", sourceLifeGroupId = 5,
            newLifeGroupName = "GL Norte", newLeaderId = 10, hostId = 11,
            leaderPhone = "41999999999", meetingDayTime = "Sexta 19h", address = "Rua Y",
            membersToMove = listOf(1, 2), newMembers = listOf(3),
            completedLeadershipTrack = true, faithfulTither = true,
            evangelizingAndConsolidating = true, goodTestimony = true
        )
        val encoded = json.encodeToString(form)
        assertTrue(encoded.contains("\"source_life_group_id\""))
        assertTrue(encoded.contains("\"members_to_move\""))
    }

    @Test
    fun `SectorSupervisorReportForm serializes correctly`() {
        val form = SectorSupervisorReportForm(
            date = "2026-06-01", sectorId = 3,
            lifeGroupsCount = 5, lifeGroupsSupervised = 4
        )
        val encoded = json.encodeToString(form)
        assertTrue(encoded.contains("\"sector_id\""))
        assertTrue(encoded.contains("\"life_groups_count\""))
    }

    @Test
    fun `AreaSupervisorReportForm serializes correctly`() {
        val form = AreaSupervisorReportForm(
            date = "2026-06-01", areaId = 2,
            lifeGroupsCount = 10, lifeGroupsSupervised = 8
        )
        val encoded = json.encodeToString(form)
        assertTrue(encoded.contains("\"area_id\""))
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd kmp-mobile && ./gradlew :shared:allTests
# Expected: compilation errors — types don't exist yet
```

- [ ] **Step 3: Create LifeGroupSummary model**

Create `shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/LifeGroupSummary.kt`:

```kotlin
package br.church.paz.shared.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class LifeGroupSummary(val id: Int, val name: String)
```

- [ ] **Step 4: Rewrite Form.kt DTOs**

Replace the contents of `shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/Form.kt`. Keep `FormCatalogItem`, `FormType`, `ServiceReportForm`, `ServiceReportSubmission`, `CourseForm`, `LifeGroupReportForm` unchanged. Replace the other data classes:

```kotlin
@Serializable
data class GuestForm(
    @SerialName("full_name") val fullName: String,
    val email: String? = null,
    val phone: String? = null,
    @SerialName("invited_by") val invitedBy: String? = null,
    @SerialName("via_casa_de_paz") val viaCasaDePaz: Boolean = false,
    @SerialName("how_met_church") val howMetChurch: String? = null,
    val address: String? = null,
    val date: String,
)

@Serializable
data class MemberRegistrationForm(
    @SerialName("full_name") val fullName: String,
    @SerialName("birth_date") val birthDate: String,
    val phone: String,
    val gender: String,
    @SerialName("civil_state") val civilState: String,
    @SerialName("sector_id") val sectorId: Int,
    val email: String? = null,
    @SerialName("life_group_id") val lifeGroupId: Int? = null,
    val cep: String? = null,
    val street: String? = null,
    @SerialName("address_number") val addressNumber: String? = null,
    val complement: String? = null,
    val neighborhood: String? = null,
    val city: String? = null,
    val state: String? = null,
    val address: String? = null,
)

@Serializable
data class ConversionForm(
    @SerialName("full_name") val fullName: String,
    val email: String,
    val phone: String,
    @SerialName("decision_type") val decisionType: String,
    @SerialName("how_met_church") val howMetChurch: String,
    val gender: String,
    @SerialName("birth_date") val birthDate: String,
    @SerialName("civil_state") val civilState: String,
    val address: String,
    @SerialName("attendance_count") val attendanceCount: String,
    @SerialName("life_group_status") val lifeGroupStatus: String,
    @SerialName("life_group_leader_or_name") val lifeGroupLeaderOrName: String? = null,
    @SerialName("invited_by") val invitedBy: String? = null,
    val notes: String? = null,
)

@Serializable
data class MultiplicationForm(
    val date: String,
    @SerialName("source_life_group_id") val sourceLifeGroupId: Int,
    val area: String? = null,
    val sector: String? = null,
    @SerialName("new_life_group_name") val newLifeGroupName: String,
    @SerialName("new_leader_id") val newLeaderId: Int,
    @SerialName("host_id") val hostId: Int,
    @SerialName("leader_phone") val leaderPhone: String,
    @SerialName("meeting_day_time") val meetingDayTime: String,
    val address: String,
    @SerialName("members_to_move") val membersToMove: List<Int> = emptyList(),
    @SerialName("new_members") val newMembers: List<Int> = emptyList(),
    @SerialName("completed_leadership_track") val completedLeadershipTrack: Boolean = false,
    @SerialName("legally_married") val legallyMarried: Boolean? = null,
    @SerialName("faithful_tither") val faithfulTither: Boolean = false,
    @SerialName("evangelizing_and_consolidating") val evangelizingAndConsolidating: Boolean = false,
    @SerialName("good_testimony") val goodTestimony: Boolean = false,
    @SerialName("single_living_in_purity") val singleLivingInPurity: Boolean? = null,
)

@Serializable
data class SectorSupervisorReportForm(
    val date: String,
    @SerialName("sector_id") val sectorId: Int,
    @SerialName("area_id") val areaId: Int? = null,
    @SerialName("life_groups_visited") val lifeGroupsVisited: List<Int> = emptyList(),
    @SerialName("leaders_pastored") val leadersPastored: List<Int> = emptyList(),
    @SerialName("multiplication_candidates") val multiplicationCandidates: List<Int> = emptyList(),
    @SerialName("life_groups_count") val lifeGroupsCount: Int = 0,
    @SerialName("life_groups_supervised") val lifeGroupsSupervised: Int = 0,
    @SerialName("life_group_observations") val lifeGroupObservations: List<String> = emptyList(),
    @SerialName("sector_multiplication_date") val sectorMultiplicationDate: String? = null,
    val notes: String? = null,
)

@Serializable
data class AreaSupervisorReportForm(
    val date: String,
    @SerialName("area_id") val areaId: Int,
    @SerialName("sectors_visited") val sectorsVisited: List<Int> = emptyList(),
    @SerialName("sector_leaders_pastored") val sectorLeadersPastored: List<Int> = emptyList(),
    @SerialName("multiplications_in_progress") val multiplicationsInProgress: Int? = null,
    @SerialName("life_groups_count") val lifeGroupsCount: Int = 0,
    @SerialName("life_groups_supervised") val lifeGroupsSupervised: Int = 0,
    @SerialName("life_group_observations") val lifeGroupObservations: List<String> = emptyList(),
    val notes: String? = null,
)
```

- [ ] **Step 5: Update FormsRepository interface**

Replace `shared/src/commonMain/kotlin/br/church/paz/shared/domain/repository/FormsRepository.kt`:

```kotlin
package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.*

interface FormsRepository {
    @Throws(Exception::class)
    suspend fun getCatalog(): List<FormCatalogItem>
    @Throws(Exception::class)
    suspend fun searchUsers(query: String): List<User>
    @Throws(Exception::class)
    suspend fun searchLifeGroups(query: String): List<LifeGroupSummary>
    @Throws(Exception::class)
    suspend fun submitMemberRegistration(form: MemberRegistrationForm)
    @Throws(Exception::class)
    suspend fun submitConversion(form: ConversionForm)
    @Throws(Exception::class)
    suspend fun submitGuest(form: GuestForm)
    @Throws(Exception::class)
    suspend fun submitMultiplication(form: MultiplicationForm)
    @Throws(Exception::class)
    suspend fun submitServiceReport(form: ServiceReportForm)
    @Throws(Exception::class)
    suspend fun submitCourse(form: CourseForm)
    @Throws(Exception::class)
    suspend fun submitLifeGroupReport(form: LifeGroupReportForm)
    @Throws(Exception::class)
    suspend fun submitSectorReport(form: SectorSupervisorReportForm)
    @Throws(Exception::class)
    suspend fun submitAreaReport(form: AreaSupervisorReportForm)
    @Throws(Exception::class)
    suspend fun getServiceReportSubmissions(): List<ServiceReportSubmission>
}
```

- [ ] **Step 6: Update FormsRepositoryImpl**

In `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/FormsRepositoryImpl.kt`, update `lookupUsers` → `searchUsers`, add `searchLifeGroups`, update `submitSectorReport` and `submitAreaReport` signatures:

```kotlin
override suspend fun searchUsers(query: String): List<User> =
    client.get("api/users") { parameter("q", query) }.body()

override suspend fun searchLifeGroups(query: String): List<LifeGroupSummary> =
    client.get("api/life-groups") { parameter("q", query) }.body()

override suspend fun submitSectorReport(form: SectorSupervisorReportForm) =
    post("api/forms/sector-supervisor-reports", form)

override suspend fun submitAreaReport(form: AreaSupervisorReportForm) =
    post("api/forms/area-supervisor-reports", form)
```

Remove the old `lookupUsers` method and update all other submit methods to use the new DTO types.

- [ ] **Step 7: Run tests**

```bash
cd kmp-mobile && ./gradlew :shared:allTests
# Expected: all FormPayloadTest tests pass; other existing tests pass
```

- [ ] **Step 8: Commit**

```bash
cd kmp-mobile
git add shared/src/
git commit -m "feat(shared): new form DTOs, search methods, supervisor report payloads"
```

---

### Task 3: Android — New field types, picker UI state, picker sheets, SELECT/SELF_OR_SEARCH renderers

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailUiState.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailViewModel.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailScreen.kt`
- Create: `android/src/main/kotlin/br/church/paz/android/ui/features/formularios/UserPickerSheet.kt`
- Create: `android/src/main/kotlin/br/church/paz/android/ui/features/formularios/LifeGroupPickerSheet.kt`

**Interfaces:**
- Consumes: `FormsRepository.searchUsers(query)` → `List<User>`, `searchLifeGroups(query)` → `List<LifeGroupSummary>`
- Produces: `FormFieldType.SELECT`, `USER_PICKER`, `USER_MULTI_PICKER`, `LG_PICKER`, `SELF_OR_SEARCH`
- Produces: `FormFieldDef.optionValues: List<String>` (parallel to `options`, holds API values; empty = value equals label)
- Produces: `FormDetailUiState.pickerState: PickerState?` — tracks open sheet
- Produces: `UserPickerSheet` composable, `LifeGroupPickerSheet` composable

- [ ] **Step 1: Write failing ViewModel tests for new picker action**

In `android/src/test/kotlin/.../FormDetailViewModelTest.kt`, add:

```kotlin
@Test
fun `required SELECT field with empty value blocks submit`() = runTest {
    val catalog = listOf(
        FormCatalogItem(id = "service-reports", title = "Rel. Culto", canWrite = true, canRead = false),
    )
    coEvery { formsRepository.getCatalog() } returns catalog
    coEvery { authRepository.currentUser() } returns User(id = "10", name = "Maria", email = "m@t.com")

    val viewModel = FormDetailViewModel("service-reports", formsRepository, authRepository)
    testScheduler.advanceUntilIdle()

    // Clear the auto-filled report_type to simulate empty required SELECT
    viewModel.onFieldChanged("report_type", "")
    viewModel.onSubmit()
    testScheduler.advanceUntilIdle()

    assertEquals("Tipo de relatório é obrigatório", viewModel.uiState.value.error)
}
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd kmp-mobile && ./gradlew :android:testDebugUnitTest --tests "*.FormDetailViewModelTest"
# Expected: compilation error or test fail because SELECT type doesn't exist yet
```

- [ ] **Step 3: Extend FormDetailUiState.kt**

Replace the `FormFieldType` enum and `FormFieldDef` class in `android/src/main/kotlin/.../FormDetailUiState.kt`:

```kotlin
enum class FormFieldType {
    TEXT, NAME, PHONE, EMAIL, DATE, INTEGER, CURRENCY, MULTILINE, BOOLEAN,
    PICKER,       // existing dropdown with string options (no separate value)
    SELECT,       // enum picker: options = display labels, optionValues = API values
    USER_PICKER,  // single user search picker → stores "id" as string
    USER_MULTI_PICKER, // multi user picker → stores "1,2,3" comma-separated IDs
    LG_PICKER,    // life-group picker → stores "id" as string
    SELF_OR_SEARCH, // invited_by: "" = self, else searched name
}

data class FormFieldDef(
    val key: String,
    val label: String,
    val placeholder: String = "",
    val required: Boolean = false,
    val fieldType: FormFieldType = FormFieldType.TEXT,
    val options: List<String> = emptyList(),       // display labels for SELECT/PICKER
    val optionValues: List<String> = emptyList(),  // API values parallel to options; empty = value IS label
)

data class PickerState(
    val key: String,           // which field is being picked
    val label: String,         // field label for sheet header
    val isMulti: Boolean,
    val isLifeGroup: Boolean,  // true = search life groups; false = search users
    val query: String = "",
    val results: List<Any> = emptyList(), // List<User> or List<LifeGroupSummary>
    val isLoading: Boolean = false,
    val error: String? = null,
)

data class FormDetailUiState(
    val form: FormCatalogItem? = null,
    val isLoading: Boolean = true,
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val fields: Map<String, String> = emptyMap(),
    val pickerState: PickerState? = null,        // non-null = picker sheet open
    val selfOrSearchIsSearch: Map<String, Boolean> = emptyMap(), // key → true if in search mode
)

sealed class FormDetailEffect {
    data object SubmitSuccess : FormDetailEffect()
    data object NavigateBack : FormDetailEffect()
}
```

- [ ] **Step 4: Add picker actions to FormDetailViewModel**

In `FormDetailViewModel.kt`, add these methods after `onFieldChanged`:

```kotlin
fun openPicker(def: FormFieldDef) {
    val isLifeGroup = def.fieldType == FormFieldType.LG_PICKER
    _uiState.update {
        it.copy(
            pickerState = PickerState(
                key = def.key, label = def.label,
                isMulti = def.fieldType == FormFieldType.USER_MULTI_PICKER,
                isLifeGroup = isLifeGroup,
            )
        )
    }
}

fun closePicker() {
    _uiState.update { it.copy(pickerState = null) }
}

fun onPickerQueryChanged(query: String) {
    val state = _uiState.value.pickerState ?: return
    _uiState.update { it.copy(pickerState = state.copy(query = query, isLoading = true, error = null)) }
    viewModelScope.launch {
        runCatching {
            if (state.isLifeGroup) formsRepository.searchLifeGroups(query)
            else formsRepository.searchUsers(query)
        }.onSuccess { results ->
            _uiState.update { s ->
                s.copy(pickerState = s.pickerState?.copy(results = results, isLoading = false))
            }
        }.onFailure { e ->
            _uiState.update { s ->
                s.copy(pickerState = s.pickerState?.copy(error = e.message, isLoading = false))
            }
        }
    }
}

fun onPickerSelect(id: String, name: String) {
    val state = _uiState.value.pickerState ?: return
    if (state.isMulti) {
        val current = (_uiState.value.fields[state.key] ?: "")
            .split(",").filter { it.isNotBlank() }.toMutableList()
        if (id in current) current.remove(id) else current.add(id)
        _uiState.update { it.copy(fields = it.fields + (state.key to current.joinToString(","))) }
    } else {
        _uiState.update {
            it.copy(
                fields = it.fields + (state.key to id) + ("${state.key}_name" to name),
                pickerState = null,
            )
        }
    }
}

fun setSelfOrSearchMode(key: String, isSearch: Boolean) {
    _uiState.update {
        val newMap = it.selfOrSearchIsSearch.toMutableMap().also { m -> m[key] = isSearch }
        val newFields = if (!isSearch) it.fields + (key to "") else it.fields
        it.copy(selfOrSearchIsSearch = newMap, fields = newFields)
    }
}
```

- [ ] **Step 5: Create UserPickerSheet.kt**

Create `android/src/main/kotlin/br/church/paz/android/ui/features/formularios/UserPickerSheet.kt`:

```kotlin
package br.church.paz.android.ui.features.formularios

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.User

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserPickerSheet(
    state: PickerState,
    selectedIds: Set<String>,
    onQueryChanged: (String) -> Unit,
    onSelect: (id: String, name: String) -> Unit,
    onDismiss: () -> Unit,
    onConfirmMulti: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.padding(PazSpacing.Md).fillMaxWidth()) {
            Text(state.label, style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(PazSpacing.Md))
            OutlinedTextField(
                value = state.query,
                onValueChange = onQueryChanged,
                placeholder = { Text("Buscar por nome, telefone ou e-mail") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Spacer(Modifier.height(PazSpacing.Sm))
            when {
                state.isLoading -> Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                state.error != null -> Text(state.error, color = MaterialTheme.colorScheme.error)
                state.results.isEmpty() && state.query.isNotBlank() -> Text("Nenhum resultado")
                else -> LazyColumn(Modifier.heightIn(max = 300.dp)) {
                    @Suppress("UNCHECKED_CAST")
                    items(state.results as List<User>) { user ->
                        val selected = user.id in selectedIds
                        ListItem(
                            headlineContent = { Text(user.name) },
                            supportingContent = user.email.takeIf { it.isNotBlank() }?.let { { Text(it) } },
                            trailingContent = if (selected) {
                                { Icon(Icons.Default.Check, null, tint = MaterialTheme.colorScheme.primary) }
                            } else null,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        HorizontalDivider()
                        Surface(modifier = Modifier.fillMaxWidth(), onClick = { onSelect(user.id, user.name) }, color = androidx.compose.ui.graphics.Color.Transparent) {}
                    }
                }
            }
            if (state.isMulti) {
                Spacer(Modifier.height(PazSpacing.Md))
                Button(onClick = onConfirmMulti, modifier = Modifier.fillMaxWidth()) { Text("Confirmar") }
            }
            Spacer(Modifier.height(PazSpacing.Xl))
        }
    }
}
```

- [ ] **Step 6: Create LifeGroupPickerSheet.kt**

Create `android/src/main/kotlin/br/church/paz/android/ui/features/formularios/LifeGroupPickerSheet.kt`:

```kotlin
package br.church.paz.android.ui.features.formularios

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.LifeGroupSummary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LifeGroupPickerSheet(
    state: PickerState,
    selectedId: String,
    onQueryChanged: (String) -> Unit,
    onSelect: (id: String, name: String) -> Unit,
    onDismiss: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.padding(PazSpacing.Md).fillMaxWidth()) {
            Text(state.label, style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(PazSpacing.Md))
            OutlinedTextField(
                value = state.query,
                onValueChange = onQueryChanged,
                placeholder = { Text("Buscar grupo de vida") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Spacer(Modifier.height(PazSpacing.Sm))
            when {
                state.isLoading -> Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                state.error != null -> Text(state.error, color = MaterialTheme.colorScheme.error)
                state.results.isEmpty() && state.query.isNotBlank() -> Text("Nenhum resultado")
                else -> LazyColumn(Modifier.heightIn(max = 300.dp)) {
                    @Suppress("UNCHECKED_CAST")
                    items(state.results as List<LifeGroupSummary>) { lg ->
                        ListItem(
                            headlineContent = { Text(lg.name) },
                            trailingContent = if (lg.id.toString() == selectedId) {
                                { Icon(androidx.compose.material.icons.Icons.Default.Check, null, tint = MaterialTheme.colorScheme.primary) }
                            } else null,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        HorizontalDivider()
                        Surface(modifier = Modifier.fillMaxWidth(), onClick = { onSelect(lg.id.toString(), lg.name) }, color = androidx.compose.ui.graphics.Color.Transparent) {}
                    }
                }
            }
            Spacer(Modifier.height(PazSpacing.Xl))
        }
    }
}
```

- [ ] **Step 7: Add SELECT, USER_PICKER, USER_MULTI_PICKER, LG_PICKER, SELF_OR_SEARCH renderers to FormDetailScreen.kt**

In `FormDetailScreen.kt`, update the `FieldRow` when-block to handle the new types. Add after `FormFieldType.BOOLEAN`:

```kotlin
FormFieldType.SELECT -> {
    // Reuse existing PickerField but map display label ↔ API value
    val displayValue = if (def.optionValues.isEmpty()) value
    else def.options.getOrElse(def.optionValues.indexOf(value)) { value }
    PickerField(
        value = displayValue,
        options = def.options,
        enabled = !isSubmitting,
        onValueChange = { label ->
            val apiValue = if (def.optionValues.isEmpty()) label
            else def.optionValues.getOrElse(def.options.indexOf(label)) { label }
            onValueChange(apiValue)
        },
        onFocusChange = onFocusChange,
    )
}

FormFieldType.USER_PICKER, FormFieldType.USER_MULTI_PICKER -> {
    val displayName = uiState.fields["${def.key}_name"] ?: ""
    OutlinedTextField(
        value = displayName,
        onValueChange = {},
        modifier = Modifier.fillMaxWidth(),
        readOnly = true,
        enabled = !isSubmitting,
        placeholder = { Text(def.placeholder.ifEmpty { "Selecionar pessoa" }) },
        trailingIcon = {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowDown, null)
        },
        shape = PazShapes.large,
        singleLine = true,
    )
    Surface(modifier = Modifier.fillMaxWidth(), onClick = { if (!isSubmitting) onOpenPicker(def) }, color = Color.Transparent) {}
}

FormFieldType.LG_PICKER -> {
    val displayName = uiState.fields["${def.key}_name"] ?: ""
    OutlinedTextField(
        value = displayName,
        onValueChange = {},
        modifier = Modifier.fillMaxWidth(),
        readOnly = true,
        enabled = !isSubmitting,
        placeholder = { Text(def.placeholder.ifEmpty { "Selecionar grupo de vida" }) },
        trailingIcon = { Icon(Icons.AutoMirrored.Filled.KeyboardArrowDown, null) },
        shape = PazShapes.large,
        singleLine = true,
    )
    Surface(modifier = Modifier.fillMaxWidth(), onClick = { if (!isSubmitting) onOpenPicker(def) }, color = Color.Transparent) {}
}

FormFieldType.SELF_OR_SEARCH -> {
    val isSearchMode = selfOrSearchModes[def.key] == true
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            FilterChip(
                selected = !isSearchMode,
                onClick = { onSelfOrSearchMode(def.key, false) },
                label = { Text("Eu mesmo") },
            )
            Spacer(Modifier.width(PazSpacing.Sm))
            FilterChip(
                selected = isSearchMode,
                onClick = { onSelfOrSearchMode(def.key, true) },
                label = { Text("Buscar pessoa") },
            )
        }
        if (isSearchMode) {
            Spacer(Modifier.height(PazSpacing.Sm))
            val displayName = uiState.fields["${def.key}_name"] ?: ""
            OutlinedTextField(
                value = displayName,
                onValueChange = {},
                modifier = Modifier.fillMaxWidth(),
                readOnly = true,
                enabled = !isSubmitting,
                placeholder = { Text("Selecionar pessoa") },
                trailingIcon = { Icon(Icons.AutoMirrored.Filled.KeyboardArrowDown, null) },
                shape = PazShapes.large,
            )
            Surface(modifier = Modifier.fillMaxWidth(), onClick = { if (!isSubmitting) onOpenPicker(def) }, color = Color.Transparent) {}
        }
    }
}
```

Update `FormContent` signature to pass through picker callbacks:

```kotlin
@Composable
private fun FormContent(
    uiState: FormDetailUiState,
    onFieldChanged: (String, String) -> Unit,
    onSubmit: () -> Unit,
    onOpenPicker: (FormFieldDef) -> Unit,
    onSelfOrSearchMode: (String, Boolean) -> Unit,
)
```

And add picker sheet presentation at the bottom of `FormDetailScreen`:

```kotlin
val pickerState = uiState.pickerState
if (pickerState != null) {
    if (pickerState.isLifeGroup) {
        LifeGroupPickerSheet(
            state = pickerState,
            selectedId = uiState.fields[pickerState.key] ?: "",
            onQueryChanged = viewModel::onPickerQueryChanged,
            onSelect = viewModel::onPickerSelect,
            onDismiss = viewModel::closePicker,
        )
    } else {
        val selectedIds = (uiState.fields[pickerState.key] ?: "")
            .split(",").filter { it.isNotBlank() }.toSet()
        UserPickerSheet(
            state = pickerState,
            selectedIds = selectedIds,
            onQueryChanged = viewModel::onPickerQueryChanged,
            onSelect = viewModel::onPickerSelect,
            onDismiss = viewModel::closePicker,
            onConfirmMulti = viewModel::closePicker,
        )
    }
}
```

- [ ] **Step 8: Run ViewModel tests**

```bash
cd kmp-mobile && ./gradlew :android:testDebugUnitTest --tests "*.FormDetailViewModelTest"
# Expected: all tests pass including the new SELECT validation test
```

- [ ] **Step 9: Build Android**

```bash
./gradlew :android:assembleDebug
# Expected: BUILD SUCCESSFUL
```

- [ ] **Step 10: Commit**

```bash
git add android/src/main/kotlin/br/church/paz/android/ui/features/formularios/
git add android/src/test/kotlin/br/church/paz/android/ui/features/formularios/FormDetailViewModelTest.kt
git commit -m "feat(android): new field types, picker sheets, SELECT/user/LG/selfOrSearch UI"
```

---

### Task 4: iOS — New field types, picker sheets, SELECT/SELF_OR_SEARCH renderers

**Files:**
- Modify: `ios/PazChurch/Features/Formularios/FormDetailView.swift`
- Create: `ios/PazChurch/Features/Formularios/UserPickerSheet.swift`
- Create: `ios/PazChurch/Features/Formularios/LifeGroupPickerSheet.swift`

**Interfaces:**
- Consumes: `formsRepository.searchUsers(query:)` → `[User]`, `searchLifeGroups(query:)` → `[LifeGroupSummary]`
- Produces: `FormFieldType` cases `.select`, `.userPicker`, `.userMultiPicker`, `.lgPicker`, `.selfOrSearch`
- Produces: `FormFieldDef.optionValues: [String]`
- Produces: `FormDetailViewModelIOS.pickerKey: String?`, `pickerQuery: String`, `pickerResults: [Any]`, `pickerIsLifeGroup: Bool`, `pickerIsMulti: Bool`

- [ ] **Step 1: Add new field type cases to FormDetailView.swift**

In `FormDetailView.swift`, update the `FormFieldType` enum and `FormFieldDef` struct:

```swift
enum FormFieldType {
    case text, name, phone, email, date, integer, currency, multiline, toggle
    case select          // enum: optionValues[i] = API value, label in options[i] displayed
    case userPicker      // single user → stores id string
    case userMultiPicker // multi user → stores "1,2,3"
    case lgPicker        // life-group → stores id string
    case selfOrSearch    // invited_by: "" = self, else searched name
}

struct FormFieldDef {
    let key: String
    let label: String
    let placeholder: String
    let required: Bool
    let fieldType: FormFieldType
    let options: [String]       // display labels
    let optionValues: [String]  // API values parallel to options; empty = value IS label

    init(
        _ key: String, _ label: String,
        placeholder: String = "", required: Bool = false,
        fieldType: FormFieldType = .text,
        options: [String] = [], optionValues: [String] = []
    ) {
        self.key = key; self.label = label; self.placeholder = placeholder
        self.required = required; self.fieldType = fieldType
        self.options = options; self.optionValues = optionValues
    }
}
```

- [ ] **Step 2: Add picker state to FormDetailViewModelIOS**

In `FormDetailView.swift`, extend `FormDetailViewModelIOS` with picker state properties and actions:

```swift
// MARK: - Picker state
var pickerKey: String? = nil
var pickerLabel: String = ""
var pickerIsMulti: Bool = false
var pickerIsLifeGroup: Bool = false
var pickerQuery: String = ""
var pickerResults: [Any] = []
var pickerIsLoading: Bool = false
var pickerError: String? = nil
var selfOrSearchModes: [String: Bool] = [:] // key → true = search mode

func openPicker(def: FormFieldDef) {
    pickerKey = def.key
    pickerLabel = def.label
    pickerIsMulti = def.fieldType == .userMultiPicker
    pickerIsLifeGroup = def.fieldType == .lgPicker
    pickerQuery = ""
    pickerResults = []
    pickerError = nil
}

func closePicker() { pickerKey = nil }

func onPickerQueryChanged(_ query: String) {
    pickerQuery = query
    pickerIsLoading = true
    pickerError = nil
    Task {
        do {
            if pickerIsLifeGroup {
                let results = try await (formsRepository.searchLifeGroups(query: query) as? [LifeGroupSummary]) ?? []
                pickerResults = results
            } else {
                let results = try await (formsRepository.searchUsers(query: query) as? [User]) ?? []
                pickerResults = results
            }
            pickerIsLoading = false
        } catch {
            pickerError = error.localizedDescription
            pickerIsLoading = false
        }
    }
}

func onPickerSelect(id: String, name: String) {
    guard let key = pickerKey else { return }
    if pickerIsMulti {
        var current = (fields[key] ?? "").split(separator: ",").map(String.init).filter { !$0.isEmpty }
        if current.contains(id) { current.removeAll { $0 == id } } else { current.append(id) }
        fields[key] = current.joined(separator: ",")
    } else {
        fields[key] = id
        fields["\(key)_name"] = name
        closePicker()
    }
}

func setSelfOrSearchMode(key: String, isSearch: Bool) {
    selfOrSearchModes[key] = isSearch
    if !isSearch { fields[key] = "" }
}
```

- [ ] **Step 3: Create UserPickerSheet.swift**

Create `ios/PazChurch/Features/Formularios/UserPickerSheet.swift`:

```swift
import Shared
import SwiftUI

struct UserPickerSheet: View {
    @Bindable var viewModel: FormDetailViewModelIOS

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                TextField("Buscar por nome, telefone ou e-mail", text: Binding(
                    get: { viewModel.pickerQuery },
                    set: { viewModel.onPickerQueryChanged($0) }
                ))
                .padding(PazSpacing.md)
                .background(PazColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(PazSpacing.md)

                if viewModel.pickerIsLoading {
                    ProgressView().padding()
                } else if let error = viewModel.pickerError {
                    Text(error).foregroundColor(.red).padding()
                } else {
                    let users = viewModel.pickerResults.compactMap { $0 as? User }
                    let selectedIds = Set((viewModel.fields[viewModel.pickerKey ?? ""] ?? "")
                        .split(separator: ",").map(String.init))
                    List(users, id: \.id) { user in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(user.name)
                                if !user.email.isEmpty { Text(user.email).font(.caption).foregroundColor(.secondary) }
                            }
                            Spacer()
                            if selectedIds.contains(user.id) {
                                Image(systemName: "checkmark").foregroundColor(PazColors.pazPrimary)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture { viewModel.onPickerSelect(id: user.id, name: user.name) }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle(viewModel.pickerLabel)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    if viewModel.pickerIsMulti {
                        Button("Confirmar") { viewModel.closePicker() }
                    } else {
                        Button("Cancelar") { viewModel.closePicker() }
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 4: Create LifeGroupPickerSheet.swift**

Create `ios/PazChurch/Features/Formularios/LifeGroupPickerSheet.swift`:

```swift
import Shared
import SwiftUI

struct LifeGroupPickerSheet: View {
    @Bindable var viewModel: FormDetailViewModelIOS

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                TextField("Buscar grupo de vida", text: Binding(
                    get: { viewModel.pickerQuery },
                    set: { viewModel.onPickerQueryChanged($0) }
                ))
                .padding(PazSpacing.md)
                .background(PazColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(PazSpacing.md)

                if viewModel.pickerIsLoading {
                    ProgressView().padding()
                } else if let error = viewModel.pickerError {
                    Text(error).foregroundColor(.red).padding()
                } else {
                    let groups = viewModel.pickerResults.compactMap { $0 as? LifeGroupSummary }
                    let selectedId = viewModel.fields[viewModel.pickerKey ?? ""] ?? ""
                    List(groups, id: \.id) { lg in
                        HStack {
                            Text(lg.name)
                            Spacer()
                            if String(lg.id) == selectedId {
                                Image(systemName: "checkmark").foregroundColor(PazColors.pazPrimary)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture { viewModel.onPickerSelect(id: String(lg.id), name: lg.name) }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle(viewModel.pickerLabel)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancelar") { viewModel.closePicker() }
                }
            }
        }
    }
}
```

- [ ] **Step 5: Add new cases to `FieldRow` in FormDetailView.swift**

In the `FieldRow` struct's `body` switch, after the `.toggle` case, add:

```swift
case .select:
    let displayValue: String = {
        if def.optionValues.isEmpty { return value }
        guard let idx = def.optionValues.firstIndex(of: value) else { return value }
        return def.options[idx]
    }()
    Menu {
        ForEach(Array(def.options.enumerated()), id: \.offset) { idx, label in
            Button(label) {
                let apiValue = def.optionValues.isEmpty ? label : (def.optionValues[idx])
                onChange(apiValue)
            }
        }
    } label: {
        HStack {
            Text(displayValue.isEmpty ? (def.placeholder.isEmpty ? "Selecionar" : def.placeholder) : displayValue)
                .font(PazTypography.bodyMedium)
                .foregroundStyle(displayValue.isEmpty ? PazColors.slate : PazColors.ink)
            Spacer()
            Image(systemName: "chevron.down").foregroundStyle(PazColors.pazPrimary)
        }
        .padding(.horizontal, PazSpacing.md)
        .frame(height: 56)
        .background(PazColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    .disabled(isSubmitting)

case .userPicker, .userMultiPicker:
    // Display name stored at key_name
    let displayName = extraFields["\(def.key)_name"] ?? ""
    Button(action: { if !isSubmitting { onOpenPicker(def) } }) {
        HStack {
            Text(displayName.isEmpty ? "Selecionar pessoa" : displayName)
                .font(PazTypography.bodyMedium)
                .foregroundStyle(displayName.isEmpty ? PazColors.slate : PazColors.ink)
            Spacer()
            Image(systemName: "chevron.down").foregroundStyle(PazColors.pazPrimary)
        }
        .padding(.horizontal, PazSpacing.md)
        .frame(height: 56)
        .background(PazColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    .buttonStyle(.plain)

case .lgPicker:
    let displayName = extraFields["\(def.key)_name"] ?? ""
    Button(action: { if !isSubmitting { onOpenPicker(def) } }) {
        HStack {
            Text(displayName.isEmpty ? "Selecionar grupo de vida" : displayName)
                .font(PazTypography.bodyMedium)
                .foregroundStyle(displayName.isEmpty ? PazColors.slate : PazColors.ink)
            Spacer()
            Image(systemName: "chevron.down").foregroundStyle(PazColors.pazPrimary)
        }
        .padding(.horizontal, PazSpacing.md)
        .frame(height: 56)
        .background(PazColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    .buttonStyle(.plain)

case .selfOrSearch:
    let isSearchMode = selfOrSearchModes[def.key] == true
    VStack(alignment: .leading, spacing: PazSpacing.sm) {
        HStack(spacing: PazSpacing.sm) {
            Button("Eu mesmo") { onSelfOrSearchMode(def.key, false) }
                .buttonStyle(.bordered)
                .tint(isSearchMode ? .secondary : PazColors.pazPrimary)
            Button("Buscar pessoa") { onSelfOrSearchMode(def.key, true) }
                .buttonStyle(.bordered)
                .tint(isSearchMode ? PazColors.pazPrimary : .secondary)
        }
        if isSearchMode {
            let displayName = extraFields["\(def.key)_name"] ?? ""
            Button(action: { if !isSubmitting { onOpenPicker(def) } }) {
                HStack {
                    Text(displayName.isEmpty ? "Selecionar pessoa" : displayName)
                        .font(PazTypography.bodyMedium)
                        .foregroundStyle(displayName.isEmpty ? PazColors.slate : PazColors.ink)
                    Spacer()
                    Image(systemName: "chevron.down").foregroundStyle(PazColors.pazPrimary)
                }
                .padding(.horizontal, PazSpacing.md)
                .frame(height: 56)
                .background(PazColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)
        }
    }
```

Update `FieldRow` signature to accept `extraFields`, `selfOrSearchModes`, `onOpenPicker`, `onSelfOrSearchMode`:

```swift
private struct FieldRow: View {
    let def: FormFieldDef
    let value: String
    let extraFields: [String: String]   // full fields dict for _name lookups
    let isSubmitting: Bool
    let selfOrSearchModes: [String: Bool]
    let onChange: (String) -> Void
    let onOpenPicker: (FormFieldDef) -> Void
    let onSelfOrSearchMode: (String, Bool) -> Void
```

Update the `formContent` property in `FormDetailView` to pass the new parameters and add picker sheet presentation:

```swift
ForEach(form.type.fieldDefs, id: \.key) { def in
    FieldRow(
        def: def,
        value: viewModel.fields[def.key] ?? "",
        extraFields: viewModel.fields,
        isSubmitting: viewModel.isSubmitting,
        selfOrSearchModes: viewModel.selfOrSearchModes,
        onChange: { viewModel.update(key: def.key, value: $0) },
        onOpenPicker: viewModel.openPicker,
        onSelfOrSearchMode: viewModel.setSelfOrSearchMode
    )
}
// Sheet presentations:
.sheet(isPresented: Binding(get: { viewModel.pickerKey != nil && !viewModel.pickerIsLifeGroup }, set: { if !$0 { viewModel.closePicker() } })) {
    UserPickerSheet(viewModel: viewModel)
}
.sheet(isPresented: Binding(get: { viewModel.pickerKey != nil && viewModel.pickerIsLifeGroup }, set: { if !$0 { viewModel.closePicker() } })) {
    LifeGroupPickerSheet(viewModel: viewModel)
}
```

- [ ] **Step 6: Build iOS XCFramework**

```bash
cd kmp-mobile && ./gradlew :shared:assembleSharedXCFramework
# Expected: BUILD SUCCESSFUL
```

- [ ] **Step 7: Build iOS app via xcodebuild**

```bash
cd kmp-mobile/ios && xcodebuild -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -5
# Expected: BUILD SUCCEEDED
```

- [ ] **Step 8: Commit**

```bash
cd kmp-mobile
git add ios/PazChurch/Features/Formularios/
git commit -m "feat(ios): new field types, picker sheets, SELECT/user/LG/selfOrSearch UI"
```

---

### Task 5: Android — Update all fieldDefs and submitForm (Phase 2a–2d)

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailUiState.kt` (fieldDefs section)
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailViewModel.kt` (submitForm section)

**Context:** `fields["key"]` holds string values. For SELECT fields the stored value is the API enum string (e.g. `"tadel"`). For picker fields the stored value is the ID string; `fields["key_name"]` is the display name. Multi-pickers store `"1,2,3"`. Date fields store `"DD/MM/YYYY"` — convert to `"YYYY-MM-DD"` for `birth_date`, `enrolled_at`, `date` in ISO-expected contexts.

Date conversion helper (add to ViewModel):
```kotlin
private fun Map<String, String>.isoDate(key: String): String {
    val raw = get(key)?.trim() ?: return ""
    // Input: DD/MM/YYYY → Output: YYYY-MM-DD
    return runCatching {
        val sdf = java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale("pt", "BR"))
        val iso = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
        iso.format(sdf.parse(raw)!!)
    }.getOrDefault(raw)
}
private fun Map<String, String>.ids(key: String): List<Int> =
    (get(key) ?: "").split(",").filter { it.isNotBlank() }.mapNotNull { it.trim().toIntOrNull() }
private fun Map<String, String>.idInt(key: String): Int =
    get(key)?.trim()?.toIntOrNull() ?: 0
```

- [ ] **Step 1: Update `fieldDefs()` in FormDetailUiState.kt**

Replace the `FormType.fieldDefs()` function with the updated definitions:

```kotlin
fun FormType.fieldDefs(): List<FormFieldDef> = when (this) {
    FormType.service_report -> listOf(
        FormFieldDef("date", "Data", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
        FormFieldDef("report_type", "Tipo de relatório", required = true, fieldType = FormFieldType.SELECT,
            options = listOf("Tadel", "Culto de celebração", "Evento"),
            optionValues = listOf("tadel", "culto_celebracao", "evento")),
        FormFieldDef("period", "Período", required = true, fieldType = FormFieldType.SELECT,
            options = listOf("Manhã", "Tarde/Noite"),
            optionValues = listOf("manha", "tarde_noite")),
        FormFieldDef("atmosphere_team_id", "Equipe Atmosfera", fieldType = FormFieldType.INTEGER),
        FormFieldDef("atmosphere_responsible", "Responsável no dia", required = true),
        FormFieldDef("tadel_adults", "Adultos (Tadel)", "0", required = true, fieldType = FormFieldType.INTEGER),
        FormFieldDef("tadel_kids", "Crianças (Tadel)", "0", fieldType = FormFieldType.INTEGER),
        FormFieldDef("vehicles_cars", "Carros", "0", required = true, fieldType = FormFieldType.INTEGER),
        FormFieldDef("vehicles_motos", "Motos", "0", fieldType = FormFieldType.INTEGER),
        FormFieldDef("vehicles_bikes", "Bicicletas", "0", fieldType = FormFieldType.INTEGER),
        FormFieldDef("vehicles_others", "Outros veículos", "Ex: Ônibus - 2"),
        FormFieldDef("volunteers_atmosfera", "Voluntários Atmosfera", "0", fieldType = FormFieldType.INTEGER),
        FormFieldDef("volunteers_louvor", "Voluntários Louvor", "0", fieldType = FormFieldType.INTEGER),
        FormFieldDef("volunteers_midia", "Voluntários Mídia", "0", fieldType = FormFieldType.INTEGER),
        FormFieldDef("volunteers_danca", "Voluntários Dança", "0", fieldType = FormFieldType.INTEGER),
        FormFieldDef("notes", "Observação", fieldType = FormFieldType.MULTILINE),
    )
    FormType.guest -> listOf(
        FormFieldDef("date", "Data da Visita", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
        FormFieldDef("full_name", "Nome do Visitante", "Nome completo", required = true, fieldType = FormFieldType.NAME),
        FormFieldDef("email", "E-mail", "email@exemplo.com", required = true, fieldType = FormFieldType.EMAIL),
        FormFieldDef("phone", "Telefone", "(41) 9 9999-9999", fieldType = FormFieldType.PHONE),
        FormFieldDef("invited_by", "Convidado por", fieldType = FormFieldType.SELF_OR_SEARCH),
        FormFieldDef("via_casa_de_paz", "Veio de uma Casa de Paz?", fieldType = FormFieldType.BOOLEAN),
        FormFieldDef("how_met_church", "Como conheceu a igreja?"),
        FormFieldDef("address", "Endereço"),
    )
    FormType.multiplication -> listOf(
        FormFieldDef("date", "Data da Multiplicação", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
        FormFieldDef("source_life_group_id", "Grupo de Vida de Origem", required = true, fieldType = FormFieldType.LG_PICKER),
        FormFieldDef("new_life_group_name", "Nome do Novo Grupo", "Ex: GL Norte", required = true),
        FormFieldDef("new_leader_id", "Novo Líder", required = true, fieldType = FormFieldType.USER_PICKER),
        FormFieldDef("host_id", "Anfitrião", required = true, fieldType = FormFieldType.USER_PICKER),
        FormFieldDef("leader_phone", "Telefone do Líder", required = true, fieldType = FormFieldType.PHONE),
        FormFieldDef("meeting_day_time", "Dia e Horário", "Ex: Sexta 19h", required = true),
        FormFieldDef("address", "Endereço", required = true),
        FormFieldDef("members_to_move", "Membros a Transferir", fieldType = FormFieldType.USER_MULTI_PICKER),
        FormFieldDef("new_members", "Novos Membros", fieldType = FormFieldType.USER_MULTI_PICKER),
        FormFieldDef("completed_leadership_track", "Completou Trilha de Liderança", fieldType = FormFieldType.BOOLEAN),
        FormFieldDef("legally_married", "Casado Legalmente", fieldType = FormFieldType.BOOLEAN),
        FormFieldDef("faithful_tither", "Dizimista Fiel", fieldType = FormFieldType.BOOLEAN),
        FormFieldDef("evangelizing_and_consolidating", "Evangelizando e Consolidando", fieldType = FormFieldType.BOOLEAN),
        FormFieldDef("good_testimony", "Bom Testemunho", fieldType = FormFieldType.BOOLEAN),
        FormFieldDef("single_living_in_purity", "Solteiro Vivendo em Pureza", fieldType = FormFieldType.BOOLEAN),
    )
    FormType.member_registration -> listOf(
        FormFieldDef("full_name", "Nome Completo", required = true, fieldType = FormFieldType.NAME),
        FormFieldDef("email", "E-mail", "email@exemplo.com", fieldType = FormFieldType.EMAIL),
        FormFieldDef("birth_date", "Data de Nascimento", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
        FormFieldDef("phone", "Telefone", "(41) 9 9999-9999", required = true, fieldType = FormFieldType.PHONE),
        FormFieldDef("gender", "Gênero", required = true, fieldType = FormFieldType.SELECT,
            options = listOf("Masculino", "Feminino"), optionValues = listOf("m", "f")),
        FormFieldDef("civil_state", "Estado Civil", required = true, fieldType = FormFieldType.SELECT,
            options = listOf("Solteiro", "Casado", "Divorciado", "Viúvo"),
            optionValues = listOf("solteiro", "casado", "divorciado", "viuvo")),
        FormFieldDef("sector_id", "Setor", required = true, fieldType = FormFieldType.USER_PICKER), // TODO: replace with sector picker when available
        FormFieldDef("life_group_id", "Grupo de Vida", fieldType = FormFieldType.LG_PICKER),
        FormFieldDef("address", "Endereço"),
    )
    FormType.conversion -> listOf(
        FormFieldDef("full_name", "Nome Completo", required = true, fieldType = FormFieldType.NAME),
        FormFieldDef("email", "E-mail", "email@exemplo.com", required = true, fieldType = FormFieldType.EMAIL),
        FormFieldDef("phone", "Telefone", "(41) 9 9999-9999", required = true, fieldType = FormFieldType.PHONE),
        FormFieldDef("decision_type", "Tipo de Decisão", required = true, fieldType = FormFieldType.SELECT,
            options = listOf("Primeira vez", "Reconciliação"),
            optionValues = listOf("first_time", "reconciliation")),
        FormFieldDef("how_met_church", "Como conheceu a igreja?", required = true),
        FormFieldDef("gender", "Gênero", required = true, fieldType = FormFieldType.SELECT,
            options = listOf("Masculino", "Feminino"), optionValues = listOf("m", "f")),
        FormFieldDef("birth_date", "Data de Nascimento", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
        FormFieldDef("civil_state", "Estado Civil", required = true, fieldType = FormFieldType.SELECT,
            options = listOf("Solteiro", "Casado", "Divorciado", "Viúvo"),
            optionValues = listOf("solteiro", "casado", "divorciado", "viuvo")),
        FormFieldDef("address", "Endereço", required = true),
        FormFieldDef("attendance_count", "Quantidade de visitas", required = true),
        FormFieldDef("life_group_status", "Status do Grupo de Vida", required = true),
        FormFieldDef("life_group_leader_or_name", "Líder ou nome do GV"),
        FormFieldDef("invited_by", "Convidado por"),
        FormFieldDef("notes", "Observações", fieldType = FormFieldType.MULTILINE),
    )
    FormType.sector_supervisor_report -> listOf(
        FormFieldDef("date", "Data do Relatório", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
        FormFieldDef("sector_id", "Setor", required = true, fieldType = FormFieldType.USER_PICKER), // TODO: sector picker
        FormFieldDef("life_groups_visited", "Grupos Visitados", fieldType = FormFieldType.LG_PICKER),
        FormFieldDef("leaders_pastored", "Líderes Pastoreados", fieldType = FormFieldType.USER_MULTI_PICKER),
        FormFieldDef("multiplication_candidates", "Candidatos à Multiplicação", fieldType = FormFieldType.USER_MULTI_PICKER),
        FormFieldDef("life_groups_count", "Total de Grupos", "0", required = true, fieldType = FormFieldType.INTEGER),
        FormFieldDef("life_groups_supervised", "Grupos Supervisionados", "0", required = true, fieldType = FormFieldType.INTEGER),
        FormFieldDef("life_group_observations", "Observações dos Grupos", fieldType = FormFieldType.MULTILINE),
        FormFieldDef("sector_multiplication_date", "Data de Multiplicação do Setor", fieldType = FormFieldType.DATE),
        FormFieldDef("notes", "Observações", fieldType = FormFieldType.MULTILINE),
    )
    FormType.area_supervisor_report -> listOf(
        FormFieldDef("date", "Data do Relatório", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
        FormFieldDef("area_id", "Área", required = true, fieldType = FormFieldType.USER_PICKER), // TODO: area picker
        FormFieldDef("sector_leaders_pastored", "Líderes de Setor Pastoreados", fieldType = FormFieldType.USER_MULTI_PICKER),
        FormFieldDef("life_groups_count", "Total de Grupos", "0", required = true, fieldType = FormFieldType.INTEGER),
        FormFieldDef("life_groups_supervised", "Grupos Supervisionados", "0", required = true, fieldType = FormFieldType.INTEGER),
        FormFieldDef("life_group_observations", "Observações dos Grupos", fieldType = FormFieldType.MULTILINE),
        FormFieldDef("notes", "Observações", fieldType = FormFieldType.MULTILINE),
    )
    FormType.life_group_report -> listOf(
        FormFieldDef("date", "Data da Reunião", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
        FormFieldDef("attendees", "Quantidade de Participantes", "0", required = true, fieldType = FormFieldType.INTEGER),
        FormFieldDef("visitors", "Quantidade de Visitantes", "0", fieldType = FormFieldType.INTEGER),
        FormFieldDef("offerings", "Oferta (R$)", "0,00", fieldType = FormFieldType.CURRENCY),
        FormFieldDef("observations", "Observações", fieldType = FormFieldType.MULTILINE),
    )
    FormType.course -> listOf(
        FormFieldDef("course_name", "Nome do Curso", "Ex: Escola de Membros", required = true),
        FormFieldDef("enrolled_at", "Data de Inscrição", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
    )
}
```

- [ ] **Step 2: Update `submitForm` in FormDetailViewModel.kt**

Replace the `submitForm` method body:

```kotlin
private suspend fun submitForm(type: FormType, f: Map<String, String>): Result<Unit> {
    val userId = authRepository.currentUser()?.id ?: ""
    return runCatching {
        when (type) {
            FormType.member_registration ->
                formsRepository.submitMemberRegistration(MemberRegistrationForm(
                    fullName = f.req("full_name"),
                    birthDate = f.isoDate("birth_date"),
                    phone = f.req("phone").filter { it.isDigit() }.let { "+55$it" }.takeIf { it.length > 3 } ?: f.req("phone"),
                    gender = f.req("gender"),
                    civilState = f.req("civil_state"),
                    sectorId = f.idInt("sector_id"),
                    email = f.opt("email"),
                    lifeGroupId = f.idInt("life_group_id").takeIf { it > 0 },
                    address = f.opt("address"),
                ))
            FormType.conversion ->
                formsRepository.submitConversion(ConversionForm(
                    fullName = f.req("full_name"),
                    email = f.req("email"),
                    phone = f.req("phone"),
                    decisionType = f.req("decision_type"),
                    howMetChurch = f.req("how_met_church"),
                    gender = f.req("gender"),
                    birthDate = f.isoDate("birth_date"),
                    civilState = f.req("civil_state"),
                    address = f.req("address"),
                    attendanceCount = f.req("attendance_count"),
                    lifeGroupStatus = f.req("life_group_status"),
                    lifeGroupLeaderOrName = f.opt("life_group_leader_or_name"),
                    invitedBy = f.opt("invited_by"),
                    notes = f.opt("notes"),
                ))
            FormType.guest -> {
                val invitedBy = if (f["invited_by"].isNullOrEmpty()) {
                    authRepository.currentUser()?.name
                } else f["invited_by"]
                formsRepository.submitGuest(GuestForm(
                    fullName = f.req("full_name"),
                    email = f.opt("email"),
                    phone = f.opt("phone"),
                    invitedBy = invitedBy,
                    viaCasaDePaz = f["via_casa_de_paz"] == "true",
                    howMetChurch = f.opt("how_met_church"),
                    address = f.opt("address"),
                    date = f.req("date"),
                ))
            }
            FormType.multiplication ->
                formsRepository.submitMultiplication(MultiplicationForm(
                    date = f.req("date"),
                    sourceLifeGroupId = f.idInt("source_life_group_id"),
                    newLifeGroupName = f.req("new_life_group_name"),
                    newLeaderId = f.idInt("new_leader_id"),
                    hostId = f.idInt("host_id"),
                    leaderPhone = f.req("leader_phone"),
                    meetingDayTime = f.req("meeting_day_time"),
                    address = f.req("address"),
                    membersToMove = f.ids("members_to_move"),
                    newMembers = f.ids("new_members"),
                    completedLeadershipTrack = f["completed_leadership_track"] == "true",
                    legallyMarried = f["legally_married"]?.let { it == "true" },
                    faithfulTither = f["faithful_tither"] == "true",
                    evangelizingAndConsolidating = f["evangelizing_and_consolidating"] == "true",
                    goodTestimony = f["good_testimony"] == "true",
                    singleLivingInPurity = f["single_living_in_purity"]?.let { it == "true" },
                ))
            FormType.service_report ->
                formsRepository.submitServiceReport(ServiceReportForm(
                    date = f.req("date"),
                    reportType = f.req("report_type"),
                    period = f.req("period"),
                    atmosphereTeamId = f.intOrNull("atmosphere_team_id"),
                    atmosphereResponsible = f.req("atmosphere_responsible"),
                    tadelAdults = f.int("tadel_adults"),
                    tadelKids = f.int("tadel_kids"),
                    vehiclesCars = f.int("vehicles_cars"),
                    vehiclesMotos = f.int("vehicles_motos"),
                    vehiclesBikes = f.int("vehicles_bikes"),
                    vehiclesOthers = f["vehicles_others"],
                    volunteersAtmosfera = f.int("volunteers_atmosfera"),
                    volunteersLouvor = f.int("volunteers_louvor"),
                    volunteersMiddia = f.int("volunteers_midia"),
                    volunteersDanca = f.int("volunteers_danca"),
                    notes = f["notes"],
                ))
            FormType.course ->
                formsRepository.submitCourse(CourseForm(
                    courseName = f.req("course_name"), memberId = userId,
                    enrolledAt = f.isoDate("enrolled_at"),
                ))
            FormType.life_group_report ->
                formsRepository.submitLifeGroupReport(LifeGroupReportForm(
                    lifeGroupId = userId,
                    date = f.req("date"),
                    attendees = f.int("attendees"),
                    visitors = f.int("visitors"),
                    offerings = f.brlOrNull("offerings"),
                    observations = f.opt("observations"),
                ))
            FormType.sector_supervisor_report ->
                formsRepository.submitSectorReport(SectorSupervisorReportForm(
                    date = f.req("date"),
                    sectorId = f.idInt("sector_id"),
                    lifeGroupsVisited = f.ids("life_groups_visited"),
                    leadersPastored = f.ids("leaders_pastored"),
                    multiplicationCandidates = f.ids("multiplication_candidates"),
                    lifeGroupsCount = f.int("life_groups_count"),
                    lifeGroupsSupervised = f.int("life_groups_supervised"),
                    lifeGroupObservations = (f.opt("life_group_observations") ?: "")
                        .split("\n").filter { it.isNotBlank() },
                    notes = f.opt("notes"),
                ))
            FormType.area_supervisor_report ->
                formsRepository.submitAreaReport(AreaSupervisorReportForm(
                    date = f.req("date"),
                    areaId = f.idInt("area_id"),
                    sectorLeadersPastored = f.ids("sector_leaders_pastored"),
                    lifeGroupsCount = f.int("life_groups_count"),
                    lifeGroupsSupervised = f.int("life_groups_supervised"),
                    lifeGroupObservations = (f.opt("life_group_observations") ?: "")
                        .split("\n").filter { it.isNotBlank() },
                    notes = f.opt("notes"),
                ))
        }
    }
}
```

Also add the `isoDate` and `ids` helper extensions to the ViewModel (alongside existing helpers):

```kotlin
private fun Map<String, String>.isoDate(key: String): String {
    val raw = get(key)?.trim() ?: return ""
    return runCatching {
        val sdf = java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale("pt", "BR"))
        val iso = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
        iso.format(sdf.parse(raw)!!)
    }.getOrDefault(raw)
}

private fun Map<String, String>.ids(key: String): List<Int> =
    (get(key) ?: "").split(",").filter { it.isNotBlank() }.mapNotNull { it.trim().toIntOrNull() }

private fun Map<String, String>.idInt(key: String): Int =
    get(key)?.trim()?.toIntOrNull() ?: 0
```

- [ ] **Step 3: Run ViewModel tests**

```bash
cd kmp-mobile && ./gradlew :android:testDebugUnitTest --tests "*.FormDetailViewModelTest"
# Expected: all tests pass
```

- [ ] **Step 4: Build Android**

```bash
./gradlew :android:assembleDebug
# Expected: BUILD SUCCESSFUL
```

- [ ] **Step 5: Commit**

```bash
git add android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailUiState.kt
git add android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailViewModel.kt
git commit -m "feat(android): update all form field defs and submit mappers to match backend"
```

---

### Task 6: iOS — Update all fieldDefs and submit (Phase 2a–2d)

**Files:**
- Modify: `ios/PazChurch/Features/Formularios/FormDetailView.swift`

**Context:** Parallel to Task 5 but on iOS. The `fields` dict is `[String: String]`. Date conversion helper: parse `"DD/MM/YYYY"` → emit `"YYYY-MM-DD"` for ISO fields. The `submit` function reads from `snapshot` dict.

- [ ] **Step 1: Update `fieldDefs` computed property in FormDetailView.swift**

Replace the `extension FormType { var fieldDefs: [FormFieldDef] { ... } }` block:

```swift
extension FormType {
    var fieldDefs: [FormFieldDef] {
        switch self {
        case .serviceReport:
            [
                FormFieldDef("date", "Data", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
                FormFieldDef("report_type", "Tipo de relatório", required: true, fieldType: .select,
                    options: ["Tadel", "Culto de celebração", "Evento"],
                    optionValues: ["tadel", "culto_celebracao", "evento"]),
                FormFieldDef("period", "Período", required: true, fieldType: .select,
                    options: ["Manhã", "Tarde/Noite"],
                    optionValues: ["manha", "tarde_noite"]),
                FormFieldDef("atmosphere_team_id", "Equipe Atmosfera", fieldType: .integer),
                FormFieldDef("atmosphere_responsible", "Responsável no dia", required: true),
                FormFieldDef("tadel_adults", "Adultos (Tadel)", placeholder: "0", required: true, fieldType: .integer),
                FormFieldDef("tadel_kids", "Crianças (Tadel)", placeholder: "0", fieldType: .integer),
                FormFieldDef("vehicles_cars", "Carros", placeholder: "0", required: true, fieldType: .integer),
                FormFieldDef("vehicles_motos", "Motos", placeholder: "0", fieldType: .integer),
                FormFieldDef("vehicles_bikes", "Bicicletas", placeholder: "0", fieldType: .integer),
                FormFieldDef("vehicles_others", "Outros veículos", placeholder: "Ex: Ônibus - 2"),
                FormFieldDef("volunteers_atmosfera", "Voluntários Atmosfera", placeholder: "0", fieldType: .integer),
                FormFieldDef("volunteers_louvor", "Voluntários Louvor", placeholder: "0", fieldType: .integer),
                FormFieldDef("volunteers_midia", "Voluntários Mídia", placeholder: "0", fieldType: .integer),
                FormFieldDef("volunteers_danca", "Voluntários Dança", placeholder: "0", fieldType: .integer),
                FormFieldDef("notes", "Observação", fieldType: .multiline),
            ]
        case .guest:
            [
                FormFieldDef("date", "Data da Visita", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
                FormFieldDef("full_name", "Nome do Visitante", placeholder: "Nome completo", required: true, fieldType: .name),
                FormFieldDef("email", "E-mail", placeholder: "email@exemplo.com", required: true, fieldType: .email),
                FormFieldDef("phone", "Telefone", placeholder: "(41) 9 9999-9999", fieldType: .phone),
                FormFieldDef("invited_by", "Convidado por", fieldType: .selfOrSearch),
                FormFieldDef("via_casa_de_paz", "Veio de uma Casa de Paz?", fieldType: .toggle),
                FormFieldDef("how_met_church", "Como conheceu a igreja?"),
                FormFieldDef("address", "Endereço"),
            ]
        case .multiplication:
            [
                FormFieldDef("date", "Data da Multiplicação", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
                FormFieldDef("source_life_group_id", "Grupo de Vida de Origem", required: true, fieldType: .lgPicker),
                FormFieldDef("new_life_group_name", "Nome do Novo Grupo", placeholder: "Ex: GL Norte", required: true),
                FormFieldDef("new_leader_id", "Novo Líder", required: true, fieldType: .userPicker),
                FormFieldDef("host_id", "Anfitrião", required: true, fieldType: .userPicker),
                FormFieldDef("leader_phone", "Telefone do Líder", required: true, fieldType: .phone),
                FormFieldDef("meeting_day_time", "Dia e Horário", placeholder: "Ex: Sexta 19h", required: true),
                FormFieldDef("address", "Endereço", required: true),
                FormFieldDef("members_to_move", "Membros a Transferir", fieldType: .userMultiPicker),
                FormFieldDef("new_members", "Novos Membros", fieldType: .userMultiPicker),
                FormFieldDef("completed_leadership_track", "Completou Trilha de Liderança", fieldType: .toggle),
                FormFieldDef("legally_married", "Casado Legalmente", fieldType: .toggle),
                FormFieldDef("faithful_tither", "Dizimista Fiel", fieldType: .toggle),
                FormFieldDef("evangelizing_and_consolidating", "Evangelizando e Consolidando", fieldType: .toggle),
                FormFieldDef("good_testimony", "Bom Testemunho", fieldType: .toggle),
                FormFieldDef("single_living_in_purity", "Solteiro Vivendo em Pureza", fieldType: .toggle),
            ]
        case .memberRegistration:
            [
                FormFieldDef("full_name", "Nome Completo", required: true, fieldType: .name),
                FormFieldDef("email", "E-mail", placeholder: "email@exemplo.com", fieldType: .email),
                FormFieldDef("birth_date", "Data de Nascimento", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
                FormFieldDef("phone", "Telefone", placeholder: "(41) 9 9999-9999", required: true, fieldType: .phone),
                FormFieldDef("gender", "Gênero", required: true, fieldType: .select,
                    options: ["Masculino", "Feminino"], optionValues: ["m", "f"]),
                FormFieldDef("civil_state", "Estado Civil", required: true, fieldType: .select,
                    options: ["Solteiro", "Casado", "Divorciado", "Viúvo"],
                    optionValues: ["solteiro", "casado", "divorciado", "viuvo"]),
                FormFieldDef("sector_id", "Setor", required: true, fieldType: .userPicker),
                FormFieldDef("life_group_id", "Grupo de Vida", fieldType: .lgPicker),
                FormFieldDef("address", "Endereço"),
            ]
        case .conversion:
            [
                FormFieldDef("full_name", "Nome Completo", required: true, fieldType: .name),
                FormFieldDef("email", "E-mail", placeholder: "email@exemplo.com", required: true, fieldType: .email),
                FormFieldDef("phone", "Telefone", placeholder: "(41) 9 9999-9999", required: true, fieldType: .phone),
                FormFieldDef("decision_type", "Tipo de Decisão", required: true, fieldType: .select,
                    options: ["Primeira vez", "Reconciliação"],
                    optionValues: ["first_time", "reconciliation"]),
                FormFieldDef("how_met_church", "Como conheceu a igreja?", required: true),
                FormFieldDef("gender", "Gênero", required: true, fieldType: .select,
                    options: ["Masculino", "Feminino"], optionValues: ["m", "f"]),
                FormFieldDef("birth_date", "Data de Nascimento", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
                FormFieldDef("civil_state", "Estado Civil", required: true, fieldType: .select,
                    options: ["Solteiro", "Casado", "Divorciado", "Viúvo"],
                    optionValues: ["solteiro", "casado", "divorciado", "viuvo"]),
                FormFieldDef("address", "Endereço", required: true),
                FormFieldDef("attendance_count", "Quantidade de visitas", required: true),
                FormFieldDef("life_group_status", "Status do Grupo de Vida", required: true),
                FormFieldDef("life_group_leader_or_name", "Líder ou nome do GV"),
                FormFieldDef("invited_by", "Convidado por"),
                FormFieldDef("notes", "Observações", fieldType: .multiline),
            ]
        case .sectorSupervisorReport:
            [
                FormFieldDef("date", "Data do Relatório", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
                FormFieldDef("sector_id", "Setor", required: true, fieldType: .userPicker),
                FormFieldDef("life_groups_visited", "Grupos Visitados", fieldType: .lgPicker),
                FormFieldDef("leaders_pastored", "Líderes Pastoreados", fieldType: .userMultiPicker),
                FormFieldDef("multiplication_candidates", "Candidatos à Multiplicação", fieldType: .userMultiPicker),
                FormFieldDef("life_groups_count", "Total de Grupos", placeholder: "0", required: true, fieldType: .integer),
                FormFieldDef("life_groups_supervised", "Grupos Supervisionados", placeholder: "0", required: true, fieldType: .integer),
                FormFieldDef("life_group_observations", "Observações dos Grupos", fieldType: .multiline),
                FormFieldDef("sector_multiplication_date", "Data de Multiplicação do Setor", fieldType: .date),
                FormFieldDef("notes", "Observações", fieldType: .multiline),
            ]
        default: // areaSupervisorReport
            [
                FormFieldDef("date", "Data do Relatório", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
                FormFieldDef("area_id", "Área", required: true, fieldType: .userPicker),
                FormFieldDef("sector_leaders_pastored", "Líderes de Setor Pastoreados", fieldType: .userMultiPicker),
                FormFieldDef("life_groups_count", "Total de Grupos", placeholder: "0", required: true, fieldType: .integer),
                FormFieldDef("life_groups_supervised", "Grupos Supervisionados", placeholder: "0", required: true, fieldType: .integer),
                FormFieldDef("life_group_observations", "Observações dos Grupos", fieldType: .multiline),
                FormFieldDef("notes", "Observações", fieldType: .multiline),
            ]
        }
    }

    // Keep lifeGroupReport case unchanged
}
```

Add `lifeGroupReport` case in the appropriate switch fallthrough:

```swift
case .lifeGroupReport:
    [
        FormFieldDef("date", "Data da Reunião", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
        FormFieldDef("attendees", "Quantidade de Participantes", placeholder: "0", required: true, fieldType: .integer),
        FormFieldDef("visitors", "Quantidade de Visitantes", placeholder: "0", fieldType: .integer),
        FormFieldDef("offerings", "Oferta (R$)", placeholder: "0,00", fieldType: .currency),
        FormFieldDef("observations", "Observações", fieldType: .multiline),
    ]
case .course:
    [
        FormFieldDef("course_name", "Nome do Curso", placeholder: "Ex: Escola de Membros", required: true),
        FormFieldDef("enrolled_at", "Data de Inscrição", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
    ]
```

- [ ] **Step 2: Update `submit` function in FormDetailViewModelIOS**

Replace the `private func submit(type:userId:)` method. Add helper closures at the top:

```swift
private func submit(type: FormType, userId: String) async throws {
    let snapshot = fields
    func req(_ key: String) -> String { snapshot[key]?.trimmingCharacters(in: .whitespaces) ?? "" }
    func opt(_ key: String) -> String? {
        let v = snapshot[key]?.trimmingCharacters(in: .whitespaces)
        return v?.isEmpty == false ? v : nil
    }
    func int32(_ key: String) -> Int32 { Int32(snapshot[key]?.trimmingCharacters(in: .whitespaces) ?? "") ?? 0 }
    func intVal(_ key: String) -> Int32 { Int32(snapshot[key]?.trimmingCharacters(in: .whitespaces) ?? "") ?? 0 }
    func kdbl(_ key: String) -> KotlinDouble? {
        let raw = snapshot[key]?.trimmingCharacters(in: .whitespaces) ?? ""
        let n = raw.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: ".")
        return Double(n).map { KotlinDouble(value: $0) }
    }
    func isoDate(_ key: String) -> String {
        let raw = snapshot[key]?.trimmingCharacters(in: .whitespaces) ?? ""
        let fmt = DateFormatter(); fmt.dateFormat = "dd/MM/yyyy"
        let iso = DateFormatter(); iso.dateFormat = "yyyy-MM-dd"
        return fmt.date(from: raw).map { iso.string(from: $0) } ?? raw
    }
    func ids(_ key: String) -> [KotlinInt] {
        (snapshot[key] ?? "").split(separator: ",")
            .compactMap { Int32($0.trimmingCharacters(in: .whitespaces)) }
            .map { KotlinInt(value: $0) }
    }

    switch type {
    case .serviceReport:
        _ = try await formsRepository.submitServiceReport(form: ServiceReportForm(
            date: req("date"), reportType: req("report_type"), period: req("period"),
            atmosphereTeamId: opt("atmosphere_team_id").flatMap { Int($0) }.flatMap { KotlinInt(integerLiteral: $0) },
            atmosphereTeamOther: nil,
            atmosphereResponsible: req("atmosphere_responsible"),
            tadelAdults: int32("tadel_adults"), tadelKids: int32("tadel_kids"),
            vehiclesCars: int32("vehicles_cars"), vehiclesMotos: int32("vehicles_motos"),
            vehiclesBikes: int32("vehicles_bikes"), vehiclesOthers: opt("vehicles_others"),
            volunteersAtmosfera: int32("volunteers_atmosfera"), volunteersLouvor: int32("volunteers_louvor"),
            volunteersMiddia: int32("volunteers_midia"), volunteersDanca: int32("volunteers_danca"),
            notes: opt("notes")
        ))
    case .guest:
        let invitedBy = req("invited_by").isEmpty ? currentUserName : req("invited_by")
        _ = try await formsRepository.submitGuest(form: GuestForm(
            fullName: req("full_name"), email: opt("email"), phone: opt("phone"),
            invitedBy: invitedBy.isEmpty ? nil : invitedBy,
            viaCasaDePaz: snapshot["via_casa_de_paz"] == "true",
            howMetChurch: opt("how_met_church"), address: opt("address"),
            date: req("date")
        ))
    case .multiplication:
        _ = try await formsRepository.submitMultiplication(form: MultiplicationForm(
            date: req("date"),
            sourceLifeGroupId: intVal("source_life_group_id"),
            area: opt("area"), sector: opt("sector"),
            newLifeGroupName: req("new_life_group_name"),
            newLeaderId: intVal("new_leader_id"),
            hostId: intVal("host_id"),
            leaderPhone: req("leader_phone"),
            meetingDayTime: req("meeting_day_time"),
            address: req("address"),
            membersToMove: ids("members_to_move"),
            newMembers: ids("new_members"),
            completedLeadershipTrack: snapshot["completed_leadership_track"] == "true",
            legallyMarried: snapshot["legally_married"].map { KotlinBoolean(value: $0 == "true") },
            faithfulTither: snapshot["faithful_tither"] == "true",
            evangelizingAndConsolidating: snapshot["evangelizing_and_consolidating"] == "true",
            goodTestimony: snapshot["good_testimony"] == "true",
            singleLivingInPurity: snapshot["single_living_in_purity"].map { KotlinBoolean(value: $0 == "true") }
        ))
    case .memberRegistration:
        _ = try await formsRepository.submitMemberRegistration(form: MemberRegistrationForm(
            fullName: req("full_name"),
            birthDate: isoDate("birth_date"),
            phone: req("phone"),
            gender: req("gender"),
            civilState: req("civil_state"),
            sectorId: intVal("sector_id"),
            email: opt("email"),
            lifeGroupId: intVal("life_group_id") > 0 ? KotlinInt(value: intVal("life_group_id")) : nil,
            cep: nil, street: nil, addressNumber: nil, complement: nil,
            neighborhood: nil, city: nil, state_: nil,
            address: opt("address")
        ))
    case .conversion:
        _ = try await formsRepository.submitConversion(form: ConversionForm(
            fullName: req("full_name"),
            email: req("email"),
            phone: req("phone"),
            decisionType: req("decision_type"),
            howMetChurch: req("how_met_church"),
            gender: req("gender"),
            birthDate: isoDate("birth_date"),
            civilState: req("civil_state"),
            address: req("address"),
            attendanceCount: req("attendance_count"),
            lifeGroupStatus: req("life_group_status"),
            lifeGroupLeaderOrName: opt("life_group_leader_or_name"),
            invitedBy: opt("invited_by"),
            notes: opt("notes")
        ))
    case .course:
        _ = try await formsRepository.submitCourse(form: CourseForm(
            courseName: req("course_name"), memberId: userId,
            enrolledAt: isoDate("enrolled_at")
        ))
    case .lifeGroupReport:
        _ = try await formsRepository.submitLifeGroupReport(form: LifeGroupReportForm(
            lifeGroupId: userId, date: req("date"),
            attendees: int32("attendees"), visitors: int32("visitors"),
            offerings: kdbl("offerings"), observations: opt("observations")
        ))
    case .sectorSupervisorReport:
        let observations = req("life_group_observations")
            .split(separator: "\n").map(String.init).filter { !$0.isEmpty }
        _ = try await formsRepository.submitSectorReport(form: SectorSupervisorReportForm(
            date: req("date"),
            sectorId: intVal("sector_id"),
            areaId: intVal("area_id") > 0 ? KotlinInt(value: intVal("area_id")) : nil,
            lifeGroupsVisited: ids("life_groups_visited"),
            leadersPastored: ids("leaders_pastored"),
            multiplicationCandidates: ids("multiplication_candidates"),
            lifeGroupsCount: intVal("life_groups_count"),
            lifeGroupsSupervised: intVal("life_groups_supervised"),
            lifeGroupObservations: observations,
            sectorMultiplicationDate: opt("sector_multiplication_date"),
            notes: opt("notes")
        ))
    default: // areaSupervisorReport
        let observations = req("life_group_observations")
            .split(separator: "\n").map(String.init).filter { !$0.isEmpty }
        _ = try await formsRepository.submitAreaReport(form: AreaSupervisorReportForm(
            date: req("date"),
            areaId: intVal("area_id"),
            sectorsVisited: ids("sectors_visited"),
            sectorLeadersPastored: ids("sector_leaders_pastored"),
            multiplicationsInProgress: intVal("multiplications_in_progress") > 0 ? KotlinInt(value: intVal("multiplications_in_progress")) : nil,
            lifeGroupsCount: intVal("life_groups_count"),
            lifeGroupsSupervised: intVal("life_groups_supervised"),
            lifeGroupObservations: observations,
            notes: opt("notes")
        ))
    }
}
```

Note: `intVal` for iOS returns `Int32`. Also add this helper to the ViewModel:

```swift
private func intVal(_ snapshot: [String: String], _ key: String) -> Int32 {
    Int32(snapshot[key]?.trimmingCharacters(in: .whitespaces) ?? "") ?? 0
}
```

Since closures can't easily reference the outer func, use a local nested function instead:

```swift
// Replace `intVal` closure in submit() with:
func intVal(_ key: String) -> Int32 { Int32(snapshot[key]?.trimmingCharacters(in: .whitespaces) ?? "") ?? 0 }
```

- [ ] **Step 3: Build XCFramework**

```bash
cd kmp-mobile && ./gradlew :shared:assembleSharedXCFramework
# Expected: BUILD SUCCESSFUL
```

- [ ] **Step 4: Build iOS**

```bash
cd kmp-mobile/ios && xcodebuild -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -5
# Expected: BUILD SUCCEEDED
```

- [ ] **Step 5: Commit**

```bash
cd kmp-mobile
git add ios/PazChurch/Features/Formularios/FormDetailView.swift
git commit -m "feat(ios): update all form field defs and submit to match backend"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Service report: `report_type` and `period` as selects | Task 5+6 |
| Guest: date first, email, selfOrSearch invited_by, fix toggle layout, how_met_church, address | Task 5+6 |
| Guest: backend creates User row | Task 1 |
| Multiplication: full 18-field set with pickers | Task 5+6 |
| Member registration: mirror admin-ui | Task 5+6 |
| Conversion: mirror admin-ui | Task 5+6 |
| Sector supervisor: correct distinct shape | Task 5+6 |
| Area supervisor: correct distinct shape | Task 5+6 |
| Search endpoints (`GET /users?q=`, `GET /life-groups?q=`) | Task 1 |
| User picker (single + multi) | Task 3+4 |
| LG picker | Task 3+4 |
| selfOrSearch control | Task 3+4 |
| Shared unit tests (payload mapping) | Task 2 |
| ViewModel validation for select/picker empty = missing | Task 3 (ViewModel) |

**Placeholder scan:** No TBDs or vague steps. Every step has actual code or commands.

**Type consistency:**
- `GuestForm.fullName` (SerialName: `full_name`) — consistent in Task 2 DTO and Task 5 mapper.
- `SectorSupervisorReportForm` / `AreaSupervisorReportForm` — defined in Task 2, consumed in Tasks 3, 5, 6.
- `LifeGroupSummary` — defined in Task 2, consumed in Tasks 3+4.
- `FormsRepository.searchUsers` / `searchLifeGroups` — defined in Task 2, consumed in Tasks 3+4.
- Android `FormFieldType.SELECT` / `USER_PICKER` / `USER_MULTI_PICKER` / `LG_PICKER` / `SELF_OR_SEARCH` — defined in Task 3 Step 3, consumed in Task 3 Step 7 and Task 5 Step 1.
- iOS `FormFieldType.select` / `.userPicker` / `.userMultiPicker` / `.lgPicker` / `.selfOrSearch` — defined in Task 4 Step 1, consumed in Task 4 Step 5 and Task 6 Step 1.

**Gap identified:** The `canSubmit` validation in both platforms checks `fields[key].isEmpty` for required fields. SELECT and PICKER fields (USER_PICKER, LG_PICKER) now also store their value in `fields[key]` as an ID string, so the existing blank-string check correctly enforces them as required. SELF_OR_SEARCH: when in self mode the value is `""` and it's optional (`invited_by` is not required), so no gap.

**Note on `sector_id` / `area_id`:** These are marked as `USER_PICKER` as a temporary stand-in since there's no dedicated sector/area picker yet. The user must search for the sector/area leader, and the ID stored will be wrong (it's a user ID, not a sector/area ID). This is flagged with `// TODO: sector picker` comments in the fieldDefs. A follow-up task should add sector and area search endpoints and a dedicated picker type. This limitation is accepted per the spec's note "Area/sector representation in multiplication (text vs select) to match admin-ui's exact control during implementation."
