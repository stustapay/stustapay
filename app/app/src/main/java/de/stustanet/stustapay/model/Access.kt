package de.stustanet.stustapay.model

/**
 * client-side privilege checks.
 */
object Access {
    fun canCreateUser(user: User): Boolean {
        return user.privileges.any {
            it == Privilege.admin || it == Privilege.finanzorga
        }
    }

    fun canSell(user: User): Boolean {
        return user.privileges.any {
            it == Privilege.admin || it == Privilege.finanzorga || it == Privilege.cashier
        }
    }

    fun canTopUp(terminal: TerminalConfig): Boolean {
        return terminal.allow_top_up
    }

    fun canHackTheSystem(user: User): Boolean {
        return user.privileges.any {
            it == Privilege.admin
        }
    }
}