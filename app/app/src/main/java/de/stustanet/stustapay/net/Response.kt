package de.stustanet.stustapay.net


/**
 * communication api response result type.
 * T: success type
 * E: deserialized error body type
 */
sealed class Response<out T> {
    data class OK<T>(val data: T) : Response<T>()
    sealed class Error : Response<Nothing>() {
        abstract fun msg(): String

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