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
 * @param oldUserTagPin 
 * @param newUserTagUid 
 * @param newUserTagPin 
 * @param comment 
 */
@Serializable

data class SwitchTagPayload (

    @SerialName(value = "old_user_tag_pin")
    val oldUserTagPin: kotlin.String,

    @SerialName(value = "new_user_tag_uid")
    val newUserTagUid: @Contextual com.ionspin.kotlin.bignum.integer.BigInteger,

    @SerialName(value = "new_user_tag_pin")
    val newUserTagPin: kotlin.String,

    @SerialName(value = "comment")
    val comment: kotlin.String

) {


}

