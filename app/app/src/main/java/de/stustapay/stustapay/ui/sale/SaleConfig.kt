package de.stustapay.stustapay.ui.sale

import de.stustapay.api.models.TerminalTillConfig


/**
 * button available for purchase.
 */
data class SaleItemConfig(
    val id: Int,
    val caption: String,
    val price: SaleItemPrice,
    val returnable: Boolean,
)


/**
 * What can be ordered?
 */
sealed interface SaleConfig {
    /**
     * Can we create a new order?
     */
    object NotReady : SaleConfig

    data class Ready(
        /**
         * How the till configuration is named.
         */
        var tillName: String = "",

        /**
         * available product buttons, in order from top to bottom.
         */
        var buttons: Map<Int, SaleItemConfig> = mapOf(),

        var till: TerminalTillConfig,
    ) : SaleConfig
}