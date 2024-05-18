package de.stustapay.libssp.net

import kotlinx.serialization.Serializable

/**
 * communication api response result type.
 * T: success type
 * E: deserialized error body type
 */
sealed class Response<out T> {
    data class OK<T>(val data: T) : Response<T>()
    sealed class Error : Response<Nothing>() {
        abstract fun msg(): String

        @Serializable
        sealed class Service(val msg: String) : Error() {
            override fun msg(): String {
                return msg
            }

            class Generic(msg: String) : Service(msg)

            @Serializable
            data class NotEnoughFunds(
                val needed_fund: Double,
                val available_fund: Double
            ) : Service("not enough funds. needed: $needed_fund available: $available_fund")
        }

        data class Server(val msg: String, val code: Int) : Error() {
            override fun msg(): String {
                return "server error $code: $msg"
            }
        }

        data class Access(val msg: String) : Error() {
            override fun msg(): String {
                return "access denied: $msg"
            }
        }

        data class NotFound(val msg: String) : Error() {
            override fun msg(): String {
                return "not found: $msg"
            }
        }

        data class BadResponse(val msg: String) : Error() {
            override fun msg(): String {
                return "bad response: $msg"
            }
        }

        data class Request(val msg: String? = null, val throwable: Throwable? = null) : Error() {
            init {
                require((msg != null) != (throwable != null)) {
                    "either message or throwable must be set"
                }
            }

            override fun msg(): String {
                return if (throwable != null) {
                    "request error: ${throwable.localizedMessage}"
                } else {
                    "request error: $msg"
                }
            }
        }
    }
}