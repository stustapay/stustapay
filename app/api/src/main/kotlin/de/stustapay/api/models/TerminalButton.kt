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


import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import kotlinx.serialization.Contextual

/**
 * 
 *
 * @param id 
 * @param name 
 * @param price 
 * @param isReturnable 
 * @param fixedPrice 
 * @param defaultPrice 
 * @param priceInVouchers 
 * @param pricePerVoucher 
 */
@Serializable

data class TerminalButton (

    @SerialName(value = "id")
    val id: @Contextual com.ionspin.kotlin.bignum.integer.BigInteger,

    @SerialName(value = "name")
    val name: kotlin.String,

    @Contextual @SerialName(value = "price")
    val price: kotlin.Double?,

    @SerialName(value = "is_returnable")
    val isReturnable: kotlin.Boolean,

    @SerialName(value = "fixed_price")
    val fixedPrice: kotlin.Boolean,

    @Contextual @SerialName(value = "default_price")
    val defaultPrice: kotlin.Double? = null,

    @SerialName(value = "price_in_vouchers")
    val priceInVouchers: @Contextual com.ionspin.kotlin.bignum.integer.BigInteger? = null,

    @Contextual @SerialName(value = "price_per_voucher")
    val pricePerVoucher: kotlin.Double? = null

)
