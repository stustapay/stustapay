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

package de.stustapay.api.apis

import kotlinx.serialization.Contextual


import de.stustapay.api.models.RevenueStats
import de.stustapay.api.models.TimeseriesStatsQuery

import de.stustapay.api.infrastructure.*
import io.ktor.client.HttpClientConfig
import io.ktor.client.request.forms.formData
import io.ktor.client.engine.HttpClientEngine
import io.ktor.http.ParametersBuilder

    open class MgmtApi(
    baseUrl: String = ApiClient.BASE_URL,
    httpClientEngine: HttpClientEngine? = null,
    httpClientConfig: ((HttpClientConfig<*>) -> Unit)? = null,
    ) : ApiClient(
        baseUrl,
        httpClientEngine,
        httpClientConfig,
    ) {

        /**
        * Get revenue statistics for the current node
        * 
         * @param timeseriesStatsQuery  
         * @return RevenueStats
        */
            @Suppress("UNCHECKED_CAST")
        open suspend fun getRevenueStats(timeseriesStatsQuery: TimeseriesStatsQuery): HttpResponse<RevenueStats> {

            val localVariableAuthNames = listOf<String>("OAuth2PasswordBearer")

            val localVariableBody = timeseriesStatsQuery

            val localVariableQuery = mutableMapOf<String, List<String>>()

            val localVariableHeaders = mutableMapOf<String, String>()

            val localVariableConfig = RequestConfig<kotlin.Any?>(
            RequestMethod.POST,
            "/mgmtrevenue-stats",
            query = localVariableQuery,
            headers = localVariableHeaders,
            requiresAuthentication = true,
            )

            return jsonRequest(
            localVariableConfig,
            localVariableBody,
            localVariableAuthNames
            ).wrap()
            }

        }
