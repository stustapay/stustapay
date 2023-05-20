package de.stustanet.stustapay.ui.reward

/**
 * Configuration for rewards.
 */
data class RewardConfig(
    /**
     * Can we create a new topup?
     */
    var ready: Boolean = false,

    /**
     * How the till configuration is named.
     */
    var tillName: String = "",

    /** Can we hand out tickets? */
    var ticketHandout: Boolean = false,

    /** Can we hand out vouchers? */
    var voucherHandout: Boolean = false,
)