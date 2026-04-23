package de.stustapay.stustapay.ui.root

internal class TopOverscrollRefreshState(
    private val thresholdPx: Float,
) {
    private var overscrollPx = 0f
    private var canTrigger = true

    fun onDragDelta(deltaY: Float, atTop: Boolean, loading: Boolean): Boolean {
        if (loading || !atTop) {
            reset()
            return false
        }

        if (deltaY > 0f) {
            overscrollPx += deltaY
        } else if (deltaY < 0f) {
            overscrollPx = (overscrollPx + deltaY).coerceAtLeast(0f)
        }

        if (overscrollPx == 0f) {
            canTrigger = true
        }

        if (canTrigger && overscrollPx >= thresholdPx) {
            canTrigger = false
            overscrollPx = thresholdPx
            return true
        }

        return false
    }

    fun reset() {
        overscrollPx = 0f
        canTrigger = true
    }
}
