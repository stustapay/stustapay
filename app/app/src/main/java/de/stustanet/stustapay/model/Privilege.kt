package de.stustanet.stustapay.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Privilege from core model.
 */
@Serializable
enum class Privilege {
    // general management
    @SerialName("account_management")
    account_management,

    @SerialName("cashier_management")
    cashier_management,

    @SerialName("config_management")
    config_management,

    @SerialName("product_management")
    product_management,

    @SerialName("tax_rate_management")
    tax_rate_management,

    @SerialName("user_management")
    user_management,

    @SerialName("till_management")
    till_management,

    @SerialName("order_management")
    order_management,

    // festival workflow privileges
    @SerialName("terminal_login")
    terminal_login,

    @SerialName("supervised_terminal_login")
    supervised_terminal_login,

    // festival order / ticket / voucher flow privileges
    // which orders are available (sale, ticket, ...) is determined by the terminal profile
    @SerialName("can_book_orders")
    can_book_orders,

    @SerialName("grant_free_tickets")
    grant_free_tickets,

    @SerialName("grant_vouchers")
    grant_vouchers,

}