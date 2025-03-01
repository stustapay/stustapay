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

import de.stustapay.api.models.UserTagSecret

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import kotlinx.serialization.Contextual

/**
 * 
 *
 * @param sumupAffiliateKey 
 * @param sumupApiKey 
 * @param sumupApiKeyExpiresAt 
 * @param userTagSecret 
 */
@Serializable

data class TerminalSecrets (

    @SerialName(value = "sumup_affiliate_key")
    val sumupAffiliateKey: kotlin.String,

    @SerialName(value = "sumup_api_key")
    val sumupApiKey: kotlin.String,

    @Contextual @SerialName(value = "sumup_api_key_expires_at")
    val sumupApiKeyExpiresAt: java.time.OffsetDateTime?,

    @SerialName(value = "user_tag_secret")
    val userTagSecret: UserTagSecret

) {


}

