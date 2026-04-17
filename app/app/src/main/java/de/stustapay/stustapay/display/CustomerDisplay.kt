package de.stustapay.stustapay.display

import android.content.Context
import android.hardware.display.DisplayManager
import android.util.Log
import android.view.Display
import de.stustapay.stustapay.locale.AppLocaleManager
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.stustapay.repository.TerminalConfigState
import java.lang.ref.WeakReference
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "CustomerDisplayManager"

/**
 * Manages the presentation on a secondary display for customers
 */
@Singleton
class CustomerDisplayManager @Inject constructor(
    private val context: Context,
    private val terminalConfigRepository: TerminalConfigRepository,
) {
    private var presentation: WeakReference<CustomerDisplayPresentation>? = null
    private var currentState: CustomerDisplayState = CustomerDisplayState.Welcome

    /**
     * Updates the state shown on the customer display
     */
    fun updateState(state: CustomerDisplayState) {
        currentState = state
        presentation?.get()?.updateContent(state)
    }

    /**
     * Check for available displays and show the customer presentation on secondary screens
     */
    fun initializeCustomerDisplay() {
        try {
            val displayManager = context.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
            val displays = displayManager.displays

            val secondaryDisplay = displays.firstOrNull { it.displayId != Display.DEFAULT_DISPLAY }
            secondaryDisplay?.let { showOnDisplay(it) }
        } catch (e: Exception) {
            Log.w(TAG, "initializeCustomerDisplay failed", e)
        }
    }

    private fun showOnDisplay(display: Display) {
        try {
            dismissPresentation()

            val displayContext = context.createDisplayContext(display)
            val customerPresentation = CustomerDisplayPresentation(
                AppLocaleManager.wrapContext(displayContext),
                display,
                ::resolveEventNameForDisplay,
            )
            customerPresentation.show()
            customerPresentation.updateContent(currentState)
            presentation = WeakReference(customerPresentation)
        } catch (e: Exception) {
            Log.w(TAG, "showOnDisplay failed", e)
        }
    }

    /**
     * Dismiss the current presentation
     */
    fun dismissPresentation() {
        try {
            presentation?.get()?.dismiss()
            presentation = null
        } catch (e: Exception) {
            Log.w(TAG, "dismissPresentation failed", e)
        }
    }

    private fun resolveEventNameForDisplay(): String {
        return when (val configState = terminalConfigRepository.terminalConfigState.value) {
            is TerminalConfigState.Success -> configState.config.eventName
            else -> "TeamFestlichPay"
        }
    }
}
