package de.stustanet.stustapay.ui.topup

/**
 * Configuration for topups.
 */
data class TopUpConfig(
    /**
     * Can we create a new topup?
     */
    var ready: Boolean = false,

    /**
     * How the till configuration is named.
     */
    var tillName: String = "",
)