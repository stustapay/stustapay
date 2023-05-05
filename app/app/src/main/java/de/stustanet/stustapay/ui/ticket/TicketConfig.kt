package de.stustanet.stustapay.ui.ticket

/**
 * Configuration for tickets.
 */
data class TicketConfig(
    /**
     * Can we sell a new ticket?
     */
    var ready: Boolean = false,

    /**
     * How the till configuration is named.
     */
    var tillName: String = "",

    /**
     * How much does a customer have to pay.
     */
    var amount: UInt = 0u,
)