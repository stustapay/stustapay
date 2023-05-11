package de.stustanet.stustapay.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable


/**
 * TopUpType enum from core model.
 */
@Serializable
enum class PaymentMethod {
    @SerialName("cash")
    Cash,

    @SerialName("sumup")
    SumUp,

    @SerialName("tag")
    Tag,
}


/**
 * NewTopUp class from core model.
 */
@Serializable
data class NewTopUp(
    val amount: Double,
    val customer_tag_uid: ULong,
    val payment_method: PaymentMethod,
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
    val payment_method: PaymentMethod,
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
    val payment_method: PaymentMethod,

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
 * NewPayOut class from core model.
 */
@Serializable
data class NewPayOut(
    val customer_tag_uid: Int,
    // if no amount is passed, the current customer account balance is assumed as payout
    val amount: Double? = null,
)


/**
 * PendingPayOut class from core model.
 */
@Serializable
data class PendingPayOut(
    // NewPayOut
    val customer_tag_uid: Int,

    // PendingPayOut
    val amount: Double,
    val customer_account_id: Int,
    val old_balance: Double,
    val new_balance: Double,
)


/**
 * CompletedPayOut class from core model.
 */
@Serializable
data class CompletedPayOut(
    val customer_tag_uid: Int,
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
 * Ticket class from core model.
 */
@Serializable
data class Ticket(
    val till_button_id: Int,
    val quantity: Int,
)

/**
 * To create a new ticket.
 * NewTicketSale class from core model.
 */
@Serializable
data class NewTicketSale(
    val uuid: String? = null,
    val customer_tag_uids: List<ULong>,
    val tickets: List<Ticket>,
    val payment_method: PaymentMethod,
)


/**
 * When a new ticket sale was checked.
 * PendingTicketSale class from core model.
 */
@Serializable
data class PendingTicketSale(
    // NewTicketSale
    val uuid: String? = null,
    val customer_tag_uids: List<ULong>,
    val payment_method: PaymentMethod,
    // PendingTicketSale
    val line_items: List<PendingLineItem>,
    val total_price: Double,
)

/**
 * When a ticket was sold.
 * CompletedTicketSale
 */
@Serializable
data class CompletedTicketSale(
    // NewTicketSale
    // val uuid: String? = null, // not null below
    val customer_tag_uids: List<ULong>,
    val payment_method: PaymentMethod,

    // PendingTicketSale
    val line_items: List<PendingLineItem>,
    val total_price: Double,

    // CompletedTicketSale
    val id: Int,
    val uuid: String,
    val booked_at: String,
    val customer_account_id: Int,
    val cashier_id: Int,
    val till_id: Int,
)


/**
 * LineItem from core model.
 */
@Serializable
data class LineItem(
    // PendingLineItem
    val quantity: Int = 0,
    val product: Product = Product(),
    val product_price: Double = 0.0,
    val tax_name: String = "",
    val tax_rate: Double = 0.0,

    // LineItem
    val item_id: Int = 0,
    val total_tax: Double = 0.0,
)


/**
 * OrderType enum from core model.
 */
@Serializable
enum class OrderType {
    @SerialName("sale")
    Sale,

    @SerialName("cancel_sale")
    CancelSale,

    @SerialName("top_up")
    Topup,

    @SerialName("pay_out")
    Payout,

    @SerialName("ticket")
    Ticket
}


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
    val order_type: OrderType,
    val cashier_id: Int,
    val till_id: Int,
    val customer_account_id: Int,
    val line_items: List<LineItem>,
)