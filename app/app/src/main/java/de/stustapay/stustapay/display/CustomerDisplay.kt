package de.stustapay.stustapay.display

import android.app.Presentation
import android.content.Context
import android.hardware.display.DisplayManager
import android.os.Bundle
import android.view.Display
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.compose.foundation.layout.*
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Surface
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import de.stustapay.api.models.CompletedSale
import de.stustapay.api.models.TerminalConfig
import de.stustapay.libssp.ui.theme.Theme
import de.stustapay.stustapay.R
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.stustapay.repository.TerminalConfigState
import de.stustapay.stustapay.ui.common.pay.ProductConfirmItem
import java.lang.ref.WeakReference
import javax.inject.Inject
import javax.inject.Singleton

/**
 * State displayed on the customer-facing screen
 */
sealed class CustomerDisplayState {
    object Welcome : CustomerDisplayState()
    object ScanChip : CustomerDisplayState()
    data class SaleCompleted(val sale: CompletedSale) : CustomerDisplayState()
    data class TopUpCompleted(val newBalance: String, val topUpAmount: String) : CustomerDisplayState()
    data class ValidatingSale(val totalPrice: String, val currentBalance: String, val newBalance: String? = null, val products: List<Pair<String, String>> = emptyList()) : CustomerDisplayState()
    data class InsufficientFunds(val totalPrice: String, val currentBalance: String) : CustomerDisplayState()
}

/**
 * Manages the presentation on a secondary display for customers
 */
