package de.stustanet.stustapay.model

import kotlinx.serialization.Serializable

/**
 * Ticket class from base model
 */
@Serializable
data class Ticket(
    // NewTicket
    val name: String,
    val description: String? = null,
    val product_id: Int,
    val initial_top_up_amount: Double,
    val restriction: ProductRestriction? = null,

    // Ticket
    val id: Int,
    val product_name: String,
    val price: Double,
    val tax_name: String,
    val tax_rate: Double,
    val total_price: Double,
)