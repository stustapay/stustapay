package de.stustapay.stustapay.ui.common.pay

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.stustapay.repository.UserRepository
import de.stustapay.stustapay.ui.common.TerminalLoginState
import de.stustapay.stustapay.display.CustomerDisplayManager
import de.stustapay.stustapay.display.CustomerDisplayState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject


@HiltViewModel
class CashECSelectionViewModel @Inject constructor(
    private val terminalConfigRepository: TerminalConfigRepository,
    private val userRepository: UserRepository,
    private val customerDisplayManager: CustomerDisplayManager,
) : ViewModel() {

    private val _status = MutableStateFlow("")
    val status = _status.asStateFlow()

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
    
    /**
     * Updates the customer display to show the scan chip message
     */
    fun showScanChipOnCustomerDisplay() {
        customerDisplayManager.updateState(CustomerDisplayState.ScanChip)
    }
    
    /**
     * Resets the customer display to the welcome state
     */
    fun resetCustomerDisplay() {
        customerDisplayManager.updateState(CustomerDisplayState.Welcome)
    }
}