@Singleton
class CustomerDisplayManager @Inject constructor(
    private val context: Context,
    private val terminalConfigRepository: TerminalConfigRepository
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

            // Find a secondary display
            val secondaryDisplay = displays.firstOrNull { it.displayId != Display.DEFAULT_DISPLAY }

            // If we have a secondary display, show our presentation on it
            secondaryDisplay?.let {
                showOnDisplay(it)
            }
        } catch (e: Exception) {
            // Handle any exceptions gracefully to prevent app crashes
            e.printStackTrace()
        }
    }

    /**
     * Shows the customer presentation on the given display
     */
    private fun showOnDisplay(display: Display) {
        try {
            val customerPresentation = CustomerDisplayPresentation(context, display)
            customerPresentation.show()
            customerPresentation.updateContent(currentState)
            presentation = WeakReference(customerPresentation)
        } catch (e: Exception) {
            // Handle any exceptions gracefully to prevent app crashes
            e.printStackTrace()
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
            // Handle any exceptions gracefully
            e.printStackTrace()
        }
    }

    /**
     * Get the event name from TerminalConfig
     */
    private fun getEventName(): String {
        return when (val configState = terminalConfigRepository.terminalConfigState.value) {
            is TerminalConfigState.Success -> configState.config.eventName
            else -> "TeamFestlichPay"
        }
    }

    /**
     * The presentation class for the customer display
     */
    private inner class CustomerDisplayPresentation(
        context: Context,
        display: Display
    ) : Presentation(context, display) {
        
        private var currentState: CustomerDisplayState = CustomerDisplayState.Welcome

        override fun onCreate(savedInstanceState: Bundle?) {
            super.onCreate(savedInstanceState)

            try {
                // Set the window to be fullscreen
                window?.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
                
                // Create a FrameLayout as the content view
                val rootView = FrameLayout(context)
                setContentView(rootView)
                
                // Display the content using a TextView for better compatibility
                val textView = android.widget.TextView(context).apply {
                    // Get event name from TerminalConfig
                    val eventName = getEventName()
                    
                    text = "Willkommen bei $eventName"
                    textSize = 24f
                    setTextColor(android.graphics.Color.BLACK)
                    gravity = android.view.Gravity.CENTER
                    layoutParams = FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT, 
                        FrameLayout.LayoutParams.MATCH_PARENT
                    )
                }
                
                rootView.addView(textView)
                
            } catch (e: Exception) {
                // Handle any exceptions
                e.printStackTrace()
            }
        }

        fun updateContent(state: CustomerDisplayState) {
            try {
                currentState = state
                
                // Get the current content view
                val rootView = window?.decorView?.findViewById<FrameLayout>(android.R.id.content)
                
                // Clear existing views
                rootView?.removeAllViews()
                
                // Create custom views for each state
                when (state) {
                    is CustomerDisplayState.Welcome -> {
                        showWelcomeView(rootView)
                    }
                    is CustomerDisplayState.ScanChip -> {
                        showScanChipView(rootView)
                    }
                    is CustomerDisplayState.SaleCompleted -> {
                        showSaleCompletedView(state, rootView)
                    }
                    is CustomerDisplayState.TopUpCompleted -> {
                        showTopUpCompletedView(state, rootView)
                    }
                    is CustomerDisplayState.ValidatingSale -> {
                        showValidatingSaleView(state, rootView)
                    }
                    is CustomerDisplayState.InsufficientFunds -> {
                        showInsufficientFundsView(state, rootView)
                    }
                }
            } catch (e: Exception) {
                // Handle any exceptions
                e.printStackTrace()
            }
        }
        
        /**
         * Shows a styled welcome view
         */
        private fun showWelcomeView(rootView: FrameLayout?) {
            // Get event name
                val eventName = getEventName()
            
            // Main container
            val container = android.widget.LinearLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT
                )
                orientation = android.widget.LinearLayout.VERTICAL
                gravity = android.view.Gravity.CENTER
                setPadding(50, 50, 50, 50)
                
                // Set a gradient background
                background = android.graphics.drawable.GradientDrawable().apply {
                    orientation = android.graphics.drawable.GradientDrawable.Orientation.TOP_BOTTOM
                    colors = intArrayOf(
                        android.graphics.Color.parseColor("#F5F9FF"),
                        android.graphics.Color.parseColor("#E1EDFF")
                    )
                }
            }
            
            // Event logo/name section with blue box
            val logoContainer = android.widget.LinearLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(50, 0, 50, 80)
                }
                orientation = android.widget.LinearLayout.VERTICAL
                gravity = android.view.Gravity.CENTER
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(android.graphics.Color.parseColor("#3366CC"))
                    cornerRadius = 20f
                }
                setPadding(30, 30, 30, 30)
            }
            
            // Welcome text
            val welcomeText = android.widget.TextView(context).apply {
                text = "Willkommen bei"
                textSize = 24f
                setTextColor(android.graphics.Color.WHITE)
                gravity = android.view.Gravity.CENTER
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 10)
                }
            }
            
            // Event name text
            val eventText = android.widget.TextView(context).apply {
                text = eventName
                textSize = 36f
                setTextColor(android.graphics.Color.WHITE)
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                gravity = android.view.Gravity.CENTER
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                )
            }
            
            // Instructions text
            val instructionsText = android.widget.TextView(context).apply {
                text = "Bitte treffen Sie eine Auswahl"
                textSize = 26f
                setTextColor(android.graphics.Color.parseColor("#333333"))
                gravity = android.view.Gravity.CENTER
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 30)
                }
            }
            
            // Add all elements to their containers
            logoContainer.addView(welcomeText)
            logoContainer.addView(eventText)
            
            container.addView(logoContainer)
            container.addView(instructionsText)
            
            // Add the container to the root view
            rootView?.addView(container)
        }

        /**
         * Shows a styled scan chip view
         */
        private fun showScanChipView(rootView: FrameLayout?) {
            // Main container with a subtle gradient
            val container = android.widget.LinearLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT
                )
                orientation = android.widget.LinearLayout.VERTICAL
                gravity = android.view.Gravity.CENTER
                setPadding(50, 50, 50, 50)
                background = android.graphics.drawable.GradientDrawable().apply {
                    orientation = android.graphics.drawable.GradientDrawable.Orientation.TOP_BOTTOM
                    colors = intArrayOf(
                        android.graphics.Color.parseColor("#FFFFFF"),
                        android.graphics.Color.parseColor("#F0F8FF")
                    )
                }
            }
            
            // Animation indicator (pulsing circle)
            val scanImage = android.widget.FrameLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 50)
                    gravity = android.view.Gravity.CENTER
                }
                
                // Create circle background
                background = android.graphics.drawable.GradientDrawable().apply {
                    shape = android.graphics.drawable.GradientDrawable.OVAL
                    setColor(android.graphics.Color.parseColor("#4CAF50"))
                    setSize(200, 200)
                }
                
                // Start animation
                startAnimation(android.view.animation.AlphaAnimation(0.4f, 1.0f).apply {
                    duration = 1000
                    repeatMode = android.view.animation.Animation.REVERSE
                    repeatCount = android.view.animation.Animation.INFINITE
                    interpolator = android.view.animation.LinearInterpolator()
                })
            }
            
            // NFC icon
            val nfcIcon = android.widget.TextView(context).apply {
                text = "📱"  // Use emoji for NFC/phone
                textSize = 40f
                gravity = android.view.Gravity.CENTER
                layoutParams = android.widget.FrameLayout.LayoutParams(
                    android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                    android.widget.FrameLayout.LayoutParams.MATCH_PARENT
                )
            }
            
            // Title text
            val titleText = android.widget.TextView(context).apply {
                text = "Bitte scannen Sie Ihren Chip/Tag"
                textSize = 28f
                setTextColor(android.graphics.Color.parseColor("#333333"))
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                gravity = android.view.Gravity.CENTER
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 30)
                }
            }
            
            // Instructions text
            val instructionsText = android.widget.TextView(context).apply {
                text = "Halten Sie Ihren Chip an das Lesegerät"
                textSize = 22f
                setTextColor(android.graphics.Color.parseColor("#666666"))
                gravity = android.view.Gravity.CENTER
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                )
            }
            
            // Add elements to containers
            scanImage.addView(nfcIcon)
            
            container.addView(titleText)
            container.addView(scanImage)
            container.addView(instructionsText)
            
            // Add container to root view
            rootView?.addView(container)
        }

        /**
         * Shows the custom insufficient funds view
         */
        private fun showInsufficientFundsView(state: CustomerDisplayState.InsufficientFunds, rootView: FrameLayout?) {
            val totalPrice = state.totalPrice.toDoubleOrNull() ?: 0.0
            val currentBalance = state.currentBalance.toDoubleOrNull() ?: 0.0
            val missingAmount = (totalPrice - currentBalance).coerceAtLeast(0.0)
            
            // Create a box with red border for the error message
            val errorBox = android.widget.LinearLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(50, 50, 50, 50)
                }
                orientation = android.widget.LinearLayout.VERTICAL
                background = android.graphics.drawable.GradientDrawable().apply {
                    setStroke(8, android.graphics.Color.RED)
                    setColor(android.graphics.Color.parseColor("#FFEEEE"))
                    cornerRadius = 20f
                }
                setPadding(30, 30, 30, 30)
            }
            
            // Header text
            val headerTextView = android.widget.TextView(context).apply {
                text = "⚠️ NICHT GENUG GUTHABEN ⚠️"
                    textSize = 24f
                setTextColor(android.graphics.Color.RED)
                gravity = android.view.Gravity.CENTER
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 30)
                }
            }
            
            // Funds info layout
            val infoLayout = android.widget.LinearLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                )
                orientation = android.widget.LinearLayout.VERTICAL
                setPadding(20, 20, 20, 20)
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(android.graphics.Color.WHITE)
                    cornerRadius = 10f
                }
            }
            
            // Needed amount
            val neededTextView = android.widget.TextView(context).apply {
                text = "Benötigter Betrag: ${String.format("%.2f €", totalPrice)}"
                textSize = 20f
                setTextColor(android.graphics.Color.BLACK)
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 15)
                }
            }
            
            // Available amount
            val availableTextView = android.widget.TextView(context).apply {
                text = "Verfügbares Guthaben: ${String.format("%.2f €", currentBalance)}"
                textSize = 20f
                setTextColor(android.graphics.Color.BLACK)
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 15)
                }
            }
            
            // Missing amount with red background
            val missingTextView = android.widget.TextView(context).apply {
                text = "Fehlender Betrag: ${String.format("%.2f €", missingAmount)}"
                textSize = 22f
                setTextColor(android.graphics.Color.WHITE)
                gravity = android.view.Gravity.CENTER
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(android.graphics.Color.RED)
                    cornerRadius = 10f
                }
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 15, 0, 0)
                }
                setPadding(10, 10, 10, 10)
            }
            
            // Message
            val messageTextView = android.widget.TextView(context).apply {
                text = "Bitte laden Sie Ihr Konto auf, um fortzufahren."
                textSize = 18f
                    setTextColor(android.graphics.Color.BLACK)
                gravity = android.view.Gravity.CENTER
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 30, 0, 0)
                }
            }
            
            // Add views to layouts
            infoLayout.addView(neededTextView)
            infoLayout.addView(availableTextView)
            infoLayout.addView(missingTextView)
            
            errorBox.addView(headerTextView)
            errorBox.addView(infoLayout)
            errorBox.addView(messageTextView)
            
            // Add the error box to the root view
            rootView?.addView(errorBox)
        }

        /**
         * Shows a styled sale completed view
         */
        private fun showSaleCompletedView(state: CustomerDisplayState.SaleCompleted, rootView: FrameLayout?) {
            // Main container with a green success gradient
            val container = android.widget.LinearLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT
                )
                orientation = android.widget.LinearLayout.VERTICAL
                gravity = android.view.Gravity.CENTER
                setPadding(30, 30, 30, 30)
                background = android.graphics.drawable.GradientDrawable().apply {
                    orientation = android.graphics.drawable.GradientDrawable.Orientation.TOP_BOTTOM
                    colors = intArrayOf(
                        android.graphics.Color.parseColor("#F0FFF0"),
                        android.graphics.Color.parseColor("#E0FFE0")
                    )
                }
            }
            
            // Success icon and title in a horizontal layout to save vertical space
            val headerLayout = android.widget.LinearLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 20)
                }
                orientation = android.widget.LinearLayout.HORIZONTAL
                gravity = android.view.Gravity.CENTER_VERTICAL
            }
            
            // Success icon (checkmark in circle)
            val successIcon = android.widget.FrameLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 20, 0)
                }
                
                background = android.graphics.drawable.GradientDrawable().apply {
                    shape = android.graphics.drawable.GradientDrawable.OVAL
                    setColor(android.graphics.Color.parseColor("#4CAF50"))
                    setSize(100, 100)
                }
            }
            
            // Checkmark symbol
            val checkmark = android.widget.TextView(context).apply {
                text = "✓"
                textSize = 40f
                setTextColor(android.graphics.Color.WHITE)
                gravity = android.view.Gravity.CENTER
                layoutParams = android.widget.FrameLayout.LayoutParams(
                    android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                    android.widget.FrameLayout.LayoutParams.MATCH_PARENT
                )
            }
            
            // Completion text
            val titleText = android.widget.TextView(context).apply {
                text = "Kauf abgeschlossen"
                textSize = 26f
                setTextColor(android.graphics.Color.parseColor("#4CAF50"))
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                gravity = android.view.Gravity.START;android.view.Gravity.CENTER_VERTICAL
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    0,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    1f
                )
            }
            
            successIcon.addView(checkmark)
            headerLayout.addView(successIcon)
            headerLayout.addView(titleText)
            
            // Information box (make it take the full width with less padding)
            val infoBox = android.widget.LinearLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                )
                orientation = android.widget.LinearLayout.VERTICAL
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(android.graphics.Color.WHITE)
                    cornerRadius = 10f
                    setStroke(2, android.graphics.Color.parseColor("#DDDDDD"))
                }
                setPadding(20, 20, 20, 20)
            }
            
            // Total price (make more compact)
            val totalPriceBox = android.widget.LinearLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 10)
                }
                orientation = android.widget.LinearLayout.HORIZONTAL
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(android.graphics.Color.parseColor("#F0F0F0"))
                    cornerRadius = 8f
                }
                setPadding(15, 10, 15, 10)
            }
            
            val totalPriceLabel = android.widget.TextView(context).apply {
                text = "Gesamtbetrag:"
                textSize = 18f
                setTextColor(android.graphics.Color.parseColor("#333333"))
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    0,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    1f
                )
            }
            
            val totalPriceValue = android.widget.TextView(context).apply {
                text = "${state.sale.totalPrice} €"
                textSize = 18f
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                setTextColor(android.graphics.Color.parseColor("#4CAF50"))
                gravity = android.view.Gravity.END
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                )
            }
            
            totalPriceBox.addView(totalPriceLabel)
            totalPriceBox.addView(totalPriceValue)
            infoBox.addView(totalPriceBox)
            
            // New balance row (only if available)
            if (state.sale.newBalance != null) {
                val newBalanceBox = android.widget.LinearLayout(context).apply {
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                    )
                    orientation = android.widget.LinearLayout.HORIZONTAL
                    background = android.graphics.drawable.GradientDrawable().apply {
                        setColor(android.graphics.Color.parseColor("#F0F0F0"))
                        cornerRadius = 8f
                    }
                    setPadding(15, 10, 15, 10)
                }
                
                val newBalanceLabel = android.widget.TextView(context).apply {
                    text = "Neues Guthaben:"
                    textSize = 18f
                    setTextColor(android.graphics.Color.parseColor("#333333"))
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        0,
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                        1f
                    )
                }
                
                val newBalanceValue = android.widget.TextView(context).apply {
                    text = "${state.sale.newBalance} €"
                    textSize = 18f
                    typeface = android.graphics.Typeface.DEFAULT_BOLD
                    setTextColor(android.graphics.Color.parseColor("#3366CC"))
                    gravity = android.view.Gravity.END
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                    )
                }
                
                newBalanceBox.addView(newBalanceLabel)
                newBalanceBox.addView(newBalanceValue)
                infoBox.addView(newBalanceBox)
            }
            
            // Add all elements to container
            container.addView(headerLayout)
            container.addView(infoBox)
            
            // Add container to root view
            rootView?.addView(container)
        }

        /**
         * Shows a styled top-up completed view
         */
        private fun showTopUpCompletedView(state: CustomerDisplayState.TopUpCompleted, rootView: FrameLayout?) {
            // Main container with a blue success gradient
            val container = android.widget.LinearLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT
                )
                orientation = android.widget.LinearLayout.VERTICAL
                gravity = android.view.Gravity.CENTER
                setPadding(30, 30, 30, 30) // Reduced padding
                background = android.graphics.drawable.GradientDrawable().apply {
                    orientation = android.graphics.drawable.GradientDrawable.Orientation.TOP_BOTTOM
                    colors = intArrayOf(
                        android.graphics.Color.parseColor("#F0F8FF"),
                        android.graphics.Color.parseColor("#E0F0FF")
                    )
                }
            }
            
            // Icon and title in a horizontal layout to save vertical space
            val headerLayout = android.widget.LinearLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 20)
                }
                orientation = android.widget.LinearLayout.HORIZONTAL
                gravity = android.view.Gravity.CENTER_VERTICAL
            }
            
            // Success icon (plus in circle)
            val successIcon = android.widget.FrameLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 20, 0)
                }
                
                background = android.graphics.drawable.GradientDrawable().apply {
                    shape = android.graphics.drawable.GradientDrawable.OVAL
                    setColor(android.graphics.Color.parseColor("#3366CC"))
                    setSize(100, 100) // Smaller icon
                }
            }
            
            // Plus symbol
            val plusSymbol = android.widget.TextView(context).apply {
                text = "+"
                textSize = 40f // Smaller text
                setTextColor(android.graphics.Color.WHITE)
                gravity = android.view.Gravity.CENTER
                layoutParams = android.widget.FrameLayout.LayoutParams(
                    android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                    android.widget.FrameLayout.LayoutParams.MATCH_PARENT
                )
            }
            
            // Completion text
            val titleText = android.widget.TextView(context).apply {
                text = "Aufladung abgeschlossen"
                textSize = 26f // Smaller text
                setTextColor(android.graphics.Color.parseColor("#3366CC"))
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                gravity = android.view.Gravity.START
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    0,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    1f
                )
            }
            
            successIcon.addView(plusSymbol)
            headerLayout.addView(successIcon)
            headerLayout.addView(titleText)
            
            // Information box (more compact)
            val infoBox = android.widget.LinearLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                )
                orientation = android.widget.LinearLayout.VERTICAL
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(android.graphics.Color.WHITE)
                    cornerRadius = 10f
                    setStroke(2, android.graphics.Color.parseColor("#DDDDDD"))
                }
                setPadding(20, 20, 20, 20) // Reduced padding
            }
            
            // Top-up amount box (more compact)
            val topUpAmountBox = android.widget.LinearLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 10) // Reduced margin
                }
                orientation = android.widget.LinearLayout.HORIZONTAL
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(android.graphics.Color.parseColor("#F0F0F0"))
                    cornerRadius = 8f // Smaller radius
                }
                setPadding(15, 10, 15, 10) // Reduced padding
            }
            
            val topUpAmountLabel = android.widget.TextView(context).apply {
                text = "Aufgeladener Betrag:"
                textSize = 18f // Smaller text
                setTextColor(android.graphics.Color.parseColor("#333333"))
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    0,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    1f
                )
            }
            
            val topUpAmountValue = android.widget.TextView(context).apply {
                text = "${state.topUpAmount} €"
                textSize = 18f // Smaller text
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                setTextColor(android.graphics.Color.parseColor("#3366CC"))
                gravity = android.view.Gravity.END
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                )
            }
            
            // New balance box (more compact)
            val newBalanceBox = android.widget.LinearLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                )
                orientation = android.widget.LinearLayout.HORIZONTAL
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(android.graphics.Color.parseColor("#F0F0F0"))
                    cornerRadius = 8f // Smaller radius
                }
                setPadding(15, 10, 15, 10) // Reduced padding
            }
            
            val newBalanceLabel = android.widget.TextView(context).apply {
                text = "Neues Guthaben:"
                textSize = 18f // Smaller text
                setTextColor(android.graphics.Color.parseColor("#333333"))
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    0,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    1f
                )
            }
            
            val newBalanceValue = android.widget.TextView(context).apply {
                text = "${state.newBalance} €"
                textSize = 18f // Smaller text
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                setTextColor(android.graphics.Color.parseColor("#4CAF50"))  // Use green for new balance
                gravity = android.view.Gravity.END
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                )
            }
            
            // Add elements to their containers
            topUpAmountBox.addView(topUpAmountLabel)
            topUpAmountBox.addView(topUpAmountValue)
            
            newBalanceBox.addView(newBalanceLabel)
            newBalanceBox.addView(newBalanceValue)
            
            infoBox.addView(topUpAmountBox)
            infoBox.addView(newBalanceBox)
            
            // Add all elements to container
            container.addView(headerLayout)
            container.addView(infoBox)
            
            // Add container to root view
            rootView?.addView(container)
        }

        /**
         * Shows a styled validating sale view
         */
        private fun showValidatingSaleView(state: CustomerDisplayState.ValidatingSale, rootView: FrameLayout?) {
            // Main container with a light blue background
            val container = android.widget.LinearLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT
                )
                orientation = android.widget.LinearLayout.VERTICAL
                gravity = android.view.Gravity.CENTER_HORIZONTAL
                setPadding(20, 20, 20, 20) // Reduced padding
                background = android.graphics.drawable.GradientDrawable().apply {
                    orientation = android.graphics.drawable.GradientDrawable.Orientation.TOP_BOTTOM
                    colors = intArrayOf(
                        android.graphics.Color.parseColor("#FFFFFF"),
                        android.graphics.Color.parseColor("#F5F9FF")
                    )
                }
            }
            
            // Header section (more compact)
            val headerSection = android.widget.LinearLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 15) // Reduced margin
                }
                orientation = android.widget.LinearLayout.VERTICAL
                gravity = android.view.Gravity.CENTER
            }
            
            // Total price highlight box
            val priceHighlightBox = android.widget.LinearLayout(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                )
                orientation = android.widget.LinearLayout.HORIZONTAL
                gravity = android.view.Gravity.CENTER
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(android.graphics.Color.parseColor("#3366CC"))
                    cornerRadius = 15f
                }
                setPadding(20, 10, 20, 10) // Reduced padding
            }
            
            val totalPriceValue = android.widget.TextView(context).apply {
                text = "GESAMTBETRAG: ${state.totalPrice} €"
                textSize = 20f // Reduced text size
                setTextColor(android.graphics.Color.WHITE)
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                gravity = android.view.Gravity.CENTER
            }
            
            priceHighlightBox.addView(totalPriceValue)
            headerSection.addView(priceHighlightBox)
            
            // Add balance info if available (more compact)
            if (state.currentBalance.isNotEmpty() && state.currentBalance != "0") {
                val balanceInfoBox = android.widget.LinearLayout(context).apply {
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        setMargins(0, 10, 0, 0) // Reduced margin
                    }
                    orientation = android.widget.LinearLayout.HORIZONTAL // Side by side layout
                    gravity = android.view.Gravity.CENTER
                    background = android.graphics.drawable.GradientDrawable().apply {
                        setColor(android.graphics.Color.parseColor("#F0F0F0"))
                        cornerRadius = 10f
                    }
                    setPadding(15, 15, 15, 15)
                }
                
                // Current balance container (left side)
                val currentBalanceContainer = android.widget.LinearLayout(context).apply {
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        0,
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                        1f
                    )
                    orientation = android.widget.LinearLayout.VERTICAL
                    gravity = android.view.Gravity.CENTER
                }
                
                // Current balance label
                val currentBalanceText = android.widget.TextView(context).apply {
                    text = "Aktuelles Guthaben:"
                    textSize = 18f
                    setTextColor(android.graphics.Color.parseColor("#333333"))
                    gravity = android.view.Gravity.CENTER
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                    )
                }
                
                // Current balance value
                val currentBalanceValue = android.widget.TextView(context).apply {
                    text = "${state.currentBalance} €"
                    textSize = 22f // Large value
                    typeface = android.graphics.Typeface.DEFAULT_BOLD
                    setTextColor(android.graphics.Color.parseColor("#333333"))
                    gravity = android.view.Gravity.CENTER
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        setMargins(0, 5, 0, 0)
                    }
                }
                
                // Add current balance components to container
                currentBalanceContainer.addView(currentBalanceText)
                currentBalanceContainer.addView(currentBalanceValue)
                balanceInfoBox.addView(currentBalanceContainer)
                
                // Add vertical separator if new balance is available
                if (state.newBalance != null) {
                    // Vertical separator
                    val separator = android.view.View(context).apply {
                        layoutParams = android.widget.LinearLayout.LayoutParams(
                            1, // 1px width
                            android.widget.LinearLayout.LayoutParams.MATCH_PARENT
                        ).apply {
                            setMargins(15, 10, 15, 10)
                            height = 0 // Match parent with weight
                        }
                        setBackgroundColor(android.graphics.Color.parseColor("#DDDDDD"))
                    }
                    
                    balanceInfoBox.addView(separator)
                    
                    // New balance container (right side)
                    val newBalanceContainer = android.widget.LinearLayout(context).apply {
                        layoutParams = android.widget.LinearLayout.LayoutParams(
                            0,
                            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                            1f
                        )
                        orientation = android.widget.LinearLayout.VERTICAL
                        gravity = android.view.Gravity.CENTER
                    }
                    
                    // New balance label
                    val newBalanceText = android.widget.TextView(context).apply {
                        text = "Neues Guthaben:"
                        textSize = 18f
                        setTextColor(android.graphics.Color.parseColor("#4CAF50"))
                        gravity = android.view.Gravity.CENTER
                        layoutParams = android.widget.LinearLayout.LayoutParams(
                            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                        )
                    }
                    
                    // New balance value
                    val newBalanceValue = android.widget.TextView(context).apply {
                        text = "${state.newBalance} €"
                        textSize = 24f // Larger value
                        typeface = android.graphics.Typeface.DEFAULT_BOLD
                        setTextColor(android.graphics.Color.parseColor("#4CAF50"))
                        gravity = android.view.Gravity.CENTER
                        layoutParams = android.widget.LinearLayout.LayoutParams(
                            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                        ).apply {
                            setMargins(0, 5, 0, 0)
                        }
                    }
                    
                    // Add new balance components to container
                    newBalanceContainer.addView(newBalanceText)
                    newBalanceContainer.addView(newBalanceValue)
                    balanceInfoBox.addView(newBalanceContainer)
                }
                
                headerSection.addView(balanceInfoBox)
            }
            
            // Add header to container
            container.addView(headerSection)
            
            // Products list section (if available)
            if (state.products.isNotEmpty()) {
                // Compact title for products
                val productsTitle = android.widget.TextView(context).apply {
                    text = "Produkte:"
                    textSize = 16f // Reduced text size
                    setTextColor(android.graphics.Color.parseColor("#333333"))
                    typeface = android.graphics.Typeface.DEFAULT_BOLD
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        setMargins(0, 5, 0, 5) // Minimal margins
                    }
                }
                
                // Scrollable container for products - increase weight to take available space
                val scrollView = android.widget.ScrollView(context).apply {
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                        0,  // Height 0 with weight
                        1.0f // Take all available space
                    )
                }
                
                // Product list container - more compact
                val productsList = android.widget.LinearLayout(context).apply {
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                    )
                    orientation = android.widget.LinearLayout.VERTICAL
                    background = android.graphics.drawable.GradientDrawable().apply {
                        setColor(android.graphics.Color.WHITE)
                        cornerRadius = 8f // Smaller radius
                        setStroke(1, android.graphics.Color.parseColor("#DDDDDD"))
                    }
                }
                
                // Add each product (more compact rows)
                state.products.forEachIndexed { index, product ->
                    val productRow = android.widget.LinearLayout(context).apply {
                        layoutParams = android.widget.LinearLayout.LayoutParams(
                            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                        )
                        orientation = android.widget.LinearLayout.HORIZONTAL
                        setPadding(10, 6, 10, 6) // Smaller padding
                        
                        // Add alternating background colors
                        if (index % 2 == 0) {
                            setBackgroundColor(android.graphics.Color.parseColor("#F9F9F9"))
                        }
                    }
                    
                    val productName = android.widget.TextView(context).apply {
                        text = product.first
                        textSize = 16f // Smaller text
                        setTextColor(android.graphics.Color.parseColor("#333333"))
                        layoutParams = android.widget.LinearLayout.LayoutParams(
                            0,
                            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                            1f
                        )
                        ellipsize = android.text.TextUtils.TruncateAt.END
                        maxLines = 1
                    }
                    
                    val productQuantity = android.widget.TextView(context).apply {
                        text = product.second
                        textSize = 16f // Smaller text
                        setTextColor(android.graphics.Color.parseColor("#3366CC"))
                        typeface = android.graphics.Typeface.DEFAULT_BOLD
                        gravity = android.view.Gravity.END
                        layoutParams = android.widget.LinearLayout.LayoutParams(
                            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                        )
                    }
                    
                    productRow.addView(productName)
                    productRow.addView(productQuantity)
                    productsList.addView(productRow)
                }
                
                scrollView.addView(productsList)
                
                container.addView(productsTitle)
                container.addView(scrollView)
            }
            
            // Add the container to the root view
            rootView?.addView(container)
        }
    }
}

/**
 * These Compose functions are not used in the current implementation but kept for reference
 * in case we want to revert to a Compose-based approach in the future.
 */
@Composable
private fun WelcomeScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Welcome",
            fontSize = 32.sp,
            color = MaterialTheme.colors.primary
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "Please scan your tag or make a selection",
            fontSize = 24.sp
        )
    }
}

@Composable
private fun SaleCompletedScreen(sale: CompletedSale) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Purchase Complete",
            fontSize = 32.sp,
            color = MaterialTheme.colors.primary,
            modifier = Modifier.padding(bottom = 32.dp)
        )

        ProductConfirmItem(
            name = "Total Price",
            price = sale.totalPrice,
            bigStyle = true,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        if (sale.newBalance != null) {
            ProductConfirmItem(
                name = "New Balance",
                price = sale.newBalance,
                bigStyle = true,
                modifier = Modifier.padding(bottom = 16.dp)
            )
        }

        if (sale.newVoucherBalance > 0) {
            ProductConfirmItem(
                name = "Remaining Vouchers",
                quantity = sale.newVoucherBalance.intValue(),
                modifier = Modifier.padding(bottom = 16.dp)
            )
        }
    }
}

@Composable
private fun TopUpCompletedScreen(newBalance: String, topUpAmount: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Top-Up Complete",
            fontSize = 32.sp,
            color = MaterialTheme.colors.primary,
            modifier = Modifier.padding(bottom = 32.dp)
        )

        Text(
            text = "Amount Added: $topUpAmount",
            fontSize = 24.sp,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        Text(
            text = "New Balance: $newBalance",
            fontSize = 28.sp,
            color = MaterialTheme.colors.primary,
            modifier = Modifier.padding(top = 16.dp)
        )
    }
} 