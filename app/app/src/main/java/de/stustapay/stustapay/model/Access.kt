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
        return user.privileges.contains(Privilege.userManagement)
    }

    fun canReadUserComment(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.userManagement)
    }

    fun canSell(user: CurrentUser, terminal: TerminalConfig): Boolean {
        return user.privileges.contains(Privilege.canBookOrders) && (((terminal.till?.buttons?.size) ?: 0) > 0)
    }

    fun canHackTheSystem(user: CurrentUser): Boolean {
        return user.activeRoleName == "admin"
    }

    fun canGiveFreeTickets(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.grantFreeTickets)
    }

    fun canGiveVouchers(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.grantVouchers)
    }

    fun canManageCashiers(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.cashTransport)
    }

    fun canLogInOtherUsers(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.terminalLogin)
    }

    fun canChangeConfig(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.nodeAdministration)
    }

    fun canSwap(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.userManagement)
    }

    fun canViewStats(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.viewNodeStats)
    }

    fun canViewCustomerOrders(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.customerManagement)
    }

    // Till features
    fun canSellTicket(terminal: TerminalConfig, user: CurrentUser): Boolean {
        return terminal.till?.allowTicketSale == true && user.privileges.contains(Privilege.canBookOrders)
    }

    fun canTopUp(terminal: TerminalConfig, user: CurrentUser): Boolean {
        return terminal.till?.allowTopUp == true && user.privileges.contains(Privilege.canBookOrders)
    }

    fun canPayOut(terminal: TerminalConfig, user: CurrentUser): Boolean {
        return terminal.till?.allowCashOut == true && user.privileges.contains(Privilege.canBookOrders)
    }
}