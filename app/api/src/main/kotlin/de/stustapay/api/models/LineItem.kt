/**
 *
 * Please note:
 * This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * Do not edit this file manually.
 *
 */

@file:Suppress(
    "ArrayInDataClass",
    "EnumEntryName",
    "RemoveRedundantQualifierName",
    "UnusedImport"
)

package de.stustapay.api.models

import de.stustapay.api.models.Product

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import kotlinx.serialization.Contextual

/**
 * 
 *
 * @param quantity 
 * @param product 
 * @param productPrice 
 * @param taxRateId 
 * @param taxName 
 * @param taxRate 
 * @param itemId 
 * @param totalTax 
 * @param totalPrice 
 */
@Serializable

data class LineItem (

    @SerialName(value = "quantity")
    val quantity: @Contextual com.ionspin.kotlin.bignum.integer.BigInteger,

    @SerialName(value = "product")
    val product: Product,

    @Contextual @SerialName(value = "product_price")
    val productPrice: kotlin.Double,

    @SerialName(value = "tax_rate_id")
    val taxRateId: @Contextual com.ionspin.kotlin.bignum.integer.BigInteger,

    @SerialName(value = "tax_name")
    val taxName: kotlin.String,

    @Contextual @SerialName(value = "tax_rate")
    val taxRate: kotlin.Double,

    @SerialName(value = "item_id")
    val itemId: @Contextual com.ionspin.kotlin.bignum.integer.BigInteger,

    @Contextual @SerialName(value = "total_tax")
    val totalTax: kotlin.Double,

    @Contextual @SerialName(value = "total_price")
    val totalPrice: kotlin.Double

)
