package de.stustapay.stustapay.ui.root

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TopOverscrollRefreshStateTest {
    @Test
    fun `triggers once after pull threshold is exceeded`() {
        val state = TopOverscrollRefreshState(thresholdPx = 180f)

        assertFalse(state.onDragDelta(deltaY = 120f, atTop = true, loading = false))
        assertTrue(state.onDragDelta(deltaY = 70f, atTop = true, loading = false))
    }

    @Test
    fun `does not retrigger until pull is reset`() {
        val state = TopOverscrollRefreshState(thresholdPx = 180f)

        assertTrue(state.onDragDelta(deltaY = 200f, atTop = true, loading = false))
        assertFalse(state.onDragDelta(deltaY = 40f, atTop = true, loading = false))
        assertFalse(state.onDragDelta(deltaY = -240f, atTop = true, loading = false))
        assertTrue(state.onDragDelta(deltaY = 200f, atTop = true, loading = false))
    }

    @Test
    fun `rearms after leaving the top`() {
        val state = TopOverscrollRefreshState(thresholdPx = 180f)

        assertTrue(state.onDragDelta(deltaY = 200f, atTop = true, loading = false))
        assertFalse(state.onDragDelta(deltaY = 30f, atTop = false, loading = false))
        assertTrue(state.onDragDelta(deltaY = 200f, atTop = true, loading = false))
    }

    @Test
    fun `ignores pull while loading`() {
        val state = TopOverscrollRefreshState(thresholdPx = 180f)

        assertFalse(state.onDragDelta(deltaY = 240f, atTop = true, loading = true))
        assertTrue(state.onDragDelta(deltaY = 240f, atTop = true, loading = false))
    }
}
