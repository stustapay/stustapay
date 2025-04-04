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

import de.stustapay.api.models.UserRoleInfo

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import kotlinx.serialization.Contextual

/**
 * 
 *
 * @param login 
 * @param displayName 
 * @param userTagUid 
 * @param nodeId 
 * @param id 
 * @param assignedRoles 
 * @param userTagUidHex 
 * @param userTagPin 
 * @param description 
 * @param userTagId 
 * @param transportAccountId 
 * @param cashRegisterId 
 * @param cashRegisterName 
 * @param cashDrawerBalance 
 * @param transportAccountBalance 
 */
@Serializable

data class UserInfo (

    @SerialName(value = "login")
    val login: kotlin.String,

    @SerialName(value = "display_name")
    val displayName: kotlin.String,

    @SerialName(value = "user_tag_uid")
    val userTagUid: @Contextual com.ionspin.kotlin.bignum.integer.BigInteger,

    @SerialName(value = "node_id")
    val nodeId: @Contextual com.ionspin.kotlin.bignum.integer.BigInteger,

    @SerialName(value = "id")
    val id: @Contextual com.ionspin.kotlin.bignum.integer.BigInteger,

    @SerialName(value = "assigned_roles")
    val assignedRoles: kotlin.collections.List<UserRoleInfo>,

    @SerialName(value = "user_tag_uid_hex")
    val userTagUidHex: kotlin.String?,

    @SerialName(value = "user_tag_pin")
    val userTagPin: kotlin.String? = null,

    @SerialName(value = "description")
    val description: kotlin.String? = null,

    @SerialName(value = "user_tag_id")
    val userTagId: @Contextual com.ionspin.kotlin.bignum.integer.BigInteger? = null,

    @SerialName(value = "transport_account_id")
    val transportAccountId: @Contextual com.ionspin.kotlin.bignum.integer.BigInteger? = null,

    @SerialName(value = "cash_register_id")
    val cashRegisterId: @Contextual com.ionspin.kotlin.bignum.integer.BigInteger? = null,

    @SerialName(value = "cash_register_name")
    val cashRegisterName: kotlin.String? = null,

    @Contextual @SerialName(value = "cash_drawer_balance")
    val cashDrawerBalance: kotlin.Double? = null,

    @Contextual @SerialName(value = "transport_account_balance")
    val transportAccountBalance: kotlin.Double? = null

) {


}

