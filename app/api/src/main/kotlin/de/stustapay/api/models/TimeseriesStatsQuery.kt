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
 * @param fromTime 
 * @param toTime 
 */
@Serializable

data class TimeseriesStatsQuery (

    @Contextual @SerialName(value = "from_time")
    val fromTime: java.time.OffsetDateTime?,

    @Contextual @SerialName(value = "to_time")
    val toTime: java.time.OffsetDateTime?

) {


}

