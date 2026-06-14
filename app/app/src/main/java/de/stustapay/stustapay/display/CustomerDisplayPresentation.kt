package de.stustapay.stustapay.display

import android.app.Presentation
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Typeface
import android.os.Bundle
import android.util.Log
import android.view.Display
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import de.stustapay.stustapay.R

private const val TAG = "CustomerDisplayPresentation"

class CustomerDisplayPresentation(
    context: Context,
    display: Display,
    private val resolveEventName: () -> String,
) : Presentation(context, display) {
    
    private var currentState: CustomerDisplayState = CustomerDisplayState.Welcome

    private fun text(id: Int, vararg args: Any): String {
        return if (args.isEmpty()) {
            context.getString(id)
        } else {
            context.getString(id, *args)
        }
    }

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
                val eventName = resolveEventName()
                
                text = text(R.string.customer_display_welcome_event, eventName)
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
            Log.w(TAG, "Customer display onCreate failed", e)
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
                is CustomerDisplayState.AccountBalance -> {
                    showAccountBalanceView(state, rootView)
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
            Log.w(TAG, "Customer display updateContent failed", e)
        }
    }

    /**
     * Shows a styled welcome view
     */
    private fun showWelcomeView(rootView: FrameLayout?) {
        // Get event name
        val eventName = resolveEventName()
        
        // Main container
        val container = android.widget.LinearLayout(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
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
            text = text(R.string.customer_display_welcome_title)
            textSize = 32f
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
            textSize = 48f
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
            text = text(R.string.customer_display_select_action)
            textSize = 34f
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
        val container = android.widget.LinearLayout(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            orientation = android.widget.LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setPadding(dp(28), dp(28), 0, dp(24))
            background = android.graphics.drawable.GradientDrawable().apply {
                orientation = android.graphics.drawable.GradientDrawable.Orientation.TOP_BOTTOM
                colors = intArrayOf(
                    android.graphics.Color.parseColor("#F9FBFF"),
                    android.graphics.Color.parseColor("#E2ECFF")
                )
            }
        }

        val card = android.widget.LinearLayout(context).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 0, 0)
            }
            orientation = android.widget.LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
            clipChildren = false
            clipToPadding = false
            background = android.graphics.drawable.GradientDrawable().apply {
                setColor(android.graphics.Color.WHITE)
                cornerRadius = dp(26).toFloat()
                setStroke(dp(2), android.graphics.Color.parseColor("#BFD1F3"))
            }
            setPadding(dp(26), dp(26), 0, dp(26))
        }

        val copyColumn = android.widget.LinearLayout(context).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            orientation = android.widget.LinearLayout.VERTICAL
        }

        val titleText = android.widget.TextView(context).apply {
            text = text(R.string.customer_display_scan_title)
            textSize = 38f
            setTextColor(android.graphics.Color.parseColor("#18386F"))
            typeface = Typeface.DEFAULT_BOLD
            setLineSpacing(0f, 1.02f)
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 0, dp(16))
            }
        }

        val instructionsText = android.widget.TextView(context).apply {
            text = text(R.string.customer_display_scan_instruction)
            textSize = 20f
            setTextColor(android.graphics.Color.parseColor("#44556B"))
            setLineSpacing(0f, 1.2f)
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 0, dp(12))
            }
        }

        copyColumn.addView(titleText)
        copyColumn.addView(instructionsText)

        val arrowText = android.widget.TextView(context).apply {
            text = "→"
            textSize = 72f
            setTextColor(android.graphics.Color.parseColor("#FFB74D"))
            typeface = Typeface.DEFAULT_BOLD
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(dp(18), 0, dp(10), 0)
            }
        }

        val iconPanel = android.widget.FrameLayout(context).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(dp(311), dp(445)).apply {
                setMargins(0, 0, -dp(52), 0)
            }
            background = android.graphics.drawable.GradientDrawable().apply {
                setColor(android.graphics.Color.parseColor("#0D1B2A"))
                cornerRadius = dp(24).toFloat()
            }
        }

        iconPanel.addView(NfcSymbolView(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                dp(148),
                dp(148),
                android.view.Gravity.CENTER
            ).apply {
                setMargins(0, 0, dp(18), 0)
            }
        })

        card.addView(copyColumn)
        card.addView(arrowText)
        card.addView(iconPanel)
        container.addView(card)
        rootView?.addView(container)
    }

    private fun dp(value: Int): Int {
        return (value * context.resources.displayMetrics.density).toInt()
    }

    private inner class NfcSymbolView(context: Context) : View(context) {
        private val circlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = android.graphics.Color.parseColor("#FFB74D")
            style = Paint.Style.FILL
        }

        private val arrowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = android.graphics.Color.parseColor("#0D1B2A")
            style = Paint.Style.FILL
        }

        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)

            val centerX = width / 2f
            val centerY = height / 2f
            val radius = minOf(width, height) * 0.34f
            canvas.drawCircle(centerX, centerY, radius, circlePaint)

            val path = Path().apply {
                moveTo(centerX - radius * 0.28f, centerY - radius * 0.10f)
                lineTo(centerX + radius * 0.38f, centerY - radius * 0.42f)
                lineTo(centerX + radius * 0.08f, centerY + radius * 0.36f)
                lineTo(centerX - radius * 0.02f, centerY + radius * 0.08f)
                lineTo(centerX - radius * 0.30f, centerY - radius * 0.02f)
                close()
            }
            canvas.drawPath(path, arrowPaint)
        }
    }

    private fun formatAmount(amount: Double): String {
        val locale = context.resources.configuration.locales[0]
        return formatCustomerDisplayAmount(amount, locale)
    }

    private fun formatAmountValue(amount: Double): String {
        val locale = context.resources.configuration.locales[0]
        return formatCustomerDisplayAmountValue(amount, locale)
    }

    /**
     * Shows the current account balance after a successful balance check.
     */
    private fun showAccountBalanceView(state: CustomerDisplayState.AccountBalance, rootView: FrameLayout?) {
        val container = android.widget.LinearLayout(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            orientation = android.widget.LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setPadding(40, 40, 40, 40)
            background = android.graphics.drawable.GradientDrawable().apply {
                orientation = android.graphics.drawable.GradientDrawable.Orientation.TOP_BOTTOM
                colors = intArrayOf(
                    android.graphics.Color.parseColor("#F3F8FF"),
                    android.graphics.Color.parseColor("#D9E7FF")
                )
            }
        }

        val balanceCard = android.widget.LinearLayout(context).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
            orientation = android.widget.LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            background = android.graphics.drawable.GradientDrawable().apply {
                setColor(android.graphics.Color.WHITE)
                cornerRadius = 28f
                setStroke(3, android.graphics.Color.parseColor("#C5D7FF"))
            }
            setPadding(36, 36, 36, 36)
        }

        val nameText = android.widget.TextView(context).apply {
            text = state.accountName
            textSize = 24f
            setTextColor(android.graphics.Color.parseColor("#23407A"))
            gravity = android.view.Gravity.CENTER
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            visibility = if (state.accountName.isNullOrBlank()) android.view.View.GONE else android.view.View.VISIBLE
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 0, 18)
            }
        }

        val labelText = android.widget.TextView(context).apply {
            text = text(R.string.customer_display_current_balance)
            textSize = 24f
            setTextColor(android.graphics.Color.parseColor("#5A6B85"))
            gravity = android.view.Gravity.CENTER
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 0, 14)
            }
        }

        val balanceText = android.widget.TextView(context).apply {
            text = formatAmount(state.balance)
            textSize = 54f
            setTextColor(android.graphics.Color.parseColor("#102B63"))
            gravity = android.view.Gravity.CENTER
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        balanceCard.addView(nameText)
        balanceCard.addView(labelText)
        balanceCard.addView(balanceText)

        state.voucherCount?.let { voucherCount ->
            val voucherText = android.widget.TextView(context).apply {
                text = "${text(R.string.customer_vouchers)}: $voucherCount"
                textSize = 22f
                setTextColor(android.graphics.Color.parseColor("#2B5E1A"))
                gravity = android.view.Gravity.CENTER
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(android.graphics.Color.parseColor("#E8F6DF"))
                    cornerRadius = 18f
                }
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 24, 0, 0)
                    gravity = android.view.Gravity.CENTER_HORIZONTAL
                }
                setPadding(24, 14, 24, 14)
            }
            container.addView(balanceCard)
            container.addView(voucherText)
        } ?: run {
            container.addView(balanceCard)
        }

        rootView?.addView(container)
    }

    /**
     * Shows the custom insufficient funds view
     */
    private fun showInsufficientFundsView(state: CustomerDisplayState.InsufficientFunds, rootView: FrameLayout?) {
        val totalPrice = state.totalPrice
        val currentBalance = state.currentBalance
        val missingAmount = (totalPrice - currentBalance).coerceAtLeast(0.0)
        
        // Create a box with red border for the error message
        val errorBox = android.widget.LinearLayout(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(50, 50, 50, 50)
                gravity = android.view.Gravity.CENTER
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
            text = text(R.string.customer_display_insufficient_funds_title)
            textSize = 32f
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
            text = text(R.string.customer_display_required_amount, totalPrice)
            textSize = 28f
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
            text = text(R.string.customer_display_available_balance, currentBalance)
            textSize = 28f
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
            text = text(R.string.customer_display_missing_amount, missingAmount)
            textSize = 30f
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
            text = text(R.string.customer_display_topup_needed)
            textSize = 26f
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
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
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
            ).apply {
                gravity = android.view.Gravity.CENTER
            }
        }
        
        // Completion text
        val titleText = android.widget.TextView(context).apply {
            text = text(R.string.customer_display_sale_completed)
            textSize = 34f
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
            text = text(R.string.customer_display_total_amount)
            textSize = 26f
            setTextColor(android.graphics.Color.parseColor("#333333"))
            layoutParams = android.widget.LinearLayout.LayoutParams(
                0,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                1f
            )
        }
        
        val totalPriceValue = android.widget.TextView(context).apply {
            text = formatAmount(state.sale.totalPrice)
            textSize = 26f
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
            text = text(R.string.customer_display_new_balance)
            textSize = 26f
            setTextColor(android.graphics.Color.parseColor("#333333"))
            layoutParams = android.widget.LinearLayout.LayoutParams(
                0,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                1f
            )
        }

        val newBalanceValue = android.widget.TextView(context).apply {
            text = formatAmount(state.sale.newBalance)
            textSize = 26f
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
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
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
            text = text(R.string.customer_display_topup_completed)
            textSize = 34f
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
            text = text(R.string.customer_display_topup_amount)
            textSize = 26f
            setTextColor(android.graphics.Color.parseColor("#333333"))
            layoutParams = android.widget.LinearLayout.LayoutParams(
                0,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                1f
            )
        }
        
        val topUpAmountValue = android.widget.TextView(context).apply {
            text = formatAmount(state.topUpAmount)
            textSize = 26f
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
            text = text(R.string.customer_display_new_balance)
            textSize = 26f
            setTextColor(android.graphics.Color.parseColor("#333333"))
            layoutParams = android.widget.LinearLayout.LayoutParams(
                0,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                1f
            )
        }
        
        val newBalanceValue = android.widget.TextView(context).apply {
            text = formatAmount(state.newBalance)
            textSize = 26f
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
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
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
            text = text(R.string.customer_display_sale_total_highlight, formatAmountValue(state.totalPrice))
            textSize = 28f
            setTextColor(android.graphics.Color.WHITE)
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            gravity = android.view.Gravity.CENTER
        }
        
        priceHighlightBox.addView(totalPriceValue)
        headerSection.addView(priceHighlightBox)
        
        // Add balance info if available (more compact)
        if (state.currentBalance != null) {
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
                text = text(R.string.customer_display_current_balance)
                textSize = 26f
                setTextColor(android.graphics.Color.parseColor("#333333"))
                gravity = android.view.Gravity.CENTER
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                )
            }
            
            // Current balance value
            val currentBalanceValue = android.widget.TextView(context).apply {
                text = formatAmount(state.currentBalance)
                textSize = 30f
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
                    text = text(R.string.customer_display_new_balance)
                    textSize = 26f
                    setTextColor(android.graphics.Color.parseColor("#4CAF50"))
                    gravity = android.view.Gravity.CENTER
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                    )
                }
                
                // New balance value
                val newBalanceValue = android.widget.TextView(context).apply {
                    text = formatAmount(state.newBalance)
                    textSize = 32f
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
                text = text(R.string.customer_display_products)
                textSize = 24f
                setTextColor(android.graphics.Color.parseColor("#333333"))
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 5, 0, 5)
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
                    textSize = 24f
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
                    textSize = 24f
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
