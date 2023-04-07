package de.stustanet.stustapay.net

import io.ktor.client.call.*
import io.ktor.client.statement.*
import kotlinx.serialization.Serializable

/**
 * Convert errors and exceptions into responses.
 * Format is defined in the api server's exception handlers.
 */
suspend inline fun <reified T> transformResponse(response: HttpResponse): Response<T> {
    return when (response.status.value) {
        in 200..299 -> Response.OK(response.body())
        in 300..399 -> Response.Error.Server("unhandled redirect", response.status.value)
        403 -> Response.Error.Access(parseException(response))
        404 -> Response.Error.NotFound(parseException(response))
        500 -> Response.Error.Server(parseException(response), response.status.value)
        else -> Response.Error.Server(
            "code ${response.status.value}: ${response.bodyAsText()}",
            response.status.value
        )
    }
}


/**
 * Parses error messages as provided from the API.
 */
suspend fun parseException(response: HttpResponse): String {
    @Serializable
    data class ErrorType(
        val type: String
    )

    return when (val type = (response.body() as ErrorType).type) {
        "notfound" -> {
            @Serializable
            data class NotFound(
                val id: String,
                val message: String,
            )
            (response.body() as NotFound).message
        }
        "service" -> {
            @Serializable
            data class Service(
                val id: String,
                val message: String,
            )
            (response.body() as Service).message
        }
        "access" -> {
            @Serializable
            data class Access(
                val id: String,
                val message: String,
            )
            (response.body() as Access).message
        }
        "internal" -> {
            @Serializable
            data class Internal(
                val id: String,
                val message: String,
            )
            (response.body() as Internal).message
        }
        else -> {
            "unknown error type: $type"
        }
    }
}
