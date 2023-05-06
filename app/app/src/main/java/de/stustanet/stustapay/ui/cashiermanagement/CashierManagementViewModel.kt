package de.stustanet.stustapay.ui.cashiermanagement

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.CashierStocking
import de.stustanet.stustapay.model.UserState
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.CashierRepository
import de.stustanet.stustapay.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import javax.inject.Inject

@HiltViewModel
class CashierManagementViewModel @Inject constructor(
    private val cashierRepository: CashierRepository,
    private val userRepository: UserRepository
) : ViewModel() {
    private val _stockings = MutableStateFlow(List(0) { CashierStocking() })
    private val _status = MutableStateFlow<CashierManagementStatus>(CashierManagementStatus.None)

    val stockings = _stockings.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(3000),
        initialValue = List(0) { CashierStocking() }
    )

    val status = _status.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(3000),
        initialValue = CashierManagementStatus.None
    )

    suspend fun getStockings() {
        when (val stockings = cashierRepository.getCashierStockings()) {
            is Response.OK -> {
                _stockings.update { stockings.data }
            }
            else -> {
                _stockings.update { List(0) { CashierStocking() } }
            }
        }
    }

    suspend fun equip(tagId: ULong, stockingId: ULong) {
        _status.update { CashierManagementStatus.None }
        _status.update {
            CashierManagementStatus.Done(
                cashierRepository.equipCashier(
                    tagId,
                    stockingId
                )
            )
        }
    }

    suspend fun bookVaultToBag(amount: Double) {
        if (userRepository.userState.value is UserState.LoggedIn) {
            val user = (userRepository.userState.value as UserState.LoggedIn).user
            if (user.user_tag_uid != null) {
                cashierRepository.bookVault(user.user_tag_uid, amount)
            }
        }
    }

    suspend fun bookBagToVault(amount: Double) {
        if (userRepository.userState.value is UserState.LoggedIn) {
            val user = (userRepository.userState.value as UserState.LoggedIn).user
            if (user.user_tag_uid != null) {
                cashierRepository.bookVault(user.user_tag_uid, -amount)
            }
        }
    }

    suspend fun bookCashierToBag(tagId: ULong, amount: Double) {
        cashierRepository.bookTransport(tagId, -amount)
    }

    suspend fun bookBagToCashier(tagId: ULong, amount: Double) {
        cashierRepository.bookTransport(tagId, amount)
    }
}

sealed interface CashierManagementStatus {
    object None : CashierManagementStatus
    data class Done(
        val res: Response<Unit>
    ) : CashierManagementStatus
}