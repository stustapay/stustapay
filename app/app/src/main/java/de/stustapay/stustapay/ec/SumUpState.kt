package de.stustapay.stustapay.ec

import com.sumup.merchant.reader.models.TransactionInfo

sealed interface SumUpState {
    fun msg(): String

    object None : SumUpState {
        override fun msg(): String {
            return "sumup idle"
        }
    }

    data class Started(
        val transactionId: String
    ) : SumUpState {
        override fun msg(): String {
            return "sumup transaction started: $transactionId"
        }
    }

    data class Failed(
        val msg: String
    ) : SumUpState {
        override fun msg(): String {
            return "sumup transaction failed: $msg"
        }
    }

    data class Success(
        val msg: String,
        val txCode: String,
        val txInfo: TransactionInfo?,
    ) : SumUpState {
        override fun msg(): String {
            return "sumup transaction success: $msg"
        }
    }

    data class Error(
        val msg: String
    ) : SumUpState {
        override fun msg(): String {
            return "sumup transaction error: $msg"
        }
    }
}
