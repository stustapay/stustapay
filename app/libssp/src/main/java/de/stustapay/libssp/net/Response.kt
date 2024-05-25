package de.stustapay.libssp.net

import kotlinx.serialization.Serializable

/**
 * communication api response result type.
 * T: success type
 */
sealed class Response<out T> {
    /**
     * true if the request was "delivered" to the server successfully.
     * returns false when there were e.g. network problems so we can retry critical transactions.
     */
    abstract fun submitSuccess(): Boolean

    data class OK<T>(val data: T) : Response<T>() {
        override fun submitSuccess(): Boolean {
            return true
        }
    }

    sealed class Error : Response<Nothing>() {
        abstract fun msg(): String
        override fun submitSuccess(): Boolean {
            return true
        }

        @Serializable
        sealed class Service(val msg: String) : Error() {
            override fun msg(): String {
                return msg
            }

            class Generic(msg: String) : Service(msg)

            class NotEnoughFunds(
                msg: String
            ) : Service(msg)

            class AlreadyProcessed(
                msg: String
            ) : Service(msg)
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

        /** when the request failed because of exceptions and network errors */
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

            override fun submitSuccess(): Boolean {
                return false
            }
        }

        /** server sent a 5xx message */
        data class Server(val msg: String, val code: Int) : Error() {
            override fun msg(): String {
                return "server error $code: $msg"
            }

            override fun submitSuccess(): Boolean {
                return false
            }
        }
    }
}