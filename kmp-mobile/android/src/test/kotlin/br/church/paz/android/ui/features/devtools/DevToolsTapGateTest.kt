package br.church.paz.android.ui.features.devtools

import br.church.paz.shared.domain.model.UserRole
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class DevToolsTapGateTest {
    @Test
    fun `six taps within the window keeps the gate closed`() {
        val clock = FakeClock()
        val gate = DevToolsTapGate(now = clock::now)

        val results = (1..6).map { gate.onTap(UserRole.admin) }

        assertTrue(results.all { !it })
    }

    @Test
    fun `seven taps within the window opens the gate for an admin`() {
        val clock = FakeClock()
        val gate = DevToolsTapGate(now = clock::now)

        val results = (1..7).map { gate.onTap(UserRole.admin) }

        assertFalse(results.dropLast(1).any { it })
        assertTrue(results.last())
    }

    @Test
    fun `seven taps within the window stays closed for a member`() {
        val clock = FakeClock()
        val gate = DevToolsTapGate(now = clock::now)

        val results = (1..7).map { gate.onTap(UserRole.member) }

        assertTrue(results.all { !it })
    }

    @Test
    fun `seven taps within the window opens the gate for a pastor`() {
        val clock = FakeClock()
        val gate = DevToolsTapGate(now = clock::now)

        val results = (1..7).map { gate.onTap(UserRole.pastor) }

        assertFalse(results.dropLast(1).any { it })
        assertTrue(results.last())
    }

    @Test
    fun `seven taps within the window stays closed for a null role`() {
        val clock = FakeClock()
        val gate = DevToolsTapGate(now = clock::now)

        val results = (1..7).map { gate.onTap(null) }

        assertTrue(results.all { !it })
    }

    @Test
    fun `seven taps within the window stays closed for an area leader`() {
        val clock = FakeClock()
        val gate = DevToolsTapGate(now = clock::now)

        val results = (1..7).map { gate.onTap(UserRole.area_leader) }

        assertTrue(results.all { !it })
    }

    @Test
    fun `seven taps within the window stays closed for a sector leader`() {
        val clock = FakeClock()
        val gate = DevToolsTapGate(now = clock::now)

        val results = (1..7).map { gate.onTap(UserRole.sector_leader) }

        assertTrue(results.all { !it })
    }

    @Test
    fun `taps spread out beyond the window reset the counter`() {
        val clock = FakeClock()
        val gate = DevToolsTapGate(now = clock::now)

        // Taps 1-4 land inside one window.
        repeat(4) { gate.onTap(UserRole.admin) }

        // A long pause pushes the next taps outside that window, so the earlier
        // taps must be dropped rather than counted toward the total.
        clock.advanceMillis(5_000)

        // Taps 5-7 (only 3 taps) land within a fresh window — not enough to open.
        val results = (1..3).map { gate.onTap(UserRole.admin) }

        assertTrue(results.all { !it })
    }

    private class FakeClock {
        private var elapsedMillis = 0L

        fun now(): Long = elapsedMillis

        fun advanceMillis(millis: Long) {
            elapsedMillis += millis
        }
    }
}
