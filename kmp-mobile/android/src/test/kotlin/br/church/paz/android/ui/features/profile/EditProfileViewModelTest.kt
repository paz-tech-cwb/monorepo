package br.church.paz.android.ui.features.profile

import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.CepLookupOutcome
import br.church.paz.shared.domain.model.CepLookupResult
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.model.UserRole
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.OnboardingRepository
import br.church.paz.shared.domain.repository.UserRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Rule
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class EditProfileViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val userRepository = mockk<UserRepository>()
    private val onboardingRepository = mockk<OnboardingRepository>()
    private val authRepository = mockk<AuthRepository>(relaxed = true)

    private val fakeUser = User(id = "u1", name = "João", email = "joao@paz.church", role = UserRole.member)

    private fun viewModel() = EditProfileViewModel(userRepository, onboardingRepository, authRepository)

    @Test
    fun `isDirty is false immediately after load`() =
        runTest {
            coEvery { userRepository.getProfile() } returns fakeUser
            val viewModel = viewModel()
            advanceUntilIdle()

            assertFalse(viewModel.uiState.value.isDirty)
        }

    @Test
    fun `isDirty becomes true after a field edit`() =
        runTest {
            coEvery { userRepository.getProfile() } returns fakeUser
            val viewModel = viewModel()
            advanceUntilIdle()

            viewModel.onNameChanged("João Pedro")

            assertTrue(viewModel.uiState.value.isDirty)
        }

    @Test
    fun `CEP mask formats digits as five-dash-three`() =
        runTest {
            coEvery { userRepository.getProfile() } returns fakeUser
            coEvery { onboardingRepository.lookupCep(any()) } returns CepLookupOutcome.NotFound
            val viewModel = viewModel()
            advanceUntilIdle()

            viewModel.onZipCodeChanged("80000000")

            assertEquals("80000-000", viewModel.uiState.value.zipCode)
        }

    @Test
    fun `CEP mask is delete-aware when removing the dash`() =
        runTest {
            coEvery { userRepository.getProfile() } returns fakeUser
            coEvery { onboardingRepository.lookupCep(any()) } returns CepLookupOutcome.NotFound
            val viewModel = viewModel()
            advanceUntilIdle()

            viewModel.onZipCodeChanged("80000000")
            assertEquals("80000-000", viewModel.uiState.value.zipCode)

            // Simulates the user backspacing over the mask's dash character itself: the raw
            // text shrinks by one char ("80000-000" -> "80000000") but the digit count stays
            // the same (8 == 8), so the mask logic must drop the last digit rather than
            // re-displaying all 8 digits unchanged.
            viewModel.onZipCodeChanged("80000000")

            assertEquals("80000-00", viewModel.uiState.value.zipCode)
        }

    @Test
    fun `entering the same CEP twice only triggers one lookup`() =
        runTest {
            coEvery { userRepository.getProfile() } returns fakeUser
            coEvery { onboardingRepository.lookupCep("80000000") } returns
                CepLookupOutcome.Found(CepLookupResult("Rua A", "Centro", "Curitiba", "PR"))
            val viewModel = viewModel()
            advanceUntilIdle()

            viewModel.onZipCodeChanged("80000000")
            advanceUntilIdle()
            viewModel.onZipCodeChanged("80000-000") // re-entering the same digits, just re-masked
            advanceUntilIdle()

            coVerify(exactly = 1) { onboardingRepository.lookupCep("80000000") }
        }

    @Test
    fun `a failed lookup does not block retrying the same CEP`() =
        runTest {
            coEvery { userRepository.getProfile() } returns fakeUser
            coEvery { onboardingRepository.lookupCep("80000000") } returns CepLookupOutcome.NotFound
            val viewModel = viewModel()
            advanceUntilIdle()

            viewModel.onZipCodeChanged("80000000")
            advanceUntilIdle()
            assertEquals("CEP não encontrado", viewModel.uiState.value.cepError)

            // Clear the field so the next entry of the identical digits is treated as a
            // real change, then re-enter the same CEP: since the prior lookup failed, the
            // dedup guard must NOT have recorded it, so this retries instead of being skipped.
            viewModel.onZipCodeChanged("")
            viewModel.onZipCodeChanged("80000000")
            advanceUntilIdle()

            coVerify(exactly = 2) { onboardingRepository.lookupCep("80000000") }
        }

    @Test
    fun `changing to a new CEP clears previous address fields before the new result applies`() =
        runTest {
            coEvery { userRepository.getProfile() } returns fakeUser
            coEvery { onboardingRepository.lookupCep("80000000") } returns
                CepLookupOutcome.Found(CepLookupResult("Rua A", "Centro", "Curitiba", "PR"))
            val viewModel = viewModel()
            advanceUntilIdle()

            viewModel.onZipCodeChanged("80000000")
            advanceUntilIdle()
            assertEquals("Rua A", viewModel.uiState.value.street)

            // Entering a different CEP (not yet resolved) must clear the stale address
            // fields immediately, before the new lookup's result (if any) arrives.
            coEvery { onboardingRepository.lookupCep("81000000") } returns
                CepLookupOutcome.Error("boom")
            viewModel.onZipCodeChanged("")
            viewModel.onZipCodeChanged("81000000")

            assertEquals("", viewModel.uiState.value.street)
            assertEquals("", viewModel.uiState.value.neighborhood)
            assertEquals("", viewModel.uiState.value.city)
            assertEquals("", viewModel.uiState.value.state)
            assertNull(viewModel.uiState.value.cepError) // no stale error carried over either
        }
}
