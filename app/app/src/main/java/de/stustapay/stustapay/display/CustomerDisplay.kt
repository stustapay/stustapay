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
                
                // Handle InsufficientFunds separately with a custom view
                if (state is CustomerDisplayState.InsufficientFunds) {
                    showInsufficientFundsView(state, rootView)
                    return
                }
                
                // Get event name from TerminalConfig
                val eventName = getEventName()
                
                // Create a TextView to display the content
                val textView = android.widget.TextView(context).apply {
                    layoutParams = FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT, 
                        FrameLayout.LayoutParams.MATCH_PARENT
                    )
                    gravity = android.view.Gravity.CENTER
                    textSize = 24f
                    setTextColor(android.graphics.Color.BLACK)
                    
                    // Set the appropriate text based on the state
                    when (state) {
                        is CustomerDisplayState.Welcome -> {
                            text = "Willkommen bei $eventName\n\nBitte treffen Sie eine Auswahl"
                        }
                        is CustomerDisplayState.ScanChip -> {
                            text = "Bitte scannen Sie Ihren Chip/Tag\n\nHalten Sie Ihren Chip an das Lesegerät"
                        }
                        is CustomerDisplayState.SaleCompleted -> {
                            text = "Kauf abgeschlossen\n\nGesamtbetrag: ${state.sale.totalPrice}" + 
                                  (state.sale.newBalance?.let { "\n\nNeues Guthaben: $it" } ?: "")
                        }
                        is CustomerDisplayState.TopUpCompleted -> {
                            text = "Aufladung abgeschlossen\n\nAufgeladener Betrag: ${state.topUpAmount}\n\nNeues Guthaben: ${state.newBalance}"
                        }
                        is CustomerDisplayState.ValidatingSale -> {
                            val productsText = if (state.products.isNotEmpty()) {
                                "\n\nProdukte:\n" + state.products.joinToString("\n") { "${it.first}: ${it.second}" }
                            } else {
                                ""
                            }
                            
                            // If we're in validation mode (with balance info), show full details
                            if (state.currentBalance.isNotEmpty()) {
                                val newBalanceText = if (state.newBalance != null) {
                                    "\nNeues Guthaben: ${state.newBalance} €"
                                } else {
                                    ""
                                }
                                text = "Validierung läuft...\n\nGESAMTBETRAG: ${state.totalPrice} €\nAktuelles Guthaben: ${state.currentBalance} €$newBalanceText$productsText"
                            } else {
                                // Otherwise just show products and total price for typing in products
                                text = "GESAMTBETRAG: ${state.totalPrice} €$productsText"
                            }
                        }
                        else -> {
                            text = "Unbekannter Status"
                        }
                    }
                }
                
                // Add the TextView to the root view
                rootView?.addView(textView)
                
            } catch (e: Exception) {
                // Handle any exceptions
                e.printStackTrace()
            }
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