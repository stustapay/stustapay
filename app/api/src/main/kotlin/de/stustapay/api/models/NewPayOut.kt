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
 * @param uuid 
 * @param customerTagUid 
 * @param amount 
 */
@Serializable

data class NewPayOut (

    @Contextual @SerialName(value = "uuid")
    val uuid: java.util.UUID,

    @SerialName(value = "customer_tag_uid")
    val customerTagUid: @Contextual com.ionspin.kotlin.bignum.integer.BigInteger,

    @Contextual @SerialName(value = "amount")
    val amount: kotlin.Double? = null

) {


}

