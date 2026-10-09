package br.church.paz.android.ui.theme

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals

/**
 * [PazGradients.heroForScheme] wraps a `@Composable` CompositionLocal read, which can't be
 * exercised directly in a plain JVM unit test (no Compose test rule wired into this module).
 * [PazGradients.heroGradientFor] holds the same selection logic without the composition
 * dependency, so it's what we exercise here.
 */
class PazGradientsTest {
    @Test
    fun `returns DarkHero when dark`() {
        assertEquals(PazGradients.DarkHero, PazGradients.heroGradientFor(isDark = true))
    }

    @Test
    fun `returns Hero when light`() {
        assertEquals(PazGradients.Hero, PazGradients.heroGradientFor(isDark = false))
    }

    @Test
    fun `DarkHero and Hero are distinct brushes`() {
        assertNotEquals(PazGradients.Hero, PazGradients.DarkHero)
    }
}
