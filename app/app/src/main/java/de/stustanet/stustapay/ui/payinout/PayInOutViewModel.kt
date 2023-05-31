package de.stustanet.stustapay.ui.payinout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.Access
import de.stustanet.stustapay.repository.TerminalConfigRepository
import de.stustanet.stustapay.repository.UserRepository
import de.stustanet.stustapay.ui.common.TerminalLoginState
import de.stustanet.stustapay.util.mapState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import javax.inject.Inject

enum class CashInOutTab(
    val title: String,
    val access: (TerminalLoginState) -> Boolean,
    val route: String,
) {
    // Top with upwards arrow above
    TopUp(
        title = "TopUp \uD83D\uDD1D",
        access = { state -> state.checkAccess { u, t -> Access.canTopUp(t, u) } },
        route = "topup",
    ),

    // Money with wings
    PayOut(
        title = "PayOut \uD83D\uDCB8",
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

    val tabList: StateFlow<List<CashInOutTab>> =
        terminalLoginState.mapState(listOf(), viewModelScope) { loginState ->
            CashInOutTab.values().filter { it.access(loginState) }
        }

    fun cashInOutTabSelected(idx: Int) {
        _activeCashInOutTab.update { idx }
    }
}