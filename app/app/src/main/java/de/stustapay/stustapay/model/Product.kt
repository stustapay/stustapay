package de.stustapay.stustapay.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

@Serializable
enum class ProductRestriction() {
    @SerialName("under_16")
    Under16,

    @SerialName("under_18")
    Under18,
}

/**
 * Product from core schema.
 */
@Serializable
data class Product(
    // NewProduct
    val name: String = "",
    val price: Double? = null,
    val fixed_price: Boolean = true,
    val price_in_vouchers: Int? = null,
    val tax_name: String = "",
    val restrictions: List<ProductRestriction> = listOf(),
    val is_locked: Boolean = false,
    val is_returnable: Boolean = false,
    val target_account_id: Int? = null,

    // Product
    val id: Int = 0,
    val tax_rate: Double = 0.0,
)