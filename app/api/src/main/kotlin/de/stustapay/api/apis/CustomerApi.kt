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

import de.stustapay.api.models.Account

import de.stustapay.api.models.SwitchTagPayload

import de.stustapay.api.infrastructure.*
import io.ktor.client.HttpClientConfig
import io.ktor.client.request.forms.formData
import io.ktor.client.engine.HttpClientEngine
import io.ktor.http.ParametersBuilder

    open class CustomerApi(
    baseUrl: String = ApiClient.BASE_URL,
    httpClientEngine: HttpClientEngine? = null,
    httpClientConfig: ((HttpClientConfig<*>) -> Unit)? = null,
    ) : ApiClient(
        baseUrl,
        httpClientEngine,
        httpClientConfig,
    ) {

        /**
        * Obtain a customer by tag uid
        * 
         * @param customerTagUid  
         * @return Account
        */
            @Suppress("UNCHECKED_CAST")
        open suspend fun getCustomer(customerTagUid: @Contextual com.ionspin.kotlin.bignum.integer.BigInteger): HttpResponse<Account> {

            val localVariableAuthNames = listOf<String>("OAuth2PasswordBearer")

            val localVariableBody = 
                    io.ktor.client.utils.EmptyContent

            val localVariableQuery = mutableMapOf<String, List<String>>()

            val localVariableHeaders = mutableMapOf<String, String>()

            val localVariableConfig = RequestConfig<kotlin.Any?>(
            RequestMethod.GET,
            "/customer/{customer_tag_uid}".replace("{" + "customer_tag_uid" + "}", "$customerTagUid"),
            query = localVariableQuery,
            headers = localVariableHeaders,
            requiresAuthentication = true,
            )

            return request(
            localVariableConfig,
            localVariableBody,
            localVariableAuthNames
            ).wrap()
            }

        /**
        * Switch Tag
        * 
         * @param switchTagPayload  
         * @return void
        */
        open suspend fun switchTag(switchTagPayload: SwitchTagPayload): HttpResponse<Unit> {

            val localVariableAuthNames = listOf<String>("OAuth2PasswordBearer")

            val localVariableBody = switchTagPayload

            val localVariableQuery = mutableMapOf<String, List<String>>()

            val localVariableHeaders = mutableMapOf<String, String>()

            val localVariableConfig = RequestConfig<kotlin.Any?>(
            RequestMethod.POST,
            "/customer/switch_tag",
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
