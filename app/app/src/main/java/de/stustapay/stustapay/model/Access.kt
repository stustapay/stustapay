package de.stustapay.stustapay.model

import de.stustapay.api.models.CurrentUser
import de.stustapay.api.models.EventPrivilege
import de.stustapay.api.models.NodePrivilege
import de.stustapay.api.models.TerminalConfig

/**
 * client-side privilege checks.
 */
object Access {
    // User permissions

    fun canCreateUser(user: CurrentUser): Boolean {
        return user.hasEventPrivilege(EventPrivilege.create_user)
    }

    fun canReadAccountComment(user: CurrentUser): Boolean {
        return user.hasEventPrivilege(EventPrivilege.customer_management)
    }

    fun canSell(user: CurrentUser, terminal: TerminalConfig): Boolean {
        return user.hasNodePrivilege(NodePrivilege.can_book_orders) && (((terminal.till?.buttons?.size) ?: 0) > 0)
    }

    fun canHackTheSystem(user: CurrentUser): Boolean {
        return user.activeRoleName == "admin"
    }

    fun canGiveFreeTickets(user: CurrentUser): Boolean {
        return user.hasEventPrivilege(EventPrivilege.grant_free_tickets)
    }

    fun canGiveVouchers(user: CurrentUser): Boolean {
        return user.hasEventPrivilege(EventPrivilege.grant_vouchers)
    }

    fun canManageCashiers(user: CurrentUser): Boolean {
        return user.hasEventPrivilege(EventPrivilege.cash_transport)
    }

    fun canLogInOtherUsers(user: CurrentUser): Boolean {
        return user.hasEventPrivilege(EventPrivilege.terminal_login)
    }

    fun canChangeConfig(user: CurrentUser): Boolean {
        return user.hasNodePrivilege(NodePrivilege.node_administration)
    }

    fun canSwap(user: CurrentUser): Boolean {
        return user.hasEventPrivilege(EventPrivilege.customer_management)
    }

    fun canViewStats(user: CurrentUser): Boolean {
        return user.hasNodePrivilege(NodePrivilege.view_node_stats)
    }

    fun canViewCustomerOrders(user: CurrentUser): Boolean {
        return true
    }

    // Till features
    fun canSellTicket(terminal: TerminalConfig, user: CurrentUser): Boolean {
        return terminal.till?.allowTicketSale == true && user.hasNodePrivilege(NodePrivilege.can_book_orders)
    }

    fun canTopUp(terminal: TerminalConfig, user: CurrentUser): Boolean {
        return terminal.till?.allowTopUp == true && user.hasNodePrivilege(NodePrivilege.can_book_orders)
    }

    fun canPayOut(terminal: TerminalConfig, user: CurrentUser): Boolean {
        return terminal.till?.allowCashOut == true && user.hasNodePrivilege(NodePrivilege.can_book_orders)
    }

    private fun CurrentUser.hasEventPrivilege(privilege: EventPrivilege): Boolean {
        return eventPrivileges.orEmpty().contains(privilege)
    }

    private fun CurrentUser.hasNodePrivilege(privilege: NodePrivilege): Boolean {
        return nodePrivileges.orEmpty().contains(privilege)
    }
}
