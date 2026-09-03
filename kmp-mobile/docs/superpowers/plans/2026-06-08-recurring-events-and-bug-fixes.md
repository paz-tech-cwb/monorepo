# Recurring Events Expansion + Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four known bugs (HTTP method, wrong endpoint, model mismatch, iOS nav glitch) and expand recurring events so each future occurrence appears as its own row in the paginated Agenda list.

**Architecture:** The backend `findPaginated` will load all events, expand recurring ones into individual occurrences up to a 2-year lookahead, sort, then paginate — keeping the API contract identical. The KMP shared layer adds a DTO→domain mapping for `MemberJourney` to bridge the `stages` field the backend actually returns. Mobile UI changes are minimal: remove the iOS recurrence badge and add an error state to the iOS MemberJourney screen.

**Tech Stack:** NestJS 11 / TypeORM (backend), Kotlin Multiplatform / Ktor / kotlinx.serialization (shared), SwiftUI (iOS), Jetpack Compose (Android)

---

## File Map

| File | Change |
|------|--------|
| `backend/src/events/events.service.ts` | Rewrite `findPaginated` to expand recurring events |
| `backend/src/events/events.service.spec.ts` | Add tests for recurring expansion + future-only filter |
| `shared/src/commonMain/.../data/repository/UserRepositoryImpl.kt` | `patch` → `put` for `api/users/me` |
| `shared/src/commonMain/.../data/repository/ChurchRepositoryImpl.kt` | `api/life-groups/my-groups` → `api/life-groups` |
| `shared/src/commonMain/.../domain/model/MemberJourney.kt` | Remove `@Serializable`, fix `JourneyStep` fields to domain model |
| `shared/src/commonMain/.../data/repository/MemberJourneyRepositoryImpl.kt` | Add private DTOs + mapping from `stages` response |
| `ios/PazChurch/Features/MemberJourney/MemberJourneyView.swift` | Add error state + empty state to VM and View |
| `ios/PazChurch/Features/Agenda/AgendaDetailView.swift` | `.navigationBarHidden(true)` → `.toolbar(.hidden, for: .navigationBar)` |
| `ios/PazChurch/Features/Agenda/AgendaListView.swift` | Remove recurrence label badge from `AgendaEventRow` |

---

## Task 1: Bug 1 — Edit Profile HTTP method

**Files:**
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/UserRepositoryImpl.kt:26`

- [ ] **Step 1: Change `patch` to `put`**

Open `UserRepositoryImpl.kt`. At line 26, `updateProfile` currently calls `client.patch`. Change to `client.put`:

```kotlin
override suspend fun updateProfile(request: UpdateProfileRequest): User =
    client.put("api/users/me") {
        contentType(ContentType.Application.Json)
        setBody(request)
    }.body()
```

Also update the import at the top of the file — add `put` (remove `patch` if no longer used):

```kotlin
import io.ktor.client.request.put
```

Remove `import io.ktor.client.request.patch` if `patch` is not used elsewhere in the file. Check: `getNotificationPreferences` uses `patch` on line 39 for notification prefs — so keep the `patch` import.

- [ ] **Step 2: Commit**

```bash
cd kmp-mobile
git add shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/UserRepositoryImpl.kt
git commit -m "fix: use PUT for edit profile — backend endpoint is @Put('me')"
```

---

## Task 2: Bug 2 — Life Groups wrong endpoint

**Files:**
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/ChurchRepositoryImpl.kt:29`

- [ ] **Step 1: Fix endpoint path**

Open `ChurchRepositoryImpl.kt`. Change `getAllLifeGroups` from `"api/life-groups/my-groups"` to `"api/life-groups"`:

```kotlin
override suspend fun getAllLifeGroups(): List<LifeGroup> =
    client.get("api/life-groups").body()
```

- [ ] **Step 2: Commit**

```bash
git add shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/ChurchRepositoryImpl.kt
git commit -m "fix: getAllLifeGroups calls api/life-groups not my-groups (404)"
```

---

## Task 3: Bug 3 — MemberJourney model mismatch

The backend returns:
```json
{
  "member_id": 1,
  "member_name": "João",
  "stages": [
    { "stage_id": 1, "stage_key": "salvation", "completed": false, "completed_at": null, "note": null }
  ]
}
```
But the current `MemberJourney` model has `steps: List<JourneyStep>` expecting different fields, so deserialization silently produces an empty list → blank screen.

**Files:**
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/MemberJourney.kt`
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/MemberJourneyRepositoryImpl.kt`
- Modify: `ios/PazChurch/Features/MemberJourney/MemberJourneyView.swift`

### Step group A: Fix the shared model

- [ ] **Step 1: Rewrite `MemberJourney.kt`**

Replace the entire contents of `shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/MemberJourney.kt`:

```kotlin
package br.church.paz.shared.domain.model

data class MemberJourney(
    val steps: List<JourneyStep> = emptyList(),
)

data class JourneyStep(
    val id: String,
    val title: String,
    val description: String? = null,
    val order: Int,
    val status: JourneyStepStatus,
    val completedAt: String? = null,
)

enum class JourneyStepStatus { completed, in_progress, pending }
```

Note: `@Serializable` annotations are removed — this is now a pure domain model. Deserialization happens in the repository via private DTOs. `in_progress` is kept so Android/iOS UI code compiles unchanged; the mapping never sets it.

- [ ] **Step 2: Rewrite `MemberJourneyRepositoryImpl.kt`**

Replace the entire contents of `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/MemberJourneyRepositoryImpl.kt`:

```kotlin
package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.JourneyStep
import br.church.paz.shared.domain.model.JourneyStepStatus
import br.church.paz.shared.domain.model.MemberJourney
import br.church.paz.shared.domain.repository.MemberJourneyRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class MemberJourneyRepositoryImpl(private val client: HttpClient) : MemberJourneyRepository {

    @Throws(Exception::class)
    override suspend fun getMemberJourney(): MemberJourney {
        val dto: MemberJourneyResponseDto = client.get("api/member-journey/me").body()
        return MemberJourney(
            steps = dto.stages.mapIndexed { index, stage ->
                JourneyStep(
                    id = stage.stageKey,
                    title = stageKeyTitle(stage.stageKey),
                    description = stage.note,
                    order = index,
                    status = if (stage.completed) JourneyStepStatus.completed else JourneyStepStatus.pending,
                    completedAt = stage.completedAt,
                )
            },
        )
    }

    private fun stageKeyTitle(key: String): String = when (key) {
        "salvation" -> "Salvação"
        "registration" -> "Cadastro"
        "first_courses" -> "Primeiros Cursos"
        "discovery" -> "Evento de Descoberta"
        "life_group" -> "Life Group"
        "discipleship" -> "Discipulado"
        "water_baptism" -> "Batismo nas Águas"
        "disciple_maker" -> "Fazedor de Discípulos"
        else -> key
    }
}

@Serializable
private data class MemberJourneyResponseDto(
    @SerialName("member_id") val memberId: Int,
    @SerialName("member_name") val memberName: String,
    val stages: List<JourneyStageDto>,
)

@Serializable
private data class JourneyStageDto(
    @SerialName("stage_id") val stageId: Int,
    @SerialName("stage_key") val stageKey: String,
    val completed: Boolean,
    @SerialName("completed_at") val completedAt: String? = null,
    val note: String? = null,
)
```

- [ ] **Step 3: Build shared module to verify no compile errors**

```bash
cd kmp-mobile
./gradlew :shared:compileKotlinMetadata 2>&1 | tail -20
```

Expected: `BUILD SUCCESSFUL`

### Step group B: Fix iOS error state

The iOS `MemberJourneyViewModel` currently has no `error` property — on failure it silently sets `isLoading = false` and shows a blank screen. The iOS journey steps cast `journey.steps as? [JourneyStep]` which can also return nil and silently show empty.

- [ ] **Step 4: Update `MemberJourneyView.swift` — ViewModel**

In `MemberJourneyView.swift`, replace the `MemberJourneyViewModel` class:

```swift
@MainActor
@Observable
class MemberJourneyViewModel {
    var steps: [JourneyStep] = []
    var isLoading = true
    var error: String? = nil

    private let repository: MemberJourneyRepository

    init(repository: MemberJourneyRepository) {
        self.repository = repository
        loadJourney()
    }

    private func loadJourney() {
        Task {
            do {
                let journey = try await repository.getMemberJourney()
                self.steps = journey.steps.compactMap { $0 as? JourneyStep }
                    .sorted { $0.order < $1.order }
                self.isLoading = false
            } catch {
                self.error = "Erro ao carregar jornada"
                self.isLoading = false
            }
        }
    }

    func retry() {
        isLoading = true
        error = nil
        loadJourney()
    }
}
```

- [ ] **Step 5: Update `MemberJourneyView.swift` — View body**

Replace the `body` computed property and add `errorState`/`emptyState` private views:

```swift
var body: some View {
    Group {
        if viewModel.isLoading {
            loadingState
        } else if let errorMessage = viewModel.error {
            errorState(message: errorMessage)
        } else if viewModel.steps.isEmpty {
            emptyState
        } else {
            contentState
        }
    }
    .background(PazColors.background.ignoresSafeArea())
    .navigationTitle("Minha Jornada")
    .navigationBarTitleDisplayMode(.large)
}

private func errorState(message: String) -> some View {
    VStack(spacing: PazSpacing.lg) {
        Spacer()
        Text(message)
            .font(PazTypography.bodyMedium)
            .foregroundStyle(PazColors.slate)
            .multilineTextAlignment(.center)
        Button("Tentar Novamente") { viewModel.retry() }
            .font(PazTypography.titleSmall)
            .foregroundStyle(PazColors.pazPrimary)
        Spacer()
    }
    .padding(.horizontal, PazSpacing.lg)
}

private var emptyState: some View {
    VStack {
        Spacer()
        Text("Nenhuma etapa encontrada")
            .font(PazTypography.bodyMedium)
            .foregroundStyle(PazColors.slate)
        Spacer()
    }
}
```

- [ ] **Step 6: Commit**

```bash
cd kmp-mobile
git add shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/MemberJourney.kt
git add shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/MemberJourneyRepositoryImpl.kt
git add ios/PazChurch/Features/MemberJourney/MemberJourneyView.swift
git commit -m "fix: MemberJourney model mismatch — map stages response + iOS error state"
```

---

## Task 4: Bug 4 — iOS Agenda nav bar title glitch

The `.navigationBarHidden(true)` in `AgendaDetailView` causes the large title in `AgendaListView` to re-animate on pop. Replace with the iOS 16+ API.

**Files:**
- Modify: `ios/PazChurch/Features/Agenda/AgendaDetailView.swift:38`

- [ ] **Step 1: Fix nav bar modifier**

In `AgendaDetailView.swift`, inside the `body` computed property, replace:

```swift
.navigationBarHidden(true)
```

with:

```swift
.toolbar(.hidden, for: .navigationBar)
```

- [ ] **Step 2: Commit**

```bash
git add ios/PazChurch/Features/Agenda/AgendaDetailView.swift
git commit -m "fix: use .toolbar(.hidden) instead of .navigationBarHidden — stops title jump on pop"
```

---

## Task 5: Backend — Recurring event expansion

**Files:**
- Modify: `backend/src/events/events.service.ts`
- Modify: `backend/src/events/events.service.spec.ts`

### Step group A: Tests first

- [ ] **Step 1: Write failing tests in `events.service.spec.ts`**

Replace the full contents of `backend/src/events/events.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';

function makeEvent(overrides: Partial<Event> = {}): Event {
  const e = new Event();
  e.id = 1;
  e.title = 'Test Event';
  e.initialDate = new Date('2026-01-10T10:00:00Z');
  e.finalDate = null;
  e.description = null;
  e.recurrenceType = null;
  e.imageUrl = null;
  e.createdAt = new Date();
  e.updatedAt = new Date();
  return Object.assign(e, overrides);
}

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(Event), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<EventsService>(EventsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('remove() deletes event by id', async () => {
    mockRepo.delete.mockResolvedValue({ affected: 1 });
    await expect(service.remove(12)).resolves.toBeUndefined();
    expect(mockRepo.delete).toHaveBeenCalledWith(12);
  });

  it('remove() throws NotFoundException for missing event', async () => {
    mockRepo.delete.mockResolvedValue({ affected: 0 });
    await expect(service.remove(99)).rejects.toThrow(NotFoundException);
  });

  describe('findPaginated', () => {
    it('excludes one-time past events', async () => {
      const past = makeEvent({ initialDate: new Date('2020-01-01T00:00:00Z') });
      mockRepo.find.mockResolvedValue([past]);
      const result = await service.findPaginated(1, 10);
      expect(result).toHaveLength(0);
    });

    it('includes one-time future events', async () => {
      const future = makeEvent({ initialDate: new Date('2099-12-31T10:00:00Z') });
      mockRepo.find.mockResolvedValue([future]);
      const result = await service.findPaginated(1, 10);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Event');
    });

    it('expands a WEEKLY event starting in the past into future occurrences', async () => {
      // Event started 3 weeks ago, recurs weekly
      const base = new Date();
      base.setDate(base.getDate() - 21);
      const weekly = makeEvent({ initialDate: base, recurrenceType: 'WEEKLY' });
      mockRepo.find.mockResolvedValue([weekly]);
      const result = await service.findPaginated(1, 5);
      // Should have future occurrences (not the past ones)
      expect(result.length).toBeGreaterThan(0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      result.forEach((r) => {
        expect(new Date(r.initial_date).getTime()).toBeGreaterThanOrEqual(today.getTime());
      });
    });

    it('expands a MONTHLY event and returns sorted occurrences', async () => {
      const base = new Date();
      base.setMonth(base.getMonth() - 1); // started last month
      const monthly = makeEvent({ id: 1, initialDate: base, recurrenceType: 'MONTHLY' });
      mockRepo.find.mockResolvedValue([monthly]);
      const result = await service.findPaginated(1, 5);
      expect(result.length).toBeGreaterThan(0);
      // Verify sorted ASC
      for (let i = 1; i < result.length; i++) {
        expect(new Date(result[i].initial_date).getTime()).toBeGreaterThanOrEqual(
          new Date(result[i - 1].initial_date).getTime(),
        );
      }
    });

    it('applies pagination correctly', async () => {
      const base = new Date();
      const weekly = makeEvent({ initialDate: base, recurrenceType: 'WEEKLY' });
      mockRepo.find.mockResolvedValue([weekly]);
      const page1 = await service.findPaginated(1, 3);
      const page2 = await service.findPaginated(2, 3);
      expect(page1).toHaveLength(3);
      expect(page2.length).toBeGreaterThan(0);
      // Pages should not overlap
      const page1Dates = page1.map((e) => String(e.initial_date));
      const page2Dates = page2.map((e) => String(e.initial_date));
      page2Dates.forEach((d) => expect(page1Dates).not.toContain(d));
    });

    it('stops generating occurrences beyond 2-year lookahead', async () => {
      const base = new Date();
      const daily = makeEvent({ initialDate: base, recurrenceType: 'DAILY' });
      mockRepo.find.mockResolvedValue([daily]);
      // Fetch a large page - should not exceed ~730 items (2 years of daily)
      const result = await service.findPaginated(1, 10000);
      expect(result.length).toBeLessThanOrEqual(731);
    });
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd backend
npx jest src/events/events.service.spec.ts --no-coverage 2>&1 | tail -30
```

Expected: multiple FAIL lines for `findPaginated` tests (the new ones). The existing `remove()` tests should still pass.

### Step group B: Implement

- [ ] **Step 3: Rewrite `findPaginated` in `events.service.ts`**

Replace the full contents of `backend/src/events/events.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';

function toResponse(event: Event, overrideDate?: Date) {
  return {
    id: event.id,
    title: event.title,
    initial_date: overrideDate ?? event.initialDate,
    final_date: event.finalDate ?? null,
    description: event.description ?? null,
    recurrence_type: event.recurrenceType ?? null,
    image_url: event.imageUrl ?? null,
    created_at: event.createdAt,
    updated_at: event.updatedAt,
  };
}

function addByRecurrence(date: Date, recurrenceType: string): Date {
  const next = new Date(date);
  switch (recurrenceType.toUpperCase()) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto) {
    const event = this.eventsRepository.create({
      title: createEventDto.title,
      initialDate: new Date(createEventDto.initial_date),
      finalDate: createEventDto.final_date
        ? new Date(createEventDto.final_date)
        : null,
      description: createEventDto.description ?? null,
      recurrenceType: createEventDto.recurrence_type ?? null,
      imageUrl: createEventDto.image ?? null,
    });
    const saved = await this.eventsRepository.save(event);
    return toResponse(saved);
  }

  async findAll() {
    const events = await this.eventsRepository.find({
      order: { initialDate: 'ASC' },
    });
    return events.map((e) => toResponse(e));
  }

  async findPaginated(page: number, limit: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lookahead = new Date(today);
    lookahead.setFullYear(lookahead.getFullYear() + 2);

    const events = await this.eventsRepository.find({
      where: [
        { recurrenceType: Not(IsNull()) },
        { initialDate: MoreThanOrEqual(today) },
      ],
    });

    const occurrences: ReturnType<typeof toResponse>[] = [];

    for (const event of events) {
      if (!event.recurrenceType) {
        occurrences.push(toResponse(event));
      } else {
        let current = new Date(event.initialDate);
        // Advance to first occurrence on or after today
        while (current < today) {
          current = addByRecurrence(current, event.recurrenceType);
        }
        while (current <= lookahead) {
          occurrences.push(toResponse(event, new Date(current)));
          current = addByRecurrence(current, event.recurrenceType);
        }
      }
    }

    occurrences.sort(
      (a, b) =>
        new Date(a.initial_date).getTime() - new Date(b.initial_date).getTime(),
    );

    const skip = (page - 1) * limit;
    return occurrences.slice(skip, skip + limit);
  }

  async findOne(id: number) {
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException(`Event with ID ${id} not found`);
    return toResponse(event);
  }

  async update(id: number, updateEventDto: UpdateEventDto) {
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException(`Event with ID ${id} not found`);

    if (updateEventDto.title !== undefined) event.title = updateEventDto.title;
    if (updateEventDto.initial_date !== undefined)
      event.initialDate = new Date(updateEventDto.initial_date);
    if (updateEventDto.final_date !== undefined)
      event.finalDate = updateEventDto.final_date
        ? new Date(updateEventDto.final_date)
        : null;
    if (updateEventDto.description !== undefined)
      event.description = updateEventDto.description ?? null;
    if (updateEventDto.recurrence_type !== undefined)
      event.recurrenceType = updateEventDto.recurrence_type ?? null;
    if (updateEventDto.image !== undefined)
      event.imageUrl = updateEventDto.image ?? null;

    const saved = await this.eventsRepository.save(event);
    return toResponse(saved);
  }

  async remove(id: number): Promise<void> {
    const result = await this.eventsRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
  }
}
```

- [ ] **Step 4: Run tests — all should pass**

```bash
npx jest src/events/events.service.spec.ts --no-coverage 2>&1 | tail -20
```

Expected: all tests `PASS`.

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/events/events.service.ts src/events/events.service.spec.ts
git commit -m "feat: expand recurring events in findPaginated — backend-side expansion with 2yr lookahead"
```

---

## Task 6: iOS — Remove recurrence badge from AgendaEventRow

With recurring events now expanded server-side, each row already represents one occurrence. The recurrence label badge ("Semanal", "Mensal", etc.) is misleading and must be removed.

**Files:**
- Modify: `ios/PazChurch/Features/Agenda/AgendaListView.swift`

- [ ] **Step 1: Remove badge block from `AgendaEventRow`**

In `AgendaListView.swift`, find the `AgendaEventRow` body. Remove these lines (approximately lines 151–155):

```swift
if let recurrence = event.recurrenceType, !recurrence.isEmpty {
    Text(recurrenceLabel(recurrence))
        .font(PazTypography.labelSmall)
        .foregroundStyle(PazColors.pazPrimary)
}
```

Also remove the `recurrenceLabel(_:)` helper function below the body:

```swift
private func recurrenceLabel(_ type: String) -> String {
    switch type.uppercased() {
    case "WEEKLY": "Semanal"
    case "MONTHLY": "Mensal"
    case "YEARLY": "Anual"
    case "DAILY": "Diário"
    default: type
    }
}
```

- [ ] **Step 2: Commit**

```bash
cd kmp-mobile
git add ios/PazChurch/Features/Agenda/AgendaListView.swift
git commit -m "feat: remove recurrence badge — occurrences now show individual dates from backend"
```

---

## Task 7: Verify and format

- [ ] **Step 1: Run all backend tests**

```bash
cd backend
npm run test 2>&1 | tail -20
```

Expected: all tests pass, no regressions.

- [ ] **Step 2: Run shared KMP tests**

```bash
cd kmp-mobile
./gradlew :shared:allTests 2>&1 | tail -20
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 3: Run ktlintFormat on Android**

```bash
./gradlew ktlintFormat 2>&1 | tail -10
```

- [ ] **Step 4: Run SwiftFormat + SwiftLint on iOS**

```bash
cd ios
swiftformat PazChurch/ --swiftversion 6.0
swiftlint --fix PazChurch/
```

- [ ] **Step 5: Commit formatted files if any changed**

```bash
cd ..
git diff --name-only
# If any files changed:
git add -A
git commit -m "chore: apply ktlint + swiftformat after bug fixes"
```

- [ ] **Step 6: Update root monorepo submodule pointers**

```bash
cd /path/to/church   # root monorepo
git add kmp-mobile backend
git commit -m "chore: update submodule pointers — recurring events expansion + 4 bug fixes"
```
