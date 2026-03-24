package de.stustapay.stustapay.ui.common

import de.stustapay.api.models.CurrentUser
import de.stustapay.api.models.Privilege
import de.stustapay.api.models.TerminalConfig
import de.stustapay.api.models.TerminalMode
import de.stustapay.stustapay.model.Access
import de.stustapay.stustapay.model.UserState
import de.stustapay.stustapay.repository.TerminalConfigState


class TerminalLoginState(
    private val user: UserState = UserState.NoLogin,
    private val terminal: TerminalConfigState = TerminalConfigState.NoConfig
) {
    data class TillName(val title: String, val subtitle: String? = null)

    fun title(): TillName {
        return if (terminal is TerminalConfigState.Success) {
            if (terminal.config.mode == TerminalMode.till) {
                TillName(terminal.config.till?.name.orEmpty(), terminal.config.till?.profileName)
            } else {
                val areaName = terminal.config.entryArea?.name ?: terminal.config.name
                TillName(areaName)
            }
        } else {
            TillName("TeamFestlichPay")
        }
    }

    fun terminalMode(): TerminalMode {
        return if (terminal is TerminalConfigState.Success) {
            terminal.config.mode
        } else {
            TerminalMode.till
        }
    }

    fun isEntryMode(): Boolean {
        return terminal is TerminalConfigState.Success && terminal.config.mode != TerminalMode.till
    }

    fun isTerminalReady(): Boolean {
        return terminal is TerminalConfigState.Success
    }

    fun checkAccess(access: (CurrentUser, TerminalConfig) -> Boolean): Boolean {
        return if (user is UserState.LoggedIn && terminal is TerminalConfigState.Success) {
            access(user.user, terminal.config)
        } else {
            false
        }
    }

    fun hasConfig(): Boolean {
        return terminal is TerminalConfigState.Success
    }

    fun canHandleCash(): Boolean {
        if (terminal !is TerminalConfigState.Success) {
            return false;
        }
        return terminal.config.till?.cashRegisterId != null;
    }

    fun canHandleCardTopUp(): Boolean {
        if (terminal !is TerminalConfigState.Success) {
            return false
        }
        return terminal.config.till?.enableCardPayment == true
    }
    
    /**
     * Returns the maximum account balance for the current customer
     * The default is 200.0 if not in terminal config
     */
    val maxAccountBalance: Float
        get() {
            if (terminal !is TerminalConfigState.Success) {
                return 200.0f
            }
            // In a future update, we'll add VIP status check here
            return terminal.config.maxAccountBalance ?: 200.0f
        }
    
    /**
     * Check if the user has only the can_topup privilege but not the can_book_orders privilege.
     * Such users should have restricted UI access (no back button, auto-navigate to topup)
     */
    fun hasOnlyTopUpPrivilege(): Boolean {
        if (user !is UserState.LoggedIn) {
            return false
        }
        
        return Access.hasOnlyTopUpPrivilege(user.user)
    }
}
