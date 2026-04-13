package de.stustapay.stustapay.ui.common

import de.stustapay.api.models.CurrentUser
import de.stustapay.api.models.TerminalConfig
import de.stustapay.api.models.TerminalMode
import de.stustapay.stustapay.model.UserState
import de.stustapay.stustapay.repository.TerminalConfigState


class TerminalLoginState(
    private val user: UserState = UserState.NoLogin,
    private val terminal: TerminalConfigState = TerminalConfigState.NoConfig
) {
    data class SelfServiceAccess(
        val isSelfServiceProfile: Boolean = false,
        val canSelfServiceTopUp: Boolean = false,
        val canSelfServiceBalance: Boolean = false,
    ) {
        val hasVisibleActions: Boolean
            get() = canSelfServiceTopUp || canSelfServiceBalance
    }

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

    fun currentUser(): CurrentUser? {
        if (user !is UserState.LoggedIn) {
            return null
        }

        if (terminal !is TerminalConfigState.Success) {
            return user.user
        }

        val effectivePrivileges = terminal.config.till?.userPrivileges ?: terminal.config.userPrivileges
        if (effectivePrivileges == null) {
            return user.user
        }

        return user.user.copy(privileges = effectivePrivileges)
    }

    fun checkAccess(access: (CurrentUser, TerminalConfig) -> Boolean): Boolean {
        val currentUser = currentUser()
        return if (currentUser != null && terminal is TerminalConfigState.Success) {
            access(currentUser, terminal.config)
        } else {
            false
        }
    }

    fun checkUserAccess(access: (CurrentUser) -> Boolean): Boolean {
        val currentUser = currentUser() ?: return false
        return access(currentUser)
    }

    fun checkTerminalAccess(access: (CurrentUser) -> Boolean): Boolean {
        val currentUser = if (user is UserState.LoggedIn) {
            user.user
        } else {
            return false
        }

        val terminalPrivileges = when (terminal) {
            is TerminalConfigState.Success -> terminal.config.userPrivileges
            else -> null
        } ?: currentUser.privileges

        return access(currentUser.copy(privileges = terminalPrivileges))
    }

    fun hasConfig(): Boolean {
        return terminal is TerminalConfigState.Success
    }

    fun isSelfServiceTerminal(): Boolean {
        return terminal is TerminalConfigState.Success && terminal.config.selfService
    }

    fun selfServiceAccess(): SelfServiceAccess {
        if (currentUser() == null || terminal !is TerminalConfigState.Success || !terminal.config.selfService) {
            return SelfServiceAccess()
        }

        return SelfServiceAccess(
            isSelfServiceProfile = true,
            canSelfServiceTopUp =
                terminal.config.till?.allowTopUp == true && terminal.config.till?.postPaymentAllowed == false,
            canSelfServiceBalance = true,
        )
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
    
    fun hasOnlyTopUpPrivilege(): Boolean {
        return isSelfServiceTerminal()
    }
}
