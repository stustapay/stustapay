package de.stustanet.stustapay.ui.common.amountselect


sealed class AmountConfig {
    abstract fun limit(): UInt

    data class Number(val limit: UInt = 1000u) : AmountConfig() {
        override fun limit(): UInt {
            return limit
        }
    }

    data class Money(val limit: UInt = 100000u, val cents: Boolean = true) : AmountConfig() {
        override fun limit(): UInt {
            return limit
        }
    }
}