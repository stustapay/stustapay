package de.stustapay.stustapay.ui.sale

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SaleAutoBookCountdownControllerTest {
    @Test
    fun `start activates countdown with full duration`() {
        val controller = SaleAutoBookCountdownController(totalSeconds = 10, onFinished = {})

        controller.start()

        assertTrue(controller.state.value.isActive)
        assertEquals(10, controller.state.value.remainingSeconds)
        assertEquals(1f, controller.state.value.progress, 0f)
    }

    @Test
    fun `ten ticks finish countdown exactly once`() {
        var finishCount = 0
        val controller = SaleAutoBookCountdownController(totalSeconds = 10) {
            finishCount += 1
        }

        controller.start()
        repeat(10) {
            controller.tick()
        }
        controller.tick()

        assertEquals(1, finishCount)
        assertEquals(SaleAutoBookMode.Hidden, controller.state.value.mode)
        assertEquals(0, controller.state.value.remainingSeconds)
    }

    @Test
    fun `clear resets running countdown without finishing`() {
        var finishCount = 0
        val controller = SaleAutoBookCountdownController(totalSeconds = 10) {
            finishCount += 1
        }

        controller.start()
        repeat(3) {
            controller.tick()
        }
        controller.clear()

        assertEquals(SaleAutoBookMode.Hidden, controller.state.value.mode)
        assertEquals(0, controller.state.value.remainingSeconds)
        assertEquals(0, finishCount)
    }
}
