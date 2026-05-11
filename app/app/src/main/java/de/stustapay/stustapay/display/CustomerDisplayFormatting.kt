package de.stustapay.stustapay.display

import java.text.NumberFormat
import java.util.Locale

internal fun formatCustomerDisplayAmountValue(amount: Double, locale: Locale): String {
    return NumberFormat.getNumberInstance(locale).apply {
        minimumFractionDigits = 2
        maximumFractionDigits = 2
    }.format(amount)
}

internal fun formatCustomerDisplayAmount(amount: Double, locale: Locale): String {
    return "${formatCustomerDisplayAmountValue(amount, locale)} €"
}
