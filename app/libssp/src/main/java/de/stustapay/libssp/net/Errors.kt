package de.stustapay.libssp.net

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
        400 -> parseServiceException(response)
        403 -> Response.Error.Access(parseException(response))
        404 -> Response.Error.NotFound(parseDetailException(response))
        500 -> Response.Error.Server(parseException(response), response.status.value)
        else -> Response.Error.Server(
            response.bodyAsText(),
            response.status.value
        )
    }
}

@Serializable
data class ExceptionType(
    val type: String
)

suspend fun parseServiceException(response: HttpResponse): Response.Error.Service {
    return when (val excType = (response.body() as ExceptionType).type) {
        "service" -> {
            @Serializable
            data class Service(
                val id: String,
                val message: String,
            )

            val excContent = response.body() as Service
            when (excContent.id) {
                "TODO NotEnoughFunds" -> {
                    return response.body() as Response.Error.Service.NotEnoughFunds
                }

                else ->
                    Response.Error.Service.Generic(excContent.message.ifEmpty { excContent.id })
            }
        }

        else -> {
            Response.Error.Service.Generic("unhandled badrequest type: $excType")
        }
    }
}


suspend fun parseDetailException(response: HttpResponse): String {
    @Serializable
    data class ExceptionDetail(
        val detail: String
    )

    return (response.body() as ExceptionDetail).detail
}

/**
 * Parses error messages as provided from the API.
 * todo: we should check the exception type against the http code...
 */
suspend fun parseException(response: HttpResponse): String {
    return when (val excType = (response.body() as ExceptionType).type) {
        "access" -> {
            @Serializable
            data class Access(
                val id: String,
                val message: String,
            )

            val excContent = response.body() as Access
            excContent.message.ifEmpty { excContent.id }
        }

        "notfound" -> {
            @Serializable
            data class NotFound(
                val id: String,
                val message: String,
            )

            val excContent = response.body() as NotFound
            excContent.message.ifEmpty { excContent.id }
        }

        "internal" -> {
            @Serializable
            data class Internal(
                val id: String,
                val message: String,
            )

            val excContent = response.body() as Internal
            excContent.message.ifEmpty { excContent.id }
        }

        else -> {
            "unknown error type: $excType"
        }
    }
}
