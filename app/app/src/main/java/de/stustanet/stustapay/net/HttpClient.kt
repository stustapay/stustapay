package de.stustanet.stustapay.net

import android.util.Log
import de.stustanet.stustapay.model.RegistrationState
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.logging.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json

class HttpClient(
    retry: Boolean = false,
    logRequests: Boolean = true,
    val registrationState: suspend () -> RegistrationState
) {
    val httpClient = HttpClient(CIO) {

        // automatic json conversions
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }

        if (retry) {
            install(HttpRequestRetry) {
                // retry for http500 errors
                retryOnServerErrors(maxRetries = 5)
                retryOnException(maxRetries = 3, retryOnTimeout = true)
                exponentialDelay()
            }
        }

        install(HttpTimeout) {
            connectTimeoutMillis = 2000
            requestTimeoutMillis = 3000
            socketTimeoutMillis = 3000
        }

        if (logRequests) {
            install(Logging) {
                level = LogLevel.ALL
                logger = object : Logger {
                    override fun log(message: String) {
                        Log.d("StuStaPay req", message)
                    }
                }
            }
        }

        // we use the transformRequest below for this.
        expectSuccess = false

        install(Logging)
    }


    /**
     * send a http get/post/... request using the current registration token.
     * @param apiBasePath overrides api base path from registration, and if given, no bearer token is sent.
     */
    suspend inline fun <reified I, reified O> request(
        path: String,
        method: HttpMethod,
        options: HttpRequestBuilder.() -> Unit = {},
        apiBasePath: String? = null,
        noinline body: (() -> I)? = null,
    ): Response<O> {

        try {
            Log.d("StuStaPay", "request ${method.value} to $path")

            val regState = registrationState()
            val apiBase: String

            var token: String? = null

            when (regState) {
                is RegistrationState.Registered -> {
                    apiBase = apiBasePath ?: regState.apiUrl
                    if (apiBasePath == null) {
                        token = regState.token
                    }
                }
                is RegistrationState.Error -> {
                    if (apiBasePath == null) {
                        return Response.Error.Request(regState.message)
                    } else {
                        apiBase = apiBasePath
                    }
                }
                is RegistrationState.NotRegistered -> {
                    if (apiBasePath == null) {
                        return Response.Error.Access("terminal not registered: ${regState.message}")
                    } else {
                        apiBase = apiBasePath
                    }
                }
            }

            val response: HttpResponse = httpClient.request {
                this.method = method

                contentType(ContentType.Application.Json)

                url("${apiBase}/${path}")

                if (token != null) {
                    headers {
                        append(HttpHeaders.Authorization, "Bearer ${token}")
                    }
                }

                options()
                if (body != null) {
                    setBody(body())
                }
            }
            return transformResponse(response)
        } catch (e: Exception) {
            Log.e(
                "StuStaPay",
                "http request error: $path: ${e.localizedMessage}\n${e.stackTraceToString()}"
            )
            return Response.Error.Request(null, e)
        }
    }

    suspend inline fun <reified I, reified O> post(
        path: String,
        options: HttpRequestBuilder.() -> Unit = {},
        basePath: String? = null,
        noinline body: (() -> I)? = null
    ): Response<O> {
        return request(path, HttpMethod.Post, options, basePath, body)
    }

    suspend inline fun <reified O> get(
        path: String,
        options: HttpRequestBuilder.() -> Unit = {},
        basePath: String? = null,
    ): Response<O> {
        return request<Any, O>(path, HttpMethod.Get, options, basePath, null)
    }
}