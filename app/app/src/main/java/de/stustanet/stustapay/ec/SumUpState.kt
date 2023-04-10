package de.stustanet.stustapay.ec

sealed interface SumUpState {
    fun msg(): String

    object None : SumUpState {
        override fun msg(): String {
            return "no state"
        }
    }

    data class Started(
        val transactionId: String
    ) : SumUpState {
        override fun msg(): String {
            return "transaction started: $transactionId"
        }
    }

    data class Failed(
        val msg: String
    ) : SumUpState {
        override fun msg(): String {
            return "transaction failed: $msg"
        }
    }

    data class Success(
        val transactionId: String
    ) : SumUpState {
        override fun msg(): String {
            return "transaction success: $transactionId"
        }
    }

    data class Error(
        val msg: String
    ) : SumUpState {
        override fun msg(): String {
            return "transaction error: $msg"
        }
    }
}
