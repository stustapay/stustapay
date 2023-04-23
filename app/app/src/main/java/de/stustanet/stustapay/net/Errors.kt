package de.stustanet.stustapay.net

import io.ktor.client.call.*
import io.ktor.client.statement.*
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable


/**
 * Convert errors and exceptions into responses.
 * Format is defined in the api server's exception handlers.
 */
suspend inline fun <reified T> transformResponse(response: HttpResponse): Response<T> {
    return when (response.status.value) {
        in 200..299 -> Response.OK(response.body())
        in 300..399 -> Response.Error.Server("unhandled redirect", response.status.value)
        400 -> Response.Error.Service(parseException(response))
        403 -> Response.Error.Access(parseException(response))
        404 -> Response.Error.NotFound(parseException(response))
        500 -> Response.Error.Server(parseException(response), response.status.value)
        else -> Response.Error.Server(
            response.bodyAsText(),
            response.status.value
        )
    }
}


/**
 * Parses error messages as provided from the API.
 * todo: we should check the exception type against the http code...
 */
suspend fun parseException(response: HttpResponse): String {
    @Serializable
    data class ExceptionType(
        val type: String
    )

    return when (val excType = (response.body() as ExceptionType).type) {
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
        "notfound" -> {
            @Serializable
            data class NotFound(
                val id: String,
                val message: String,
            )
            (response.body() as NotFound).message
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
            "unknown error type: $excType"
        }
    }
}
