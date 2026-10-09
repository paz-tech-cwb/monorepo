package br.church.paz.android.ui.features.academy

import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.CourseDetail
import br.church.paz.shared.domain.model.Lesson
import br.church.paz.shared.domain.repository.CourseRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class CourseDetailViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val courseRepository = mockk<CourseRepository>()

    private fun course() =
        CourseDetail(
            id = "course-1",
            title = "Curso 1",
            lessons = listOf(
                Lesson(id = "lesson-1", title = "Aula 1", youtubeVideoId = "abc123"),
                Lesson(id = "lesson-2", title = "Aula 2", youtubeVideoId = "def456"),
            ),
        )

    @Test
    fun `background refresh failure after a course is already loaded does not overwrite course or error`() =
        runTest {
            coEvery { courseRepository.getCourseDetail("course-1") } returns course()

            val viewModel = CourseDetailViewModel("course-1", courseRepository)
            testScheduler.advanceUntilIdle()

            assertNotNull(viewModel.uiState.value.course)
            assertNull(viewModel.uiState.value.error)

            coEvery { courseRepository.getCourseDetail("course-1") } throws RuntimeException("network down")
            viewModel.load(showLoading = false)
            testScheduler.advanceUntilIdle()

            assertNotNull(viewModel.uiState.value.course)
            assertNull(viewModel.uiState.value.error)
        }

    @Test
    fun `first load failure sets error and leaves course null`() =
        runTest {
            coEvery { courseRepository.getCourseDetail("course-1") } throws RuntimeException("network down")

            val viewModel = CourseDetailViewModel("course-1", courseRepository)
            testScheduler.advanceUntilIdle()

            assertNull(viewModel.uiState.value.course)
            assertEquals("network down", viewModel.uiState.value.error)
        }

    @Test
    fun `onSelectLesson clears playerError when switching lessons`() =
        runTest {
            coEvery { courseRepository.getCourseDetail("course-1") } returns course()

            val viewModel = CourseDetailViewModel("course-1", courseRepository)
            testScheduler.advanceUntilIdle()

            viewModel.onPlayerError()
            assertTrue(viewModel.uiState.value.playerError)

            viewModel.onSelectLesson("lesson-2")

            assertEquals(false, viewModel.uiState.value.playerError)
            assertEquals("lesson-2", viewModel.uiState.value.selectedLessonId)
        }
}
