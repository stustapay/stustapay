package de.stustapay.stustapay.ui.common


import de.stustapay.stustapay.model.CurrentUser
import de.stustapay.stustapay.model.TerminalConfig
import de.stustapay.stustapay.model.UserState
import de.stustapay.stustapay.repository.TerminalConfigState


class TerminalLoginState(
    private val user: UserState = UserState.NoLogin,
    private val terminal: TerminalConfigState = TerminalConfigState.NoConfig
) {
    data class TillName(val title: String, val subtitle: String? = null)

    fun title(): TillName {
        return if (terminal is TerminalConfigState.Success) {
            TillName(terminal.config.name, terminal.config.profile_name)
        } else {
            TillName("StuStaPay")
        }
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
        return terminal.config.cash_register_id != null;
    }
}