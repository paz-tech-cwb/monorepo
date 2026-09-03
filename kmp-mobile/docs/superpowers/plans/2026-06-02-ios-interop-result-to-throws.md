# iOS Interop: Result<T> → @Throws + T Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix iOS interop by replacing `Result<T>` return types in all repository interfaces/implementations with `@Throws(Exception::class)` + `T` directly, and wrapping Android ViewModel calls with `runCatching { }`.

**Architecture:** Kotlin/Native does not bridge `Result<T>` as a typed value to Swift — it arrives as `Any?`, making `as? SomeType` always return nil. The fix is to let exceptions propagate (bridged by Kotlin/Native as NSError via `@Throws`) and return `T` directly. Android callers get the same safety by wrapping in `runCatching { }`.

**Tech Stack:** Kotlin Multiplatform, Ktor, Koin, Jetpack Compose, Kotlin/Native → Swift interop.

---

## File Map

| File | Change |
|------|--------|
| `shared/.../domain/repository/HomeRepository.kt` | `Result<HomeContent>` → `HomeContent`, add `@Throws` |
| `shared/.../domain/repository/AcademyRepository.kt` | `Result<AcademyContent>` → `AcademyContent`, add `@Throws` |
| `shared/.../domain/repository/ChurchRepository.kt` | 6 functions, `Result<T>` → `T`, add `@Throws` |
| `shared/.../domain/repository/FormsRepository.kt` | 11 functions, `Result<T>` → `T`, add `@Throws` |
| `shared/.../domain/repository/MemberJourneyRepository.kt` | `Result<MemberJourney>` → `MemberJourney`, add `@Throws` |
| `shared/.../domain/repository/UserRepository.kt` | 6 functions, `Result<T>` → `T`, add `@Throws` |
| `shared/.../data/repository/HomeRepositoryImpl.kt` | Remove `safeRunCatching`, add `@Throws`, preserve DTO parse logic |
| `shared/.../data/repository/AcademyRepositoryImpl.kt` | Remove `safeRunCatching`, add `@Throws`, preserve DTO parse logic |
| `shared/.../data/repository/ChurchRepositoryImpl.kt` | Remove `safeRunCatching`, add `@Throws` on each override |
| `shared/.../data/repository/FormsRepositoryImpl.kt` | Remove `safeRunCatching`, refactor private `post` helper, add `@Throws` |
| `shared/.../data/repository/MemberJourneyRepositoryImpl.kt` | Remove `safeRunCatching`, add `@Throws` |
| `shared/.../data/repository/UserRepositoryImpl.kt` | Remove `safeRunCatching`, add `@Throws` on each override |
| `android/.../home/HomeViewModel.kt` | `repo.getHomeContent().onSuccess` → `runCatching { repo.getHomeContent() }.onSuccess` |
| `android/.../academy/AcademyViewModel.kt` | Same pattern |
| `android/.../profile/EditProfileViewModel.kt` | `userRepository.updateProfile(...)` → `runCatching { ... }` |
| `android/.../ministries/MinistriesViewModel.kt` | `async { repo.getChurch() }` → `async { runCatching { repo.getChurch() } }` |
| `android/.../ministries/MinistryDetailViewModel.kt` | `repo.getChurch().onSuccess` → `runCatching { repo.getChurch() }.onSuccess` (also LifeGroupDetailViewModel in same file) |
| `android/.../memberjourney/MemberJourneyViewModel.kt` | `repo.getMemberJourney().onSuccess` → `runCatching { ... }.onSuccess` |
| `android/.../notifications/NotificationPrefsViewModel.kt` | `repo.getNotificationPreferences().onSuccess` → `runCatching { ... }.onSuccess`; `repo.updateNotificationPreferences(...).onSuccess` → `runCatching { ... }.onSuccess` |
| `android/.../formularios/FormulariosViewModel.kt` | `repo.getCatalog().onSuccess` → `runCatching { ... }.onSuccess` |
| `android/.../formularios/FormDetailViewModel.kt` | `formsRepository.getCatalog().onSuccess` → `runCatching { ... }.onSuccess`; `submitForm` private fun → return `runCatching` |
| `android/.../search/SearchViewModel.kt` | 5 direct calls → wrap each in `runCatching { }`, use `.getOrNull()` on each |
| `android/.../meetingreport/MeetingReportViewModel.kt` | `formsRepository.submitLifeGroupReport(report).onSuccess` → `runCatching { ... }.onSuccess` |

---

### Task 1: Update Repository Interfaces

**Files:**
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/domain/repository/HomeRepository.kt`
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/domain/repository/AcademyRepository.kt`
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/domain/repository/ChurchRepository.kt`
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/domain/repository/FormsRepository.kt`
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/domain/repository/MemberJourneyRepository.kt`
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/domain/repository/UserRepository.kt`

- [ ] **Step 1: Update HomeRepository.kt**

```kotlin
package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.HomeContent

interface HomeRepository {
    @Throws(Exception::class)
    suspend fun getHomeContent(): HomeContent
}
```

- [ ] **Step 2: Update AcademyRepository.kt**

```kotlin
package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.AcademyContent

interface AcademyRepository {
    @Throws(Exception::class)
    suspend fun getAcademyContent(): AcademyContent
}
```

- [ ] **Step 3: Update ChurchRepository.kt**

```kotlin
package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.Area
import br.church.paz.shared.domain.model.Church
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.MeetingReportRequest
import br.church.paz.shared.domain.model.Sector

interface ChurchRepository {
    @Throws(Exception::class)
    suspend fun getChurch(): Church
    @Throws(Exception::class)
    suspend fun getMyLifeGroups(): List<LifeGroup>
    @Throws(Exception::class)
    suspend fun getAllLifeGroups(): List<LifeGroup>
    @Throws(Exception::class)
    suspend fun getAreas(): List<Area>
    @Throws(Exception::class)
    suspend fun getSectors(): List<Sector>
    @Throws(Exception::class)
    suspend fun submitMeetingReport(report: MeetingReportRequest)
}
```

- [ ] **Step 4: Update FormsRepository.kt**

```kotlin
package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.ConversionForm
import br.church.paz.shared.domain.model.CourseForm
import br.church.paz.shared.domain.model.FormCatalogItem
import br.church.paz.shared.domain.model.GuestForm
import br.church.paz.shared.domain.model.MemberRegistrationForm
import br.church.paz.shared.domain.model.MultiplicationForm
import br.church.paz.shared.domain.model.ServiceReportForm
import br.church.paz.shared.domain.model.User

interface FormsRepository {
    @Throws(Exception::class)
    suspend fun getCatalog(): List<FormCatalogItem>
    @Throws(Exception::class)
    suspend fun lookupUsers(query: String): List<User>
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
    suspend fun submitLifeGroupReport(report: br.church.paz.shared.domain.model.MeetingReportRequest)
    @Throws(Exception::class)
    suspend fun submitSectorReport(report: br.church.paz.shared.domain.model.MeetingReportRequest)
    @Throws(Exception::class)
    suspend fun submitAreaReport(report: br.church.paz.shared.domain.model.MeetingReportRequest)
}
```

- [ ] **Step 5: Update MemberJourneyRepository.kt**

```kotlin
package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.MemberJourney

interface MemberJourneyRepository {
    @Throws(Exception::class)
    suspend fun getMemberJourney(): MemberJourney
}
```

- [ ] **Step 6: Update UserRepository.kt**

```kotlin
package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.DeviceToken
import br.church.paz.shared.domain.model.NotificationPreferences
import br.church.paz.shared.domain.model.UpdateProfileRequest
import br.church.paz.shared.domain.model.User

interface UserRepository {
    @Throws(Exception::class)
    suspend fun getProfile(): User
    @Throws(Exception::class)
    suspend fun updateProfile(request: UpdateProfileRequest): User
    @Throws(Exception::class)
    suspend fun getNotificationPreferences(): NotificationPreferences
    @Throws(Exception::class)
    suspend fun updateNotificationPreferences(prefs: NotificationPreferences): NotificationPreferences
    @Throws(Exception::class)
    suspend fun registerDeviceToken(token: DeviceToken)
    @Throws(Exception::class)
    suspend fun removeDeviceToken(tokenId: String)
}
```

---

### Task 2: Update Repository Implementations

**Files:**
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/HomeRepositoryImpl.kt`
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/AcademyRepositoryImpl.kt`
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/ChurchRepositoryImpl.kt`
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/FormsRepositoryImpl.kt`
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/MemberJourneyRepositoryImpl.kt`
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/UserRepositoryImpl.kt`

- [ ] **Step 1: Update HomeRepositoryImpl.kt** (preserve DTO parsing)

```kotlin
package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.AgendaEvent
import br.church.paz.shared.domain.model.BankInfo
import br.church.paz.shared.domain.model.Banner
import br.church.paz.shared.domain.model.ContributionSection
import br.church.paz.shared.domain.model.HomeContent
import br.church.paz.shared.domain.repository.HomeRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class HomeRepositoryImpl(private val client: HttpClient) : HomeRepository {
    @Throws(Exception::class)
    override suspend fun getHomeContent(): HomeContent {
        val response: HomeResponse = client.get("api/home").body()
        return response.toDomain()
    }
}

@Serializable
private data class HomeResponse(val sections: List<SectionDto> = emptyList()) {
    fun toDomain(): HomeContent {
        var banners = emptyList<Banner>()
        var agenda = emptyList<AgendaEvent>()
        var contribution: ContributionSection? = null

        for (section in sections) {
            when (section.type) {
                "announcements" -> banners = section.items.mapNotNull { it.toBanner() }
                "contribution"  -> contribution = section.items.firstOrNull()?.toContribution()
                "agenda"        -> agenda = section.items.mapNotNull { it.toEvent() }
            }
        }

        return HomeContent(banners = banners, agenda = agenda, contribution = contribution)
    }
}

@Serializable
private data class SectionDto(
    val type: String,
    val items: List<ItemDto> = emptyList(),
    val order: Int = 0,
)

@Serializable
private data class ItemDto(
    val id: Int? = null,
    val title: String? = null,
    val imageUrl: String? = null,
    val actionUrl: String? = null,
    @SerialName("bank_name") val bankName: String? = null,
    @SerialName("branch_number") val branchNumber: String? = null,
    @SerialName("account_number") val accountNumber: String? = null,
    @SerialName("pix_key") val pixKey: String? = null,
    val date: String? = null,
) {
    fun toBanner(): Banner? {
        val id = id ?: return null
        val title = title ?: return null
        val imageUrl = imageUrl ?: return null
        return Banner(id = id.toString(), title = title, imageUrl = imageUrl, actionUrl = actionUrl)
    }

    fun toContribution(): ContributionSection? {
        val name = bankName ?: return null
        return ContributionSection(
            bank = BankInfo(
                name    = name,
                pixKey  = pixKey,
                agency  = branchNumber,
                account = accountNumber,
            )
        )
    }

    fun toEvent(): AgendaEvent? {
        val id = id ?: return null
        val title = title ?: return null
        val date = date ?: return null
        return AgendaEvent(
            id        = id.toString(),
            title     = title,
            startDate = date,
            imageUrl  = imageUrl,
        )
    }
}
```

- [ ] **Step 2: Update AcademyRepositoryImpl.kt** (preserve DTO parsing)

```kotlin
package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.AcademyContent
import br.church.paz.shared.domain.model.Course
import br.church.paz.shared.domain.model.CourseTrack
import br.church.paz.shared.domain.repository.AcademyRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class AcademyRepositoryImpl(private val client: HttpClient) : AcademyRepository {
    @Throws(Exception::class)
    override suspend fun getAcademyContent(): AcademyContent {
        val response: AcademyResponse = client.get("api/academy").body()
        return AcademyContent(tracks = response.tracks.map { it.toDomain() })
    }
}

@Serializable
private data class AcademyResponse(val tracks: List<TrackDto> = emptyList())

@Serializable
private data class TrackDto(
    val id: Int,
    val title: String,
    val description: String? = null,
    @SerialName("sort_order") val sortOrder: Int = 0,
    val courses: List<CourseDto> = emptyList(),
) {
    fun toDomain() = CourseTrack(
        id          = id.toString(),
        title       = title,
        description = description,
        courses     = courses.map { it.toDomain() },
    )
}

@Serializable
private data class CourseDto(
    val id: Int,
    val title: String,
    val description: String? = null,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
) {
    fun toDomain() = Course(
        id           = id.toString(),
        title        = title,
        description  = description,
        thumbnailUrl = thumbnailUrl,
    )
}
```

- [ ] **Step 3: Update ChurchRepositoryImpl.kt**

```kotlin
package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.Area
import br.church.paz.shared.domain.model.Church
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.MeetingReportRequest
import br.church.paz.shared.domain.model.Sector
import br.church.paz.shared.domain.repository.ChurchRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType

class ChurchRepositoryImpl(private val client: HttpClient) : ChurchRepository {

    @Throws(Exception::class)
    override suspend fun getChurch(): Church =
        client.get("api/church").body()

    @Throws(Exception::class)
    override suspend fun getMyLifeGroups(): List<LifeGroup> =
        client.get("api/life-groups/me").body()

    @Throws(Exception::class)
    override suspend fun getAllLifeGroups(): List<LifeGroup> =
        client.get("api/life-groups/my-groups").body()

    @Throws(Exception::class)
    override suspend fun getAreas(): List<Area> =
        client.get("api/areas").body()

    @Throws(Exception::class)
    override suspend fun getSectors(): List<Sector> =
        client.get("api/sectors").body()

    @Throws(Exception::class)
    override suspend fun submitMeetingReport(report: MeetingReportRequest) {
        client.post("api/meeting-reports") {
            contentType(ContentType.Application.Json)
            setBody(report)
        }
    }
}
```

- [ ] **Step 4: Update FormsRepositoryImpl.kt**

```kotlin
package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.ConversionForm
import br.church.paz.shared.domain.model.CourseForm
import br.church.paz.shared.domain.model.FormCatalogItem
import br.church.paz.shared.domain.model.GuestForm
import br.church.paz.shared.domain.model.MeetingReportRequest
import br.church.paz.shared.domain.model.MemberRegistrationForm
import br.church.paz.shared.domain.model.MultiplicationForm
import br.church.paz.shared.domain.model.ServiceReportForm
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.repository.FormsRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType

class FormsRepositoryImpl(private val client: HttpClient) : FormsRepository {

    @Throws(Exception::class)
    override suspend fun getCatalog(): List<FormCatalogItem> =
        client.get("api/forms").body()

    @Throws(Exception::class)
    override suspend fun lookupUsers(query: String): List<User> =
        client.get("api/users/lookup") { parameter("q", query) }.body()

    @Throws(Exception::class)
    override suspend fun submitMemberRegistration(form: MemberRegistrationForm) =
        post("api/forms/member-registrations", form)

    @Throws(Exception::class)
    override suspend fun submitConversion(form: ConversionForm) =
        post("api/forms/form-conversions", form)

    @Throws(Exception::class)
    override suspend fun submitGuest(form: GuestForm) =
        post("api/forms/form-guests", form)

    @Throws(Exception::class)
    override suspend fun submitMultiplication(form: MultiplicationForm) =
        post("api/forms/multiplications", form)

    @Throws(Exception::class)
    override suspend fun submitServiceReport(form: ServiceReportForm) =
        post("api/forms/service-reports", form)

    @Throws(Exception::class)
    override suspend fun submitCourse(form: CourseForm) =
        post("api/forms/member-registrations/courses", form)

    @Throws(Exception::class)
    override suspend fun submitLifeGroupReport(report: MeetingReportRequest) =
        post("api/forms/life-group-reports", report)

    @Throws(Exception::class)
    override suspend fun submitSectorReport(report: MeetingReportRequest) =
        post("api/forms/sector-supervisor-reports", report)

    @Throws(Exception::class)
    override suspend fun submitAreaReport(report: MeetingReportRequest) =
        post("api/forms/area-supervisor-reports", report)

    private suspend inline fun <reified T : Any> post(path: String, body: T) {
        client.post(path) {
            contentType(ContentType.Application.Json)
            setBody(body)
        }
    }
}
```

- [ ] **Step 5: Update MemberJourneyRepositoryImpl.kt**

```kotlin
package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.MemberJourney
import br.church.paz.shared.domain.repository.MemberJourneyRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get

class MemberJourneyRepositoryImpl(private val client: HttpClient) : MemberJourneyRepository {
    @Throws(Exception::class)
    override suspend fun getMemberJourney(): MemberJourney =
        client.get("api/member-journey/me").body()
}
```

- [ ] **Step 6: Update UserRepositoryImpl.kt**

```kotlin
package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.DeviceToken
import br.church.paz.shared.domain.model.NotificationPreferences
import br.church.paz.shared.domain.model.UpdateProfileRequest
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.repository.UserRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType

class UserRepositoryImpl(private val client: HttpClient) : UserRepository {

    @Throws(Exception::class)
    override suspend fun getProfile(): User =
        client.get("api/users/me").body()

    @Throws(Exception::class)
    override suspend fun updateProfile(request: UpdateProfileRequest): User =
        client.patch("api/users/me") {
            contentType(ContentType.Application.Json)
            setBody(request)
        }.body()

    @Throws(Exception::class)
    override suspend fun getNotificationPreferences(): NotificationPreferences =
        client.get("api/users/me/notification-preferences").body()

    @Throws(Exception::class)
    override suspend fun updateNotificationPreferences(
        prefs: NotificationPreferences,
    ): NotificationPreferences =
        client.patch("api/users/me/notification-preferences") {
            contentType(ContentType.Application.Json)
            setBody(prefs)
        }.body()

    @Throws(Exception::class)
    override suspend fun registerDeviceToken(token: DeviceToken) {
        client.post("api/users/device-tokens") {
            contentType(ContentType.Application.Json)
            setBody(token)
        }
    }

    @Throws(Exception::class)
    override suspend fun removeDeviceToken(tokenId: String) {
        client.delete("api/users/device-tokens/$tokenId")
    }
}
```

---

### Task 3: Update Android ViewModels

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/home/HomeViewModel.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/academy/AcademyViewModel.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/profile/EditProfileViewModel.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/ministries/MinistriesViewModel.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/ministries/MinistryDetailViewModel.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/memberjourney/MemberJourneyViewModel.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/notifications/NotificationPrefsViewModel.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormulariosViewModel.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormDetailViewModel.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/search/SearchViewModel.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/meetingreport/MeetingReportViewModel.kt`

- [ ] **Step 1: Update HomeViewModel.kt**

Change in `load()`:
```kotlin
homeRepository.getHomeContent()
    .onSuccess { ... }
    .onFailure { ... }
```
To:
```kotlin
runCatching { homeRepository.getHomeContent() }
    .onSuccess { ... }
    .onFailure { ... }
```

- [ ] **Step 2: Update AcademyViewModel.kt**

Change in `load()`:
```kotlin
academyRepository.getAcademyContent()
    .onSuccess { ... }
    .onFailure { ... }
```
To:
```kotlin
runCatching { academyRepository.getAcademyContent() }
    .onSuccess { ... }
    .onFailure { ... }
```

- [ ] **Step 3: Update EditProfileViewModel.kt**

Change in `onSave()`:
```kotlin
userRepository.updateProfile(UpdateProfileRequest(name = name))
    .onSuccess { ... }
    .onFailure { ... }
```
To:
```kotlin
runCatching { userRepository.updateProfile(UpdateProfileRequest(name = name)) }
    .onSuccess { ... }
    .onFailure { ... }
```

- [ ] **Step 4: Update MinistriesViewModel.kt**

`async { churchRepository.getChurch() }` → `async { runCatching { churchRepository.getChurch() } }`
`async { churchRepository.getAllLifeGroups() }` → `async { runCatching { churchRepository.getAllLifeGroups() } }`

- [ ] **Step 5: Update MinistryDetailViewModel.kt** (contains both MinistryDetailViewModel and LifeGroupDetailViewModel)

`churchRepository.getChurch().onSuccess { ... }.onFailure { ... }` → `runCatching { churchRepository.getChurch() }.onSuccess { ... }.onFailure { ... }`
`churchRepository.getAllLifeGroups().onSuccess { ... }.onFailure { ... }` → `runCatching { churchRepository.getAllLifeGroups() }.onSuccess { ... }.onFailure { ... }`

- [ ] **Step 6: Update MemberJourneyViewModel.kt**

`memberJourneyRepository.getMemberJourney().onSuccess { ... }.onFailure { ... }` → `runCatching { memberJourneyRepository.getMemberJourney() }.onSuccess { ... }.onFailure { ... }`

- [ ] **Step 7: Update NotificationPrefsViewModel.kt**

`userRepository.getNotificationPreferences().onSuccess { ... }` → `runCatching { userRepository.getNotificationPreferences() }.onSuccess { ... }`
`userRepository.updateNotificationPreferences(...).onSuccess { ... }.onFailure { ... }` → `runCatching { userRepository.updateNotificationPreferences(...) }.onSuccess { ... }.onFailure { ... }`

- [ ] **Step 8: Update FormulariosViewModel.kt**

`formsRepository.getCatalog().onSuccess { ... }.onFailure { ... }` → `runCatching { formsRepository.getCatalog() }.onSuccess { ... }.onFailure { ... }`

- [ ] **Step 9: Update FormDetailViewModel.kt**

`formsRepository.getCatalog().onSuccess { ... }.onFailure { ... }` → `runCatching { formsRepository.getCatalog() }.onSuccess { ... }.onFailure { ... }`

`submitForm` returns `Result<Unit>` and calls e.g. `formsRepository.submitMemberRegistration(...)`. Since those no longer return `Result<Unit>`, change to:
```kotlin
private suspend fun submitForm(type: FormType, f: Map<String, String>): Result<Unit> {
    val userId = authRepository.currentUser()?.id ?: ""
    return runCatching {
        when (type) {
            FormType.member_registration -> formsRepository.submitMemberRegistration(...)
            // ... all branches
        }
    }
}
```

- [ ] **Step 10: Update SearchViewModel.kt**

`search()` currently calls repos and uses `.getOrNull()` on results. Replace direct calls with `runCatching { }`:
```kotlin
val homeResult = runCatching { homeRepository.getHomeContent() }
val academyResult = runCatching { academyRepository.getAcademyContent() }
val formsResult = runCatching { formsRepository.getCatalog() }
val churchResult = runCatching { churchRepository.getChurch() }
val lifeGroupsResult = runCatching { churchRepository.getAllLifeGroups() }
```
Then `.getOrNull()` works identically on `Result<T>`.

- [ ] **Step 11: Update MeetingReportViewModel.kt**

`formsRepository.submitLifeGroupReport(report).onSuccess { ... }.onFailure { ... }` → `runCatching { formsRepository.submitLifeGroupReport(report) }.onSuccess { ... }.onFailure { ... }`

---

### Task 4: Verify Build

- [ ] **Step 1: Run Android debug build**

```bash
cd /Users/jonathalima/Developer/church/kmp-mobile && ./gradlew :android:assembleDebug
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 2: Fix any compilation errors**

Common issues:
- Any ViewModel still calling `.onSuccess`/`.onFailure` directly on a repository call (should be wrapped in `runCatching`)
- `ChurchRepository.submitMeetingReport` used with `.onSuccess` somewhere (it now returns `Unit` not `Result<Unit>`)
- `AccountViewModel.onLogout()` calls `authRepository.logout()` — check if AuthRepository also needs updating

- [ ] **Step 3: Commit**

```bash
cd /Users/jonathalima/Developer/church/kmp-mobile
git add shared/src/commonMain/kotlin/br/church/paz/shared/domain/repository/
git add shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/
git add android/src/main/kotlin/br/church/paz/android/ui/features/
git commit -m "fix: replace Result<T> with @Throws + T for iOS interop; wrap Android ViewModel calls in runCatching"
```
