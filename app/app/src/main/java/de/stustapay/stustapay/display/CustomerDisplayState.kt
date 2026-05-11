package de.stustapay.stustapay.display

import de.stustapay.api.models.CompletedSale

/**
 * State displayed on the customer-facing screen
 */
sealed class CustomerDisplayState {
    data object Welcome : CustomerDisplayState()
    data object ScanChip : CustomerDisplayState()
    data class AccountBalance(
        val accountName: String?,
        val balance: Double,
        val voucherCount: String? = null,
    ) : CustomerDisplayState()
    data class SaleCompleted(val sale: CompletedSale) : CustomerDisplayState()
    data class TopUpCompleted(val newBalance: Double, val topUpAmount: Double) : CustomerDisplayState()
    data class ValidatingSale(
        val totalPrice: Double,
        val currentBalance: Double? = null,
        val newBalance: Double? = null,
        val products: List<Pair<String, String>> = emptyList(),
    ) : CustomerDisplayState()
    data class InsufficientFunds(val totalPrice: Double, val currentBalance: Double) : CustomerDisplayState()
}
