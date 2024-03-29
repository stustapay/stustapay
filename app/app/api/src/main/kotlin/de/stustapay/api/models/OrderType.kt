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


import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * 
 *
 * Values: sale,cancelSale,topUp,payOut,ticket,moneyTransfer,moneyTransferImbalance
 */
@Serializable
enum class OrderType(val value: kotlin.String) {

    @SerialName(value = "sale")
    sale("sale"),

    @SerialName(value = "cancel_sale")
    cancelSale("cancel_sale"),

    @SerialName(value = "top_up")
    topUp("top_up"),

    @SerialName(value = "pay_out")
    payOut("pay_out"),

    @SerialName(value = "ticket")
    ticket("ticket"),

    @SerialName(value = "money_transfer")
    moneyTransfer("money_transfer"),

    @SerialName(value = "money_transfer_imbalance")
    moneyTransferImbalance("money_transfer_imbalance");

    /**
     * Override [toString()] to avoid using the enum variable name as the value, and instead use
     * the actual value defined in the API spec file.
     *
     * This solves a problem when the variable name and its value are different, and ensures that
     * the client sends the correct enum values to the server always.
     */
    override fun toString(): kotlin.String = value

    companion object {
        /**
         * Converts the provided [data] to a [String] on success, null otherwise.
         */
        fun encode(data: kotlin.Any?): kotlin.String? = if (data is OrderType) "$data" else null

        /**
         * Returns a valid [OrderType] for [data], null otherwise.
         */
        fun decode(data: kotlin.Any?): OrderType? = data?.let {
          val normalizedData = "$it".lowercase()
          values().firstOrNull { value ->
            it == value || normalizedData == "$value".lowercase()
          }
        }
    }
}

