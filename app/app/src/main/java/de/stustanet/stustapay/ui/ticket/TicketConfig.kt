package de.stustanet.stustapay.ui.ticket

/**
 * button available for purchase.
 */
data class TicketItemConfig(
    val id: Int,
    val caption: String,
    val price: Double,
)


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
     * Available ticket types
     * button id -> ticket config.
     */
    var tickets: Map<Int, TicketItemConfig> = mapOf(),
)