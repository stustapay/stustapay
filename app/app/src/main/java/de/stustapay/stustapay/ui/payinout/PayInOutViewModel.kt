package de.stustapay.stustapay.ui.payinout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.stustapay.model.Access
import de.stustapay.stustapay.model.UserState
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.stustapay.repository.UserRepository
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.TerminalLoginState
import de.stustapay.libssp.util.mapState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import javax.inject.Inject

enum class CashInOutTab(
    val titleRes: Int,
    val access: (TerminalLoginState) -> Boolean,
    val route: String,
) {
    TopUp(
        titleRes = R.string.payinout_tab_topup,
        access = { state -> state.checkAccess { u, t -> Access.canTopUp(t, u) } },
        route = "topup",
    ),

    PayOut(
        titleRes = R.string.payinout_tab_payout,
        access = { state -> state.checkAccess { u, t -> Access.canPayOut(t, u) } },
        route = "payout",
    ),
}


@HiltViewModel
class PayInOutViewModel @Inject constructor(
    private val terminalConfigRepository: TerminalConfigRepository,
    private val userRepository: UserRepository,
) : ViewModel() {

    private val _activeCashInOutTab = MutableStateFlow(0)
    val activeCashInOutTab = _activeCashInOutTab.asStateFlow()
    
    // Status to check if user is logged out and needs to exit to login screen
    private val _loggedOut = MutableStateFlow(false)
    val loggedOut = _loggedOut.asStateFlow()

    // configuration infos from backend
    val terminalLoginState = combine(
        userRepository.userState,
        terminalConfigRepository.terminalConfigState
    ) { user, terminal ->
        TerminalLoginState(user, terminal)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = TerminalLoginState(),
    )
    
    // Track user login state changes to detect logout
    val userLoggedIn = userRepository.userState
        .map { userState -> userState is UserState.LoggedIn }
        .distinctUntilChanged()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = true
        )

    val tabList: StateFlow<List<CashInOutTab>> =
        terminalLoginState.mapState(listOf(), viewModelScope) { loginState ->
            CashInOutTab.values().filter { it.access(loginState) }
        }

    fun cashInOutTabSelected(idx: Int) {
        _activeCashInOutTab.update { idx }
    }
    
    // Call this from the view to check if we should leave the view due to logout
    fun checkLogoutStatus(): Boolean {
        val user = userRepository.userState.value
        return user is UserState.NoLogin || user is UserState.Error
    }
}
