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
        return user.privileges.contains(Privilege.user_management) || user.privileges.contains(Privilege.create_user)
    }

    fun canReadUserComment(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.user_management)
    }

    fun canSell(user: CurrentUser, terminal: TerminalConfig): Boolean {
        return user.privileges.contains(Privilege.can_book_orders) && (((terminal.till?.buttons?.size) ?: 0) > 0)
    }

    fun canHackTheSystem(user: CurrentUser): Boolean {
        return user.activeRoleName == "admin"
    }

    fun canGiveFreeTickets(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.grant_free_tickets)
    }

    fun canGiveVouchers(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.grant_vouchers)
    }

    fun canManageCashiers(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.cash_transport)
    }

    fun canViewCashier(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.create_user) or user.privileges.contains(Privilege.user_management)
    }

    fun canLogInOtherUsers(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.terminal_login)
    }

    fun canChangeConfig(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.node_administration)
    }

    fun canSwap(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.customer_management)
    }

    fun canViewStats(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.view_node_stats)
    }

    fun canViewCustomerOrders(user: CurrentUser): Boolean {
        return true
        // TODO: introduce new privilege
        // return user.privileges.contains(Privilege.customer_management)
    }

    // Till features
    fun canSellTicket(terminal: TerminalConfig, user: CurrentUser): Boolean {
        return terminal.till?.allowTicketSale == true && user.privileges.contains(Privilege.can_book_orders)
    }

    fun canTopUp(terminal: TerminalConfig, user: CurrentUser): Boolean {
        return terminal.till?.allowTopUp == true && user.privileges.contains(Privilege.can_book_orders)
    }

    fun canPayOut(terminal: TerminalConfig, user: CurrentUser): Boolean {
        return terminal.till?.allowCashOut == true && user.privileges.contains(Privilege.can_book_orders)
    }
}