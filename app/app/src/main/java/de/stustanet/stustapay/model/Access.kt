package de.stustanet.stustapay.model

/**
 * client-side privilege checks.
 */
object Access {
    // User permissions

    fun canCreateUser(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.user_management)
    }

    fun canSell(user: CurrentUser, terminal: TerminalConfig): Boolean {
        return user.privileges.contains(Privilege.can_book_orders) && (((terminal.buttons?.size) ?: 0) > 0)
    }

    fun canHackTheSystem(user: CurrentUser): Boolean {
        return user.active_role_name == "admin"
    }

    fun canGiveFreeTickets(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.grant_free_tickets)
    }

    fun canGiveVouchers(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.grant_vouchers)
    }

    fun canManageCashiers(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.cashier_management)
    }

    fun canLogInOtherUsers(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.terminal_login)
    }

    fun canChangeConfig(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.config_management)
    }

    fun canSwap(user: CurrentUser): Boolean {
        return user.privileges.contains(Privilege.account_management)
    }

    // Till features
    fun canSellTicket(terminal: TerminalConfig, user: CurrentUser): Boolean {
        return terminal.allow_ticket_sale && user.privileges.contains(Privilege.can_book_orders)
    }

    fun canTopUp(terminal: TerminalConfig, user: CurrentUser): Boolean {
        return terminal.allow_top_up && user.privileges.contains(Privilege.can_book_orders)
    }

    fun canPayOut(terminal: TerminalConfig, user: CurrentUser): Boolean {
        return terminal.allow_cash_out && user.privileges.contains(Privilege.can_book_orders)
    }
}