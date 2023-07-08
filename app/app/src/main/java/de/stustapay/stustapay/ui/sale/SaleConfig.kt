package de.stustapay.stustapay.ui.sale


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
data class SaleConfig(
    /**
     * Can we create a new order?
     */
    var ready: Boolean = false,

    /**
     * How the till configuration is named.
     */
    var tillName: String = "",

    /**
     * available product buttons, in order from top to bottom.
     */
    var buttons: Map<Int, SaleItemConfig> = mapOf(),
)