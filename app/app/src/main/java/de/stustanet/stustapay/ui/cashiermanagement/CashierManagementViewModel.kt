package de.stustanet.stustapay.ui.cashiermanagement

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.CashRegister
import de.stustanet.stustapay.model.CashierStocking
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.CashierRepository
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class CashierManagementViewModel @Inject constructor(
    private val cashierRepository: CashierRepository,
) : ViewModel() {
    private val _stockings = MutableStateFlow(List(0) { CashierStocking() })
    private val _registers = MutableStateFlow(List(0) { CashRegister() })
    private val _status = MutableStateFlow<CashierManagementStatus>(CashierManagementStatus.None)

    val stockings = _stockings.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(3000),
        initialValue = List(0) { CashierStocking() }
    )

    val registers = _registers.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(3000),
        initialValue = List(0) { CashRegister() }
    )

    val status = _status.map { status ->
        if (status is CashierManagementStatus.Done) {
            when (val res = status.res) {
                is Response.OK -> {
                    "Done"
                }
                is Response.Error -> {
                    res.msg()
                }
            }
        } else {
            "Idle"
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(3000),
        initialValue = "Idle"
    )

    suspend fun getData() {
        when (val stockings = cashierRepository.getCashierStockings()) {
            is Response.OK -> {
                _stockings.update { stockings.data }
            }
            else -> {
                _stockings.update { List(0) { CashierStocking() } }
            }
        }

        when (val registers = cashierRepository.getRegisters()) {
            is Response.OK -> {
                _registers.update { registers.data }
            }
            else -> {
                _registers.update { List(0) { CashRegister() } }
            }
        }
    }

    suspend fun equip(tagId: ULong, registerId: ULong, stockingId: ULong) {
        _status.update { CashierManagementStatus.None }
        _status.update {
            CashierManagementStatus.Done(
                cashierRepository.equipCashier(tagId, registerId, stockingId)
            )
        }
    }

    suspend fun bookVaultToBag(tagId: ULong, amount: Double) {
        _status.update { CashierManagementStatus.None }
        _status.update {
            CashierManagementStatus.Done(
                cashierRepository.bookVault(tagId, amount)
            )
        }
    }

    suspend fun bookBagToVault(tagId: ULong, amount: Double) {
        _status.update { CashierManagementStatus.None }
        _status.update {
            CashierManagementStatus.Done(
                cashierRepository.bookVault(tagId, -amount)
            )
        }
    }

    suspend fun bookCashierToBag(tagId: ULong, amount: Double) {
        _status.update { CashierManagementStatus.None }
        _status.update {
            CashierManagementStatus.Done(
                cashierRepository.bookTransport(tagId, -amount)
            )
        }
    }

    suspend fun bookBagToCashier(tagId: ULong, amount: Double) {
        _status.update { CashierManagementStatus.None }
        _status.update {
            CashierManagementStatus.Done(
                cashierRepository.bookTransport(tagId, amount)
            )
        }
    }
}

sealed interface CashierManagementStatus {
    object None : CashierManagementStatus
    data class Done(
        val res: Response<Unit>
    ) : CashierManagementStatus
}