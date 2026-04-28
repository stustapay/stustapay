package de.stustapay.stustapay.ui.common

import com.ionspin.kotlin.bignum.integer.toBigInteger
import de.stustapay.api.models.CurrentUser
import de.stustapay.api.models.Privilege
import de.stustapay.api.models.TerminalConfig
import de.stustapay.api.models.TerminalMode
import de.stustapay.api.models.TerminalTillConfig
import de.stustapay.stustapay.model.Access
import de.stustapay.stustapay.model.UserState
import de.stustapay.stustapay.repository.TerminalConfigState
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TerminalLoginStateTest {
    @Test
    fun selfServiceAccessUsesTerminalFlagForOperatorUsers() {
        val state = TerminalLoginState(
            user = UserState.LoggedIn(currentUser(listOf(Privilege.can_book_orders, Privilege.view_node_stats))),
            terminal = TerminalConfigState.Success(terminalConfig(selfService = true, allowTopUp = true)),
        )

        val access = state.selfServiceAccess()

        assertTrue(state.isSelfServiceTerminal())
        assertTrue(access.isSelfServiceProfile)
        assertTrue(access.canSelfServiceBalance)
        assertTrue(access.canSelfServiceTopUp)
    }

    @Test
    fun selfServiceAccessHidesTopUpWhenTillDoesNotAllowIt() {
        val state = TerminalLoginState(
            user = UserState.LoggedIn(currentUser(listOf(Privilege.can_topup, Privilege.terminal_login))),
            terminal = TerminalConfigState.Success(terminalConfig(selfService = true, allowTopUp = false)),
        )

        val access = state.selfServiceAccess()

        assertTrue(state.isSelfServiceTerminal())
        assertTrue(access.canSelfServiceBalance)
        assertFalse(access.canSelfServiceTopUp)
        assertTrue(access.hasVisibleActions)
    }

    @Test
    fun unflaggedTerminalDoesNotEnterSelfServiceMode() {
        val state = TerminalLoginState(
            user = UserState.LoggedIn(currentUser(listOf(Privilege.can_topup, Privilege.terminal_login))),
            terminal = TerminalConfigState.Success(terminalConfig(selfService = false, allowTopUp = true)),
        )

        val access = state.selfServiceAccess()

        assertFalse(state.isSelfServiceTerminal())
        assertFalse(access.isSelfServiceProfile)
        assertFalse(access.canSelfServiceBalance)
        assertFalse(access.canSelfServiceTopUp)
    }

    @Test
    fun currentUserUsesTerminalScopedPrivilegesOnNormalTerminals() {
        val state = TerminalLoginState(
            user = UserState.LoggedIn(
                currentUser(
                    listOf(
                        Privilege.can_book_orders,
                        Privilege.customer_management,
                        Privilege.payout_management,
                        Privilege.view_node_stats,
                    )
                )
            ),
            terminal = TerminalConfigState.Success(
                terminalConfig(
                    selfService = false,
                    allowTopUp = true,
                    userPrivileges = listOf(Privilege.can_topup, Privilege.terminal_login),
                )
            ),
        )

        assertFalse(state.isSelfServiceTerminal())
        assertTrue(state.checkAccess { user, terminal -> Access.canTopUp(terminal, user) })
        assertFalse(state.checkUserAccess(Access::canViewCustomerOrders))
    }

    @Test
    fun terminalAccessUsesTerminalPrivilegesForSettings() {
        val state = TerminalLoginState(
            user = UserState.LoggedIn(currentUser(listOf(Privilege.can_book_orders))),
            terminal = TerminalConfigState.Success(
                terminalConfig(
                    selfService = false,
                    allowTopUp = true,
                    userPrivileges = listOf(Privilege.node_administration),
                    tillUserPrivileges = listOf(Privilege.can_book_orders),
                )
            ),
        )

        assertFalse(state.checkUserAccess(Access::canChangeConfig))
        assertTrue(state.checkTerminalAccess(Access::canChangeConfig))
    }

    @Test
    fun selfServiceSettingsUseTerminalScopedPrivileges() {
        val withoutTerminalAdminPrivilege = TerminalLoginState(
            user = UserState.LoggedIn(currentUser(listOf(Privilege.can_book_orders, Privilege.node_administration))),
            terminal = TerminalConfigState.Success(
                terminalConfig(
                    selfService = true,
                    allowTopUp = true,
                    userPrivileges = listOf(Privilege.can_topup, Privilege.terminal_login),
                    tillUserPrivileges = listOf(Privilege.can_book_orders),
                )
            ),
        )
        val withTerminalAdminPrivilege = TerminalLoginState(
            user = UserState.LoggedIn(currentUser(listOf(Privilege.can_book_orders))),
            terminal = TerminalConfigState.Success(
                terminalConfig(
                    selfService = true,
                    allowTopUp = true,
                    userPrivileges = listOf(Privilege.node_administration),
                    tillUserPrivileges = listOf(Privilege.can_book_orders),
                )
            ),
        )

        assertFalse(withoutTerminalAdminPrivilege.checkTerminalAccess(Access::canChangeConfig))
        assertTrue(withTerminalAdminPrivilege.checkTerminalAccess(Access::canChangeConfig))
    }

    @Test
    fun customerHistoryFilterIsAvailableForOrderingAndCustomerManagementUsers() {
        val orderingState = TerminalLoginState(
            user = UserState.LoggedIn(currentUser(listOf(Privilege.can_book_orders))),
            terminal = TerminalConfigState.Success(terminalConfig(selfService = false, allowTopUp = true)),
        )
        val customerManagementState = TerminalLoginState(
            user = UserState.LoggedIn(currentUser(listOf(Privilege.customer_management))),
            terminal = TerminalConfigState.Success(terminalConfig(selfService = false, allowTopUp = true)),
        )
        val topUpState = TerminalLoginState(
            user = UserState.LoggedIn(currentUser(listOf(Privilege.can_topup, Privilege.terminal_login))),
            terminal = TerminalConfigState.Success(terminalConfig(selfService = false, allowTopUp = true)),
        )

        assertTrue(orderingState.checkUserAccess(Access::canFilterCustomerHistory))
        assertTrue(customerManagementState.checkUserAccess(Access::canFilterCustomerHistory))
        assertFalse(topUpState.checkUserAccess(Access::canFilterCustomerHistory))
    }

    @Test
    fun topUpCardHandlingUsesSumupPaymentEnabledNotProfileCardFlag() {
        val sumupEnabledProfileCardDisabled = TerminalLoginState(
            user = UserState.LoggedIn(currentUser(listOf(Privilege.can_book_orders))),
            terminal = TerminalConfigState.Success(
                terminalConfig(
                    selfService = false,
                    allowTopUp = true,
                    enableCardPayment = false,
                    sumupPaymentEnabled = true,
                )
            ),
        )
        val sumupDisabledProfileCardEnabled = TerminalLoginState(
            user = UserState.LoggedIn(currentUser(listOf(Privilege.can_book_orders))),
            terminal = TerminalConfigState.Success(
                terminalConfig(
                    selfService = false,
                    allowTopUp = true,
                    enableCardPayment = true,
                    sumupPaymentEnabled = false,
                )
            ),
        )

        assertTrue(sumupEnabledProfileCardDisabled.canHandleCardTopUp())
        assertFalse(sumupDisabledProfileCardEnabled.canHandleCardTopUp())
    }

    @Test
    fun saleCardHandlingStillUsesProfileCardFlag() {
        val profileCardDisabled = terminalConfig(
            selfService = false,
            allowTopUp = true,
            enableCardPayment = false,
            sumupPaymentEnabled = true,
        )
        val profileCardEnabled = terminalConfig(
            selfService = false,
            allowTopUp = true,
            enableCardPayment = true,
            sumupPaymentEnabled = false,
        )
        val user = currentUser(listOf(Privilege.can_book_orders))

        assertFalse(Access.canSell(user, profileCardDisabled) && profileCardDisabled.till?.enableCardPayment == true)
        assertTrue(profileCardEnabled.till?.enableCardPayment == true)
    }

    private fun currentUser(privileges: List<Privilege>): CurrentUser {
        return CurrentUser(
            nodeId = 1.toBigInteger(),
            id = 1.toBigInteger(),
            login = "tester",
            displayName = "Tester",
            privileges = privileges,
        )
    }

    private fun terminalConfig(
        selfService: Boolean,
        allowTopUp: Boolean,
        userPrivileges: List<Privilege>? = null,
        tillUserPrivileges: List<Privilege>? = null,
        enableCardPayment: Boolean = true,
        sumupPaymentEnabled: Boolean = true,
    ): TerminalConfig {
        return TerminalConfig(
            id = 1.toBigInteger(),
            name = "Test Terminal",
            description = null,
            mode = TerminalMode.till,
            entryArea = null,
            selfService = selfService,
            eventName = "Test Event",
            activeUserId = null,
            availableRoles = emptyList(),
            userPrivileges = userPrivileges,
            secrets = null,
            till = TerminalTillConfig(
                id = 1.toBigInteger(),
                name = "Till",
                description = null,
                eventName = "Test Event",
                profileName = "Default",
                cashRegisterId = null,
                cashRegisterName = null,
                allowTopUp = allowTopUp,
                allowCashOut = false,
                allowTicketSale = false,
                allowTicketVouchers = false,
                enableSspPayment = true,
                enableCashPayment = false,
                enableCardPayment = enableCardPayment,
                buttons = emptyList(),
                sumupSecrets = null,
                postPaymentAllowed = false,
                sumupPaymentEnabled = sumupPaymentEnabled,
                userPrivileges = tillUserPrivileges,
                secrets = null,
                activeUserId = null,
                availableRoles = emptyList(),
            ),
            testMode = false,
            testModeMessage = "",
        )
    }
}
