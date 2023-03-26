package de.stustanet.stustapay.model

import kotlinx.serialization.Serializable

/**
 * TillButton from core model.
 */
@Serializable
data class TillButton(
    val name: String,
    val product_ids: List<Int>,
    val id: Int,
    val price: Double,
)