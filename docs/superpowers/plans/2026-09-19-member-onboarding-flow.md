# Member Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After every first sign-in (Apple/Google), walk the user through a 4-step onboarding flow — welcome video, birthday, WhatsApp number, address (CEP lookup with manual fallback) — replacing today's bare birthdate-only dialog, with skippable steps that resume from whatever fields are still missing on the backend `User` record.

**Architecture:** Backend gains an address field on the self-service profile-update path (`PUT /users/me`) plus a `zipCode` column on `Address`. kmp-mobile shared gains an `onboarding` package (mirroring the existing `auth` package) with a repository that (a) reads profile completeness off `AuthRepository`'s current user and (b) wraps a ViaCEP GET call. Android (Compose) and iOS (SwiftUI) each get a 4-step onboarding UI driven by that shared state, replacing the existing `BirthDateDialog`/`needsBirthDate` single-field flow.

**Tech Stack:** NestJS + TypeORM (backend), Kotlin Multiplatform + Ktor (shared), Jetpack Compose (Android), SwiftUI + `@Observable` (iOS).

## Global Constraints

- No hardcoded hex colors — use `PazColors`/`PazGradients` tokens on both platforms (from project memory `feedback-design-tokens`).
- iOS ViewModels/state holders must be `@Observable`, never `ObservableObject` (project convention, confirmed via `AuthenticationCoordinator`).
- iOS navigation: `NavigationStack`, native nav bar — no custom hero headers for this flow.
- System fonts only on both platforms.
- ktlint/SwiftFormat must pass; all UI states (loading/error/empty/content) must be handled — no partial states.
- Backend: `npm run lint` reformats the *entire* backend repo — scope any lint fixes to touched files only, and always `git status` before committing.
- WhatsApp number reuses `User.phoneNumber` — no new column for it.
- Onboarding progress is derived from backend field presence — no separate "completed" flag, local or remote.
- Video is not skippable; birthday/WhatsApp/address steps are skippable.

---

## Task 1: Backend — add `zipCode` to `Address` entity + migration

**Files:**
- Modify: `backend/src/addresses/entities/address.entity.ts`
- Create: `backend/src/migrations/<timestamp>-AddZipCodeToAddress.ts` (follow existing migration naming pattern in `backend/src/migrations/`)
- Test: `backend/src/addresses/entities/address.entity.spec.ts` (create if no existing spec file for this entity)

**Interfaces:**
- Produces: `Address.zipCode: string | null` — consumed by Task 2's DTO and Task 3's controller/service.

- [ ] **Step 1: Inspect current `Address` entity and an existing migration for the exact style to follow**

Run: `cat backend/src/addresses/entities/address.entity.ts` and `ls backend/src/migrations | tail -5` to copy the existing column/migration conventions (naming, `@Column` options, `up`/`down` style) exactly.

- [ ] **Step 2: Add the column**

```typescript
// backend/src/addresses/entities/address.entity.ts
@Column({ name: 'zip_code', type: 'varchar', length: 8, nullable: true })
zipCode: string | null;
```

Place it alongside the other address fields, matching existing `@Column` formatting in the file.

- [ ] **Step 3: Generate/write the migration**

```typescript
// backend/src/migrations/<timestamp>-AddZipCodeToAddress.ts
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddZipCodeToAddress<timestamp> implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'addresses',
      new TableColumn({
        name: 'zip_code',
        type: 'varchar',
        length: '8',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('addresses', 'zip_code');
  }
}
```

Confirm the table name (`addresses`) matches `@Entity('addresses')` in the entity file before running — adjust if the actual table name differs.

- [ ] **Step 4: Run the migration locally and verify**

Run: `cd backend && npm run migration:run` (use the exact script name from `backend/package.json`)
Expected: migration applies with no errors; `\d addresses` in psql (or equivalent) shows `zip_code`.

- [ ] **Step 5: Write a test confirming the column is persisted**

```typescript
// backend/src/addresses/entities/address.entity.spec.ts
import { Address } from './address.entity';

describe('Address entity', () => {
  it('accepts a nullable zipCode', () => {
    const address = new Address();
    address.zipCode = '01310100';
    expect(address.zipCode).toBe('01310100');
  });
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && npm test -- address.entity.spec.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
cd backend
git add src/addresses/entities/address.entity.ts src/migrations/*AddZipCodeToAddress.ts src/addresses/entities/address.entity.spec.ts
git commit -m "feat(backend): add zipCode column to Address entity"
```

---

## Task 2: Backend — extend self-service profile update to accept address

**Files:**
- Modify: `backend/src/users/dto/update-profile.dto.ts`
- Modify: `backend/src/users/users.controller.ts:117-123` (`updateMe`)
- Modify: `backend/src/users/users.service.ts` (`updateProfile` method — locate exact method via `grep -n "updateProfile" backend/src/users/users.service.ts`)
- Test: `backend/src/users/users.service.spec.ts` (extend existing, or create if absent)

**Interfaces:**
- Consumes: `Address.zipCode` from Task 1.
- Produces: `UpdateProfileDto` shape `{ name?: string; phone?: string; birth_date?: string; address?: { street: string; number: string; complement?: string; neighborhood: string; city: string; state: string; zip_code: string } }` — consumed by kmp-mobile's `OnboardingRepositoryImpl` in Task 5.

- [ ] **Step 1: Read the current DTO and service method in full**

Run: `cat backend/src/users/dto/update-profile.dto.ts` and locate `updateProfile` in `backend/src/users/users.service.ts` to match existing validation/style exactly (class-validator decorators used elsewhere in the file).

- [ ] **Step 2: Add an `AddressDto` and extend `UpdateProfileDto`**

```typescript
// backend/src/users/dto/update-profile.dto.ts
import { IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AddressDto {
  @IsString()
  street: string;

  @IsString()
  number: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsString()
  neighborhood: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  zip_code: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  birth_date?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}
```

Keep any decorators already present on `name`/`phone`/`birth_date` — only add the `address` field, don't rewrite existing fields' validation.

- [ ] **Step 3: Update `updateProfile` in `users.service.ts` to persist the address**

Read the existing method body first (`grep -n -A 20 "async updateProfile" backend/src/users/users.service.ts`) and extend it — do not replace unrelated logic:

```typescript
async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
  const user = await this.usersRepository.findOneOrFail({
    where: { id: userId },
    relations: ['address'],
  });

  if (dto.name !== undefined) user.name = dto.name;
  if (dto.phone !== undefined) user.phoneNumber = dto.phone;
  if (dto.birth_date !== undefined) user.birthDate = new Date(dto.birth_date);

  if (dto.address) {
    const address = user.address ?? this.addressRepository.create();
    address.street = dto.address.street;
    address.number = dto.address.number;
    address.complement = dto.address.complement ?? null;
    address.neighborhood = dto.address.neighborhood;
    address.city = dto.address.city;
    address.state = dto.address.state;
    address.zipCode = dto.address.zip_code;
    user.address = await this.addressRepository.save(address);
  }

  return this.usersRepository.save(user);
}
```

Inject `addressRepository` (`@InjectRepository(Address)`) in the constructor if not already present — check the top of `users.service.ts` first.

- [ ] **Step 4: Write a failing test for the address update path**

```typescript
// backend/src/users/users.service.spec.ts (add this test)
it('persists a new address on updateProfile', async () => {
  const dto = {
    address: {
      street: 'Rua Augusta',
      number: '100',
      neighborhood: 'Consolação',
      city: 'São Paulo',
      state: 'SP',
      zip_code: '01310100',
    },
  };

  const result = await service.updateProfile(existingUserId, dto);

  expect(result.address).toMatchObject({
    street: 'Rua Augusta',
    zipCode: '01310100',
  });
});
```

Wire `existingUserId` and repository mocks/fixtures following the existing pattern already used in that spec file (read the file first — do not invent a different mocking style).

- [ ] **Step 5: Run test to verify it fails**

Run: `cd backend && npm test -- users.service.spec.ts`
Expected: FAIL (address not yet persisted, or `addressRepository` not injected)

- [ ] **Step 6: Confirm implementation from Step 3 makes it pass**

Run: `cd backend && npm test -- users.service.spec.ts`
Expected: PASS

- [ ] **Step 7: Lint only the touched files**

Run: `cd backend && npx eslint src/users/dto/update-profile.dto.ts src/users/users.service.ts --fix`
(Do NOT run the repo-wide `npm run lint`.)

- [ ] **Step 8: `git status` before committing, then commit**

```bash
cd backend
git status
git add src/users/dto/update-profile.dto.ts src/users/users.service.ts src/users/users.service.spec.ts
git commit -m "feat(backend): accept address in self-service profile update"
```

---

## Task 3: kmp-mobile shared — `OnboardingRepository` + ViaCEP client

**Files:**
- Create: `kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/OnboardingModels.kt`
- Create: `kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/domain/repository/OnboardingRepository.kt`
- Create: `kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/OnboardingRepositoryImpl.kt`
- Modify: `kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/di/*` (wire the new repository — locate the exact DI module file via `grep -rl "AuthRepositoryImpl" kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/di/`)
- Test: `kmp-mobile/shared/src/commonTest/kotlin/br/church/paz/shared/data/repository/OnboardingRepositoryImplTest.kt`

**Interfaces:**
- Consumes: `PazHttpClient`-provided `HttpClient` (existing, from `data/remote/PazHttpClient.kt`); `AuthRepository`'s current-user accessor (locate exact method name via `grep -n "fun " kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/domain/repository/AuthRepository.kt`).
- Produces:
  - `data class OnboardingStep` (enum-like sealed type: `Video`, `Birthday`, `Whatsapp`, `Address`)
  - `data class CepLookupResult(val street: String, val neighborhood: String, val city: String, val state: String)`
  - `sealed interface CepLookupOutcome { data class Found(val result: CepLookupResult) ; object NotFound ; data class Error(val message: String) }`
  - `interface OnboardingRepository { suspend fun missingSteps(): List<OnboardingStep>; suspend fun lookupCep(cep: String): CepLookupOutcome; suspend fun submitBirthday(birthDate: String): Result<Unit>; suspend fun submitWhatsapp(phone: String): Result<Unit>; suspend fun submitAddress(street: String, number: String, complement: String?, neighborhood: String, city: String, state: String, zipCode: String): Result<Unit> }`
  - Consumed by Task 4 (Android ViewModel) and Task 6 (iOS coordinator).

- [ ] **Step 1: Read `AuthRepositoryImpl.kt` and `PazHttpClient.kt` in full to match exact patterns**

Run: `cat kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/AuthRepositoryImpl.kt kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/data/remote/PazHttpClient.kt`

Confirm: the exact `safeRunCatching` helper location/signature, how `httpClient` is injected (constructor param name/type), and how the current user is fetched/cached (needed for `missingSteps()`).

- [ ] **Step 2: Write the failing test for `missingSteps()`**

```kotlin
// kmp-mobile/shared/src/commonTest/kotlin/br/church/paz/shared/data/repository/OnboardingRepositoryImplTest.kt
package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.OnboardingStep
import kotlin.test.Test
import kotlin.test.assertEquals

class OnboardingRepositoryImplTest {

    @Test
    fun `missingSteps returns birthday whatsapp and address when user has none of them`() = runTestWithFakeUser(
        birthDate = null,
        phoneNumber = null,
        hasAddress = false,
    ) { repository ->
        val result = repository.missingSteps()
        assertEquals(
            listOf(OnboardingStep.Birthday, OnboardingStep.Whatsapp, OnboardingStep.Address),
            result,
        )
    }

    @Test
    fun `missingSteps is empty when user has all fields`() = runTestWithFakeUser(
        birthDate = "1990-01-01",
        phoneNumber = "+5511999999999",
        hasAddress = true,
    ) { repository ->
        val result = repository.missingSteps()
        assertEquals(emptyList(), result)
    }
}
```

`runTestWithFakeUser` is a small local test helper you write in the same file, constructing `OnboardingRepositoryImpl` with a fake `AuthRepository` that returns a `User` fixture with the given fields — mirror however `AuthRepositoryImplTest` (if it exists; check `kmp-mobile/shared/src/commonTest/`) fakes its dependencies. If no existing test fakes a repository, write a minimal fake class implementing `AuthRepository` with the other methods throwing `NotImplementedError()`.

- [ ] **Step 3: Run test to verify it fails**

Run: `cd kmp-mobile && ./gradlew :shared:commonTest --tests "*.OnboardingRepositoryImplTest"`
Expected: FAIL — compile error (`OnboardingRepositoryImpl` doesn't exist yet)

- [ ] **Step 4: Create the domain models**

```kotlin
// kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/OnboardingModels.kt
package br.church.paz.shared.domain.model

enum class OnboardingStep {
    Video,
    Birthday,
    Whatsapp,
    Address,
}

data class CepLookupResult(
    val street: String,
    val neighborhood: String,
    val city: String,
    val state: String,
)

sealed interface CepLookupOutcome {
    data class Found(val result: CepLookupResult) : CepLookupOutcome
    data object NotFound : CepLookupOutcome
    data class Error(val message: String) : CepLookupOutcome
}
```

- [ ] **Step 5: Create the repository interface**

```kotlin
// kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/domain/repository/OnboardingRepository.kt
package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.CepLookupOutcome
import br.church.paz.shared.domain.model.OnboardingStep

interface OnboardingRepository {
    suspend fun missingSteps(): List<OnboardingStep>
    suspend fun lookupCep(cep: String): CepLookupOutcome
    suspend fun submitBirthday(birthDate: String): Result<Unit>
    suspend fun submitWhatsapp(phone: String): Result<Unit>
    suspend fun submitAddress(
        street: String,
        number: String,
        complement: String?,
        neighborhood: String,
        city: String,
        state: String,
        zipCode: String,
    ): Result<Unit>
}
```

- [ ] **Step 6: Implement `OnboardingRepositoryImpl`**

Match the exact constructor-injection and `safeRunCatching`/`httpClient.post` style found in `AuthRepositoryImpl.kt` in Step 1 — the sketch below must be adjusted to that exact helper name/signature:

```kotlin
// kmp-mobile/shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/OnboardingRepositoryImpl.kt
package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.CepLookupOutcome
import br.church.paz.shared.domain.model.CepLookupResult
import br.church.paz.shared.domain.model.OnboardingStep
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.OnboardingRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.serialization.Serializable

class OnboardingRepositoryImpl(
    private val httpClient: HttpClient,
    private val authRepository: AuthRepository,
) : OnboardingRepository {

    override suspend fun missingSteps(): List<OnboardingStep> {
        val user = authRepository.currentUser() ?: return emptyList()
        return buildList {
            if (user.birthDate == null) add(OnboardingStep.Birthday)
            if (user.phoneNumber.isNullOrBlank()) add(OnboardingStep.Whatsapp)
            if (user.address == null) add(OnboardingStep.Address)
        }
    }

    override suspend fun lookupCep(cep: String): CepLookupOutcome {
        return try {
            val response = httpClient.get("https://viacep.com.br/ws/$cep/json/")
            if (!response.status.isSuccess()) {
                return CepLookupOutcome.Error("HTTP ${response.status.value}")
            }
            val body: ViaCepResponse = response.body()
            if (body.erro == true) {
                CepLookupOutcome.NotFound
            } else {
                CepLookupOutcome.Found(
                    CepLookupResult(
                        street = body.logradouro.orEmpty(),
                        neighborhood = body.bairro.orEmpty(),
                        city = body.localidade.orEmpty(),
                        state = body.uf.orEmpty(),
                    ),
                )
            }
        } catch (e: Exception) {
            CepLookupOutcome.Error(e.message ?: "Unknown error")
        }
    }

    override suspend fun submitBirthday(birthDate: String): Result<Unit> = updateProfile(
        mapOf("birth_date" to birthDate),
    )

    override suspend fun submitWhatsapp(phone: String): Result<Unit> = updateProfile(
        mapOf("phone" to phone),
    )

    override suspend fun submitAddress(
        street: String,
        number: String,
        complement: String?,
        neighborhood: String,
        city: String,
        state: String,
        zipCode: String,
    ): Result<Unit> = updateProfile(
        mapOf(
            "address" to mapOf(
                "street" to street,
                "number" to number,
                "complement" to complement,
                "neighborhood" to neighborhood,
                "city" to city,
                "state" to state,
                "zip_code" to zipCode,
            ),
        ),
    )

    private suspend fun updateProfile(fields: Map<String, Any?>): Result<Unit> {
        return try {
            val response = httpClient.post("api/users/me") {
                contentType(ContentType.Application.Json)
                setBody(fields)
            }
            if (response.status.isSuccess()) Result.success(Unit) else {
                Result.failure(IllegalStateException("HTTP ${response.status.value}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

@Serializable
private data class ViaCepResponse(
    val logradouro: String? = null,
    val bairro: String? = null,
    val localidade: String? = null,
    val uf: String? = null,
    val erro: Boolean? = null,
)
```

Adjust `authRepository.currentUser()` to whatever the real accessor is found in Step 1 (it may be a `Flow<User?>` you `.first()`, or a suspend getter — match reality, don't guess blindly at implementation time).

- [ ] **Step 7: Run test to verify it passes**

Run: `cd kmp-mobile && ./gradlew :shared:commonTest --tests "*.OnboardingRepositoryImplTest"`
Expected: PASS

- [ ] **Step 8: Wire into DI**

Open the DI module file found in Step 1's grep and add `OnboardingRepositoryImpl` binding alongside the existing `AuthRepositoryImpl` binding, following that file's exact DI framework syntax (Koin module `single { }` or manual factory — match what's there).

- [ ] **Step 9: Run ktlint on touched files**

Run: `cd kmp-mobile && ./gradlew ktlintCheck` (or the module-scoped task if one exists, e.g. `:shared:ktlintCheck`)
Expected: no violations on the new files.

- [ ] **Step 10: Commit**

```bash
cd kmp-mobile
git add shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/OnboardingModels.kt \
        shared/src/commonMain/kotlin/br/church/paz/shared/domain/repository/OnboardingRepository.kt \
        shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/OnboardingRepositoryImpl.kt \
        shared/src/commonTest/kotlin/br/church/paz/shared/data/repository/OnboardingRepositoryImplTest.kt
git commit -m "feat(kmp-shared): add OnboardingRepository with ViaCEP lookup"
```

---

## Task 4: Android — Onboarding UI flow

**Files:**
- Create: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/onboarding/OnboardingViewModel.kt`
- Create: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/onboarding/OnboardingScreen.kt`
- Modify: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/auth/LoginViewModel.kt` (replace `needsBirthDate`-only branch with navigation to onboarding)
- Modify: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/auth/LoginScreen.kt` (remove standalone `BirthDateDialog` call at line 99; navigate to `OnboardingScreen` instead)
- Test: `kmp-mobile/android/src/test/kotlin/br/church/paz/android/ui/features/onboarding/OnboardingViewModelTest.kt`

**Interfaces:**
- Consumes: `OnboardingRepository` from Task 3 (`missingSteps()`, `lookupCep()`, `submitBirthday()`, `submitWhatsapp()`, `submitAddress()`); existing `PazColors`/`PazGradients` tokens; existing app navigation graph (locate via `grep -rn "LoginScreen" kmp-mobile/android/src/main/kotlin --include=*.kt | grep -i nav`).
- Produces: `OnboardingScreen(onFinished: () -> Unit)` composable, called from the nav graph after successful sign-in when `missingSteps()` is non-empty.

- [ ] **Step 1: Read `LoginViewModel.kt` and `LoginScreen.kt` in full**

Confirm exact current `needsBirthDate` field name, `LoginUiState` shape, `LoginEffect` sealed type, and how `LoginScreen` currently reacts to `needsBirthDate == true` (which composable/dialog invocation to remove).

- [ ] **Step 2: Write failing `OnboardingViewModel` test for step sequencing**

```kotlin
// kmp-mobile/android/src/test/kotlin/br/church/paz/android/ui/features/onboarding/OnboardingViewModelTest.kt
package br.church.paz.android.ui.features.onboarding

import br.church.paz.shared.domain.model.OnboardingStep
import kotlinx.coroutines.test.runTest
import org.junit.Test
import kotlin.test.assertEquals

class OnboardingViewModelTest {

    @Test
    fun `starts on video then advances to first missing step`() = runTest {
        val repository = FakeOnboardingRepository(
            missing = listOf(OnboardingStep.Whatsapp, OnboardingStep.Address),
        )
        val viewModel = OnboardingViewModel(repository)

        assertEquals(OnboardingStep.Video, viewModel.uiState.value.currentStep)

        viewModel.onVideoFinished()

        assertEquals(OnboardingStep.Whatsapp, viewModel.uiState.value.currentStep)
    }

    @Test
    fun `skipping a step advances to the next one`() = runTest {
        val repository = FakeOnboardingRepository(
            missing = listOf(OnboardingStep.Whatsapp, OnboardingStep.Address),
        )
        val viewModel = OnboardingViewModel(repository)
        viewModel.onVideoFinished()

        viewModel.onSkipCurrentStep()

        assertEquals(OnboardingStep.Address, viewModel.uiState.value.currentStep)
    }
}
```

Write `FakeOnboardingRepository` in the same test file implementing `OnboardingRepository`, with `missingSteps()` returning the constructor-supplied list and every other method returning `Result.success(Unit)` / `CepLookupOutcome.NotFound` as needed.

- [ ] **Step 3: Run test to verify it fails**

Run: `cd kmp-mobile && ./gradlew :android:testDebugUnitTest --tests "*.OnboardingViewModelTest"`
Expected: FAIL (class doesn't exist)

- [ ] **Step 4: Implement `OnboardingViewModel`**

```kotlin
// kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/onboarding/OnboardingViewModel.kt
package br.church.paz.android.ui.features.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.CepLookupOutcome
import br.church.paz.shared.domain.model.OnboardingStep
import br.church.paz.shared.domain.repository.OnboardingRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class OnboardingUiState(
    val currentStep: OnboardingStep = OnboardingStep.Video,
    val remainingSteps: List<OnboardingStep> = emptyList(),
    val isSubmitting: Boolean = false,
    val cepResult: CepLookupOutcome? = null,
    val isFinished: Boolean = false,
)

class OnboardingViewModel(
    private val repository: OnboardingRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OnboardingUiState())
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val missing = repository.missingSteps()
            _uiState.value = _uiState.value.copy(remainingSteps = missing)
        }
    }

    fun onVideoFinished() = advance()

    fun onSkipCurrentStep() = advance()

    fun onBirthdaySubmitted(birthDate: String) = submit { repository.submitBirthday(birthDate) }

    fun onWhatsappSubmitted(phone: String) = submit { repository.submitWhatsapp(phone) }

    fun onAddressSubmitted(
        street: String,
        number: String,
        complement: String?,
        neighborhood: String,
        city: String,
        state: String,
        zipCode: String,
    ) = submit {
        repository.submitAddress(street, number, complement, neighborhood, city, state, zipCode)
    }

    fun onLookupCep(cep: String) {
        viewModelScope.launch {
            val result = repository.lookupCep(cep)
            _uiState.value = _uiState.value.copy(cepResult = result)
        }
    }

    private fun submit(action: suspend () -> Result<Unit>) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true)
            action()
            _uiState.value = _uiState.value.copy(isSubmitting = false)
            advance()
        }
    }

    private fun advance() {
        val remaining = _uiState.value.remainingSteps
        if (remaining.isEmpty()) {
            _uiState.value = _uiState.value.copy(isFinished = true)
            return
        }
        val next = remaining.first()
        _uiState.value = _uiState.value.copy(
            currentStep = next,
            remainingSteps = remaining.drop(1),
        )
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd kmp-mobile && ./gradlew :android:testDebugUnitTest --tests "*.OnboardingViewModelTest"`
Expected: PASS

- [ ] **Step 6: Build `OnboardingScreen` composable with all 4 steps**

```kotlin
// kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/onboarding/OnboardingScreen.kt
package br.church.paz.android.ui.features.onboarding

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import br.church.paz.android.designsystem.PazColors
import br.church.paz.shared.domain.model.CepLookupOutcome
import br.church.paz.shared.domain.model.OnboardingStep
import org.koin.androidx.compose.koinViewModel

@Composable
fun OnboardingScreen(
    onFinished: () -> Unit,
    viewModel: OnboardingViewModel = koinViewModel(),
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.isFinished) {
        if (state.isFinished) onFinished()
    }

    Surface(modifier = Modifier.fillMaxSize(), color = PazColors.background) {
        when (state.currentStep) {
            OnboardingStep.Video -> WelcomeVideoStep(onFinished = viewModel::onVideoFinished)
            OnboardingStep.Birthday -> BirthdayStep(
                isSubmitting = state.isSubmitting,
                onSubmit = viewModel::onBirthdaySubmitted,
                onSkip = viewModel::onSkipCurrentStep,
            )
            OnboardingStep.Whatsapp -> WhatsappStep(
                isSubmitting = state.isSubmitting,
                onSubmit = viewModel::onWhatsappSubmitted,
                onSkip = viewModel::onSkipCurrentStep,
            )
            OnboardingStep.Address -> AddressStep(
                isSubmitting = state.isSubmitting,
                cepResult = state.cepResult,
                onLookupCep = viewModel::onLookupCep,
                onSubmit = viewModel::onAddressSubmitted,
                onSkip = viewModel::onSkipCurrentStep,
            )
        }
    }
}

@Composable
private fun WelcomeVideoStep(onFinished: () -> Unit) {
    // Video URL: read from BuildConfig.ONBOARDING_VIDEO_URL (add this build config field
    // pointing at the remote-hosted video — see Task 7 for where this is configured).
    // Use ExoPlayer/Media3 PlayerView; call onFinished() from the player's
    // Player.Listener.onPlaybackStateChanged when STATE_ENDED is reached.
    Box(modifier = Modifier.fillMaxSize()) {
        // Media3 PlayerView wiring goes here.
    }
}

@Composable
private fun BirthdayStep(
    isSubmitting: Boolean,
    onSubmit: (String) -> Unit,
    onSkip: () -> Unit,
) {
    var birthDate by remember { mutableStateOf("") }
    Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
        Text("Qual sua data de nascimento?", style = MaterialTheme.typography.headlineSmall)
        Text(
            "Usamos isso para conectar você a grupos e ministérios da sua faixa etária, e para " +
                "confirmar seu cadastro caso já exista um registro seu na igreja.",
            style = MaterialTheme.typography.bodyMedium,
        )
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(
            value = birthDate,
            onValueChange = { birthDate = it },
            label = { Text("DD/MM/AAAA") },
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = { onSubmit(birthDate) }, enabled = !isSubmitting) { Text("Continuar") }
        TextButton(onClick = onSkip) { Text("Pular por agora") }
    }
}

@Composable
private fun WhatsappStep(
    isSubmitting: Boolean,
    onSubmit: (String) -> Unit,
    onSkip: () -> Unit,
) {
    var phone by remember { mutableStateOf("") }
    Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
        Text("Qual seu WhatsApp?", style = MaterialTheme.typography.headlineSmall)
        Text(
            "É por ele que a equipe da igreja vai entrar em contato com você sobre grupos, " +
                "eventos e novidades.",
            style = MaterialTheme.typography.bodyMedium,
        )
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(
            value = phone,
            onValueChange = { phone = it },
            label = { Text("(11) 91234-5678") },
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = { onSubmit(phone) }, enabled = !isSubmitting) { Text("Continuar") }
        TextButton(onClick = onSkip) { Text("Pular por agora") }
    }
}

@Composable
private fun AddressStep(
    isSubmitting: Boolean,
    cepResult: CepLookupOutcome?,
    onLookupCep: (String) -> Unit,
    onSubmit: (String, String, String?, String, String, String, String) -> Unit,
    onSkip: () -> Unit,
) {
    var cep by remember { mutableStateOf("") }
    var number by remember { mutableStateOf("") }
    var complement by remember { mutableStateOf("") }
    var manualStreet by remember { mutableStateOf("") }
    var manualNeighborhood by remember { mutableStateOf("") }
    var manualCity by remember { mutableStateOf("") }
    var manualState by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
        Text("Qual seu endereço?", style = MaterialTheme.typography.headlineSmall)
        Text(
            "Usamos para visitas pastorais e para conectar você com o que acontece perto de você.",
            style = MaterialTheme.typography.bodyMedium,
        )
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(
            value = cep,
            onValueChange = { cep = it },
            label = { Text("CEP") },
            trailingIcon = { TextButton(onClick = { onLookupCep(cep) }) { Text("Buscar") } },
        )

        when (cepResult) {
            is CepLookupOutcome.Found -> {
                Text("${cepResult.result.street}, ${cepResult.result.neighborhood}")
                Text("${cepResult.result.city} - ${cepResult.result.state}")
                OutlinedTextField(value = number, onValueChange = { number = it }, label = { Text("Número") })
                OutlinedTextField(value = complement, onValueChange = { complement = it }, label = { Text("Complemento (opcional)") })
                Button(
                    onClick = {
                        onSubmit(
                            cepResult.result.street,
                            number,
                            complement.ifBlank { null },
                            cepResult.result.neighborhood,
                            cepResult.result.city,
                            cepResult.result.state,
                            cep,
                        )
                    },
                    enabled = !isSubmitting,
                ) { Text("Continuar") }
            }
            is CepLookupOutcome.NotFound, is CepLookupOutcome.Error -> {
                Text("Não encontramos esse CEP. Preencha seu endereço manualmente:")
                OutlinedTextField(value = manualStreet, onValueChange = { manualStreet = it }, label = { Text("Rua") })
                OutlinedTextField(value = number, onValueChange = { number = it }, label = { Text("Número") })
                OutlinedTextField(value = complement, onValueChange = { complement = it }, label = { Text("Complemento (opcional)") })
                OutlinedTextField(value = manualNeighborhood, onValueChange = { manualNeighborhood = it }, label = { Text("Bairro") })
                OutlinedTextField(value = manualCity, onValueChange = { manualCity = it }, label = { Text("Cidade") })
                OutlinedTextField(value = manualState, onValueChange = { manualState = it }, label = { Text("Estado") })
                Button(
                    onClick = {
                        onSubmit(
                            manualStreet,
                            number,
                            complement.ifBlank { null },
                            manualNeighborhood,
                            manualCity,
                            manualState,
                            cep,
                        )
                    },
                    enabled = !isSubmitting,
                ) { Text("Continuar") }
            }
            null -> {}
        }

        TextButton(onClick = onSkip) { Text("Pular por agora") }
    }
}
```

Confirm `PazColors`/`MaterialTheme` import path against an existing Android screen file before finalizing (`grep -rn "import br.church.paz.android.designsystem" kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/auth/LoginScreen.kt`) and correct the import if the actual path differs.

- [ ] **Step 7: Wire onboarding into the post-login navigation, removing the old `BirthDateDialog` path**

In `LoginViewModel.kt`, replace the `needsBirthDate = true` branch so that a `BirthDateRequiredException` (or, going forward, any successful login) triggers navigation to `OnboardingScreen` instead of setting `needsBirthDate`. In `LoginScreen.kt`, remove the `BirthDateDialog` invocation at line 99 and its now-unused `BirthDateDialog` composable (lines from 233), replacing the effect handling with navigation to the onboarding route. Locate the app's `NavHost` (via the earlier `grep -rn "LoginScreen"` search) and add a route for `OnboardingScreen`, called right after successful sign-in when `repository.missingSteps()` is non-empty (check this from the nav graph or from `LoginViewModel` before emitting the "navigate to home" effect).

- [ ] **Step 8: Manual QA**

Run the app (`./gradlew :android:installDebug`), sign in with a test account missing all 4 fields, and walk through: video plays and does not show a skip button; birthday/WhatsApp/address steps are each skippable; CEP lookup with a known valid CEP (e.g. `01310100`) auto-fills fields; an invalid CEP (e.g. `00000000`) falls back to manual entry.

- [ ] **Step 9: Run ktlint on touched files**

Run: `cd kmp-mobile && ./gradlew :android:ktlintCheck`

- [ ] **Step 10: Commit**

```bash
cd kmp-mobile
git add android/src/main/kotlin/br/church/paz/android/ui/features/onboarding/ \
        android/src/main/kotlin/br/church/paz/android/ui/features/auth/LoginViewModel.kt \
        android/src/main/kotlin/br/church/paz/android/ui/features/auth/LoginScreen.kt \
        android/src/test/kotlin/br/church/paz/android/ui/features/onboarding/OnboardingViewModelTest.kt
git commit -m "feat(android): add onboarding flow after sign-in"
```

---

## Task 5: iOS — Onboarding UI flow

**Files:**
- Create: `kmp-mobile/ios/PazChurch/Features/Onboarding/OnboardingCoordinator.swift`
- Create: `kmp-mobile/ios/PazChurch/Features/Onboarding/OnboardingView.swift`
- Modify: `kmp-mobile/ios/PazChurch/Features/Auth/LoginView.swift` (present `OnboardingView` after successful sign-in instead of any inline birthdate prompt)
- Modify: `kmp-mobile/ios/PazChurch/Services/AuthenticationCoordinator.swift` (only if it currently owns birthdate-prompt state — read it first to confirm)

**Interfaces:**
- Consumes: shared `OnboardingRepository` from Task 3 via the existing KMP↔Swift bridging pattern (check how `AuthenticationCoordinator` currently obtains `AuthRepository` — likely a shared DI container/`Koin.get()` equivalent — and mirror it exactly).
- Produces: `OnboardingView(onFinished: () -> Void)`; `@Observable class OnboardingCoordinator`.

- [ ] **Step 1: Read `AuthenticationCoordinator.swift` and `LoginView.swift` in full**

Confirm: how shared Kotlin repositories are obtained on iOS (dependency injection entry point), the exact `@Observable` state pattern used, and whether `LoginView` currently has any birthdate-handling code to remove.

- [ ] **Step 2: Implement `OnboardingCoordinator`**

```swift
// kmp-mobile/ios/PazChurch/Features/Onboarding/OnboardingCoordinator.swift
import Foundation
import Shared

@Observable
final class OnboardingCoordinator {
    enum Step {
        case video
        case birthday
        case whatsapp
        case address
        case finished
    }

    private(set) var currentStep: Step = .video
    private(set) var isSubmitting = false
    private(set) var cepResult: CepLookupOutcome?
    private var remainingSteps: [OnboardingStep] = []

    private let repository: OnboardingRepository

    init(repository: OnboardingRepository) {
        self.repository = repository
    }

    func start() async {
        remainingSteps = try? await repository.missingSteps() ?? []
        currentStep = .video
    }

    func onVideoFinished() {
        advance()
    }

    func onSkipCurrentStep() {
        advance()
    }

    func onBirthdaySubmitted(_ birthDate: String) async {
        await submit { try await self.repository.submitBirthday(birthDate: birthDate) }
    }

    func onWhatsappSubmitted(_ phone: String) async {
        await submit { try await self.repository.submitWhatsapp(phone: phone) }
    }

    func onAddressSubmitted(
        street: String, number: String, complement: String?,
        neighborhood: String, city: String, state: String, zipCode: String
    ) async {
        await submit {
            try await self.repository.submitAddress(
                street: street, number: number, complement: complement,
                neighborhood: neighborhood, city: city, state: state, zipCode: zipCode
            )
        }
    }

    func onLookupCep(_ cep: String) async {
        cepResult = try? await repository.lookupCep(cep: cep)
    }

    private func submit(_ action: @escaping () async throws -> Void) async {
        isSubmitting = true
        try? await action()
        isSubmitting = false
        advance()
    }

    private func advance() {
        guard !remainingSteps.isEmpty else {
            currentStep = .finished
            return
        }
        let next = remainingSteps.removeFirst()
        currentStep = switch next {
        case .birthday: .birthday
        case .whatsapp: .whatsapp
        case .address: .address
        default: .finished
        }
    }
}
```

Adjust the exact Kotlin↔Swift interop calling convention (`try await`, completion-handler wrapping, etc.) to match whatever pattern `AuthenticationCoordinator` already uses for calling into `AuthRepository` — this sketch assumes suspend-to-async bridging is already set up project-wide; verify in Step 1 and correct if it uses a different bridging library/pattern.

- [ ] **Step 3: Build `OnboardingView` with 4 steps**

```swift
// kmp-mobile/ios/PazChurch/Features/Onboarding/OnboardingView.swift
import SwiftUI
import AVKit

struct OnboardingView: View {
    @State private var coordinator: OnboardingCoordinator
    let onFinished: () -> Void

    init(repository: OnboardingRepository, onFinished: @escaping () -> Void) {
        _coordinator = State(initialValue: OnboardingCoordinator(repository: repository))
        self.onFinished = onFinished
    }

    var body: some View {
        Group {
            switch coordinator.currentStep {
            case .video:
                WelcomeVideoStep(onFinished: coordinator.onVideoFinished)
            case .birthday:
                BirthdayStepView(
                    isSubmitting: coordinator.isSubmitting,
                    onSubmit: { date in Task { await coordinator.onBirthdaySubmitted(date) } },
                    onSkip: coordinator.onSkipCurrentStep
                )
            case .whatsapp:
                WhatsappStepView(
                    isSubmitting: coordinator.isSubmitting,
                    onSubmit: { phone in Task { await coordinator.onWhatsappSubmitted(phone) } },
                    onSkip: coordinator.onSkipCurrentStep
                )
            case .address:
                AddressStepView(
                    isSubmitting: coordinator.isSubmitting,
                    cepResult: coordinator.cepResult,
                    onLookupCep: { cep in Task { await coordinator.onLookupCep(cep) } },
                    onSubmit: { street, number, complement, neighborhood, city, state, zip in
                        Task {
                            await coordinator.onAddressSubmitted(
                                street: street, number: number, complement: complement,
                                neighborhood: neighborhood, city: city, state: state, zipCode: zip
                            )
                        }
                    },
                    onSkip: coordinator.onSkipCurrentStep
                )
            case .finished:
                Color.clear.onAppear(perform: onFinished)
            }
        }
        .task { await coordinator.start() }
    }
}

private struct WelcomeVideoStep: View {
    let onFinished: () -> Void
    // Video URL: read from a shared config constant (see Task 7). Use AVPlayer +
    // VideoPlayer, observing AVPlayerItem.didPlayToEndTimeNotification to call onFinished().
    var body: some View {
        Color.black.ignoresSafeArea()
    }
}

private struct BirthdayStepView: View {
    let isSubmitting: Bool
    let onSubmit: (String) -> Void
    let onSkip: () -> Void
    @State private var birthDate = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Qual sua data de nascimento?").font(.title2.bold())
            Text("Usamos isso para conectar você a grupos e ministérios da sua faixa etária, e para confirmar seu cadastro caso já exista um registro seu na igreja.")
                .foregroundStyle(PazColors.textSecondary)
            TextField("DD/MM/AAAA", text: $birthDate)
                .textFieldStyle(.roundedBorder)
            Button("Continuar") { onSubmit(birthDate) }
                .disabled(isSubmitting)
            Button("Pular por agora", action: onSkip)
                .foregroundStyle(PazColors.textSecondary)
        }
        .padding()
    }
}

private struct WhatsappStepView: View {
    let isSubmitting: Bool
    let onSubmit: (String) -> Void
    let onSkip: () -> Void
    @State private var phone = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Qual seu WhatsApp?").font(.title2.bold())
            Text("É por ele que a equipe da igreja vai entrar em contato com você sobre grupos, eventos e novidades.")
                .foregroundStyle(PazColors.textSecondary)
            TextField("(11) 91234-5678", text: $phone)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.phonePad)
            Button("Continuar") { onSubmit(phone) }
                .disabled(isSubmitting)
            Button("Pular por agora", action: onSkip)
                .foregroundStyle(PazColors.textSecondary)
        }
        .padding()
    }
}

private struct AddressStepView: View {
    let isSubmitting: Bool
    let cepResult: CepLookupOutcome?
    let onLookupCep: (String) -> Void
    let onSubmit: (String, String, String?, String, String, String, String) -> Void
    let onSkip: () -> Void

    @State private var cep = ""
    @State private var number = ""
    @State private var complement = ""
    @State private var manualStreet = ""
    @State private var manualNeighborhood = ""
    @State private var manualCity = ""
    @State private var manualState = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Qual seu endereço?").font(.title2.bold())
            Text("Usamos para visitas pastorais e para conectar você com o que acontece perto de você.")
                .foregroundStyle(PazColors.textSecondary)
            HStack {
                TextField("CEP", text: $cep).textFieldStyle(.roundedBorder)
                Button("Buscar") { onLookupCep(cep) }
            }

            switch cepResult {
            case .found(let result):
                Text("\(result.street), \(result.neighborhood)")
                Text("\(result.city) - \(result.state)")
                TextField("Número", text: $number).textFieldStyle(.roundedBorder)
                TextField("Complemento (opcional)", text: $complement).textFieldStyle(.roundedBorder)
                Button("Continuar") {
                    onSubmit(result.street, number, complement.isEmpty ? nil : complement, result.neighborhood, result.city, result.state, cep)
                }.disabled(isSubmitting)
            case .notFound, .error, .none:
                if cepResult != nil {
                    Text("Não encontramos esse CEP. Preencha seu endereço manualmente:")
                    TextField("Rua", text: $manualStreet).textFieldStyle(.roundedBorder)
                    TextField("Número", text: $number).textFieldStyle(.roundedBorder)
                    TextField("Complemento (opcional)", text: $complement).textFieldStyle(.roundedBorder)
                    TextField("Bairro", text: $manualNeighborhood).textFieldStyle(.roundedBorder)
                    TextField("Cidade", text: $manualCity).textFieldStyle(.roundedBorder)
                    TextField("Estado", text: $manualState).textFieldStyle(.roundedBorder)
                    Button("Continuar") {
                        onSubmit(manualStreet, number, complement.isEmpty ? nil : complement, manualNeighborhood, manualCity, manualState, cep)
                    }.disabled(isSubmitting)
                }
            }

            Button("Pular por agora", action: onSkip)
                .foregroundStyle(PazColors.textSecondary)
        }
        .padding()
    }
}
```

`CepLookupOutcome`'s Swift-bridged case names (`.found`/`.notFound`/`.error`) depend on the Kotlin sealed interface's generated Swift interop naming — verify exact case names by building once and checking Xcode's generated `Shared` module interface (Product → Generate Interface, or Quick Help on the type) before finalizing this switch.

- [ ] **Step 4: Wire into `LoginView.swift`**

Present `OnboardingView` (as a full-screen cover or via `NavigationStack` push, matching the project's "no custom hero headers, native nav" convention) after successful sign-in, before navigating to the main app content — replacing any existing inline birthdate-only prompt if `LoginView`/`AuthenticationCoordinator` had one (confirm in Step 1).

- [ ] **Step 5: Manual QA**

Build and run on a simulator, sign in with a test account missing all 4 fields, and verify the same behaviors as Task 4 Step 8 (video not skippable, other steps skippable, CEP lookup + manual fallback).

- [ ] **Step 6: Run SwiftFormat**

Run: `cd kmp-mobile/ios && swiftformat PazChurch/Features/Onboarding PazChurch/Features/Auth/LoginView.swift`

- [ ] **Step 7: Commit**

```bash
cd kmp-mobile
git add ios/PazChurch/Features/Onboarding/ ios/PazChurch/Features/Auth/LoginView.swift
git commit -m "feat(ios): add onboarding flow after sign-in"
```

---

## Task 6: Welcome video source configuration

**Files:**
- Modify: `kmp-mobile/android/build.gradle.kts` (add `buildConfigField` for `ONBOARDING_VIDEO_URL`)
- Modify: `kmp-mobile/ios/PazChurch/Configuration/` (locate existing app config constants file via `grep -rl "API_BASE_URL\|baseUrl" kmp-mobile/ios/PazChurch/Configuration/` and add `onboardingVideoURL` alongside it)

**Interfaces:**
- Produces: a single source-of-truth URL string consumed by `WelcomeVideoStep` on both platforms (Task 4 Step 6, Task 5 Step 3).

- [ ] **Step 1: Locate existing per-environment config pattern**

Run: `grep -rn "buildConfigField" kmp-mobile/android/build.gradle.kts` and find the iOS equivalent config file — match exactly how an existing URL constant (e.g. API base URL) is defined per build variant/scheme.

- [ ] **Step 2: Add the video URL constant on Android**

Add a `buildConfigField("String", "ONBOARDING_VIDEO_URL", "\"<placeholder-cdn-url>\"")` entry next to the existing fields, for each variant that has one. Use a real hosted placeholder value (ask the team for the actual asset URL before shipping — flag this in the PR description).

- [ ] **Step 3: Add the equivalent constant on iOS**

Add `static let onboardingVideoURL = URL(string: "<placeholder-cdn-url>")!` next to the existing config constants, matching that file's exact style.

- [ ] **Step 4: Wire both `WelcomeVideoStep` implementations (Task 4/5) to read from these constants**

Replace the placeholder comments in `WelcomeVideoStep` (Android) and `WelcomeVideoStep` (iOS) with actual `Media3`/`AVPlayer` playback of `BuildConfig.ONBOARDING_VIDEO_URL` / `AppConfig.onboardingVideoURL`.

- [ ] **Step 5: Manual QA**

Confirm the video plays on both platforms from the configured URL.

- [ ] **Step 6: Commit**

```bash
cd kmp-mobile
git add android/build.gradle.kts ios/PazChurch/Configuration/
git commit -m "feat: configure onboarding welcome video URL"
```

---

## Task 7: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Run full backend test suite**

Run: `cd backend && npm test`
Expected: all pass, including new tests from Tasks 1–2.

- [ ] **Step 2: Run full kmp-mobile shared + Android test suites**

Run: `cd kmp-mobile && ./gradlew :shared:allTests :android:testDebugUnitTest`
Expected: all pass.

- [ ] **Step 3: Manual end-to-end pass on both platforms**

Using a fresh test account (or an account manually reset to have null `birthDate`/`phoneNumber`/`address` via admin-ui or DB), sign in on Android and iOS separately and confirm: onboarding launches, video is not skippable, each subsequent step is skippable, CEP lookup auto-fills correctly for a valid CEP and falls back to manual entry for an invalid one, and re-launching the app after skipping steps re-prompts only for the still-missing fields.

- [ ] **Step 4: Confirm admin-ui reflects submitted data**

In admin-ui's Users page, open the test user and confirm birthDate/phone/address now show the onboarding-submitted values.
