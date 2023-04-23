package de.stustanet.stustapay.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable


/**
 * TopOpType enum from core model.
 */
@Serializable
enum class TopUpType {
    @SerialName("cash")
    Cash,

    @SerialName("sumup")
    SumUp,
}


/**
 * NewTopUp class from core model.
 */
@Serializable
data class NewTopUp(
    val amount: Double,
    val customer_tag_uid: ULong,
    val topup_type: TopUpType,
    val uuid: String? = null,
)

/**
 * PendingTopUp class from core model.
 */
@Serializable
data class PendingTopUp(
    // NewTopUp
    val amount: Double,
    val customer_tag_uid: ULong,
    val topup_type: TopUpType,
    val uuid: String? = null,
    // PendingTopUp
    val old_balance: Double,
    val new_balance: Double,
    val customer_account_id: Int,
)

/**
 * CompletedTopUp class from core model.
 */
@Serializable
data class CompletedTopUp(
    val topup_type: TopUpType,

    val customer_tag_uid: ULong,
    val customer_account_id: Int,

    val amount: Double,
    val old_balance: Double,
    val new_balance: Double,

    val uuid: String,
    val booked_at: String,

    val cashier_id: Int,
    val till_id: Int,
)


/**
 * Button class from core model.
 * either quantity or price must be specified.
 */
@Serializable
data class Button(
    val till_button_id: Int,
    var quantity: Int? = null,
    var price: Double? = null,
) {
    init {
        require((quantity != null) != (price != null)) {
            "either price or quantity must be set"
        }
    }
}

/**
 * NewSale class defined in core model.
 */
@Serializable
data class NewSale(
    val buttons: List<Button>,
    val customer_tag_uid: ULong,
    val used_vouchers: Int? = null,
)

/**
 * PendingLineItem from core model.
 */
@Serializable
data class PendingLineItem(
    val quantity: Int,
    val product: Product,
    // the following members are also in Product, but maybe they were updated in the meantime
    val product_price: Double,
    val tax_name: String,
    val tax_rate: Double,
)


/**
 * Returned once we create an order.
 * PendingSale class defined in core model.
 */
@Serializable
data class PendingSale(
    val buttons: List<Button>,
    val old_balance: Double,
    val new_balance: Double,
    val old_voucher_balance: Int,
    val new_voucher_balance: Int,
    val customer_account_id: Int,
    val line_items: List<PendingLineItem>,
    val used_vouchers: Int,
    val item_count: Int,
    val total_price: Double,
)


/**
 * Returned once the order is booked.
 * CompletedSale class defined in core model.
 */
@Serializable
data class CompletedSale(
    // PendingSale
    val buttons: List<Button>,
    val old_balance: Double,
    val new_balance: Double,
    val old_voucher_balance: Int,
    val new_voucher_balance: Int,
    val customer_account_id: Int,
    val line_items: List<PendingLineItem>,
    val used_vouchers: Int,
    val item_count: Int,
    val total_price: Double,

    // CompletedSale
    val id: Int,
    val uuid: String,
    val booked_at: String,
    val cashier_id: Int,
    val till_id: Int,
)


/**
 * LineItem from core model.
 */
@Serializable
data class LineItem(
    // PendingLineItem
    val quantity: Int,
    val product: Product,
    val product_price: Double,
    val tax_name: String,
    val tax_rate: Double,

    // LineItem
    val item_id: Int,
    val total_tax: Double,
)


/**
 * Returned when listing past orders.
 * Order from core model.
 */
@Serializable
data class Order(
    val id: Int,
    val uuid: String,
    val total_price: Double,
    val total_tax: Double,
    val total_no_tax: Double,
    val booked_at: String,
    val payment_method: String?,
    //val order_type: OrderType, // TODO unify topup and orders?
    val cashier_id: Int,
    val till_id: Int,
    val customer_account_id: Int,
    val line_items: List<LineItem>,
)