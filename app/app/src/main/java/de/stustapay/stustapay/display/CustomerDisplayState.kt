package de.stustapay.stustapay.display

import de.stustapay.api.models.CompletedSale

/**
 * State displayed on the customer-facing screen
 */
sealed class CustomerDisplayState {
    data object Welcome : CustomerDisplayState()
    data object ScanChip : CustomerDisplayState()
    data class SaleCompleted(val sale: CompletedSale) : CustomerDisplayState()
    data class TopUpCompleted(val newBalance: String, val topUpAmount: String) : CustomerDisplayState()
    data class ValidatingSale(
        val totalPrice: String,
        val currentBalance: String,
        val newBalance: String? = null,
        val products: List<Pair<String, String>> = emptyList(),
    ) : CustomerDisplayState()
    data class InsufficientFunds(val totalPrice: String, val currentBalance: String) : CustomerDisplayState()
}
