package de.stustapay.libssp.net

import io.ktor.client.call.body
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.serialization.JsonConvertException
import kotlinx.serialization.Serializable


/**
 * Convert errors and exceptions into responses.
 * Format is defined in the api server's exception handlers.
 */
suspend inline fun <reified T> transformResponse(response: HttpResponse): Response<T> {
    // TODO when response status is 2xx, we can be sure the request was ok.
    // for some things we can then assume it worked, even if we encounter json parse errors
    // -> new response status "okwithparseerror" that has no content, but must be handled as success
    // we should generate openapi in CI and let the build fail
    return when (response.status.value) {
        in 200..299 -> Response.OK(response.body())
        in 300..399 -> Response.Error.Server("unhandled redirect", response.status.value)
        400 -> parseServiceException(response)
        401 -> Response.Error.Access(parseException(response))
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
    return when (val excType = response.body<ExceptionType>().type) {
        "service" -> {
            @Serializable
            data class Service(
                val id: String,
                val message: String,
            )

            val excContent = response.body<Service>()
            when (excContent.id) {
                "NotEnoughFunds" -> {
                    Response.Error.Service.NotEnoughFunds(excContent.message.ifEmpty { excContent.id })
                }

                "AlreadyProcessed" -> {
                    Response.Error.Service.AlreadyProcessed(excContent.message.ifEmpty { excContent.id })
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

    return response.body<ExceptionDetail>().detail
}

/**
 * Parses error messages as provided from the API.
 */
suspend fun parseException(response: HttpResponse): String {
    return when (val excType = response.body<ExceptionType>().type) {
        "access" -> {
            @Serializable
            data class Access(
                val id: String,
                val message: String,
            )

            val excContent = response.body<Access>()
            excContent.message.ifEmpty { excContent.id }
        }

        "notfound" -> {
            @Serializable
            data class NotFound(
                val id: String,
                val message: String,
            )

            val excContent = response.body<NotFound>()
            excContent.message.ifEmpty { excContent.id }
        }

        "internal" -> {
            @Serializable
            data class Internal(
                val id: String,
                val message: String,
            )

            val excContent = response.body<Internal>()
            excContent.message.ifEmpty { excContent.id }
        }

        "unauthorized" -> {
            @Serializable
            data class Unauthorized(
                val id: String,
                val message: String,
            )

            val excContent = response.body() as Unauthorized
            excContent.message.ifEmpty { excContent.id }
        }

        else -> {
            "unknown error type: $excType"
        }
    }
}
