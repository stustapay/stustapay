package de.stustapay.stustapay.model

import de.stustapay.api.models.TerminalConfig
import de.stustapay.api.models.CurrentUser
import de.stustapay.api.models.Privilege

/**
 * client-side privilege checks.
 */
object Access {
    // User permissions

    fun canCreateUser(user: CurrentUser): Boolean {
        return user.eventPrivileges.contains(EventPrivilege.create_user)
    }

    fun canReadAccountComment(user: CurrentUser): Boolean {
        return user.nodePrivileges.contains(NodePrivilege.customer_management)
    }

    fun canSell(user: CurrentUser, terminal: TerminalConfig): Boolean {
        return user.nodePrivileges.contains(NodePrivilege.can_book_orders) && (((terminal.till?.buttons?.size) ?: 0) > 0)
    }

    fun canHackTheSystem(user: CurrentUser): Boolean {
        return user.activeRoleName == "admin"
    }

    fun canGiveFreeTickets(user: CurrentUser): Boolean {
        return user.eventPrivileges.contains(EventPrivilege.grant_free_tickets)
    }

    fun canGiveVouchers(user: CurrentUser): Boolean {
        return user.eventPrivileges.contains(EventPrivilege.grant_vouchers)
    }

    fun canManageCashiers(user: CurrentUser): Boolean {
        return user.eventPrivileges.contains(EventPrivilege.cash_transport)
    }

    fun canLogInOtherUsers(user: CurrentUser): Boolean {
        return user.eventPrivileges.contains(EventPrivilege.terminal_login)
    }

    fun canChangeConfig(user: CurrentUser): Boolean {
        return user.nodePrivileges.contains(NodePrivilege.node_administration)
    }

    fun canSwap(user: CurrentUser): Boolean {
        return user.eventPrivileges.contains(EventPrivilege.customer_management)
    }

    fun canViewStats(user: CurrentUser): Boolean {
        return user.nodePrivileges.contains(NodePrivilege.view_node_stats)
    }

    fun canViewCustomerOrders(user: CurrentUser): Boolean {
        return true
    }

    // Till features
    fun canSellTicket(terminal: TerminalConfig, user: CurrentUser): Boolean {
        return terminal.till?.allowTicketSale == true && user.nodePrivileges.contains(NodePrivilege.can_book_orders)
    }

    fun canTopUp(terminal: TerminalConfig, user: CurrentUser): Boolean {
        return terminal.till?.allowTopUp == true && user.nodePrivileges.contains(NodePrivilege.can_book_orders)
    }

    fun canPayOut(terminal: TerminalConfig, user: CurrentUser): Boolean {
        return terminal.till?.allowCashOut == true && user.nodePrivileges.contains(NodePrivilege.can_book_orders)
    }
}
