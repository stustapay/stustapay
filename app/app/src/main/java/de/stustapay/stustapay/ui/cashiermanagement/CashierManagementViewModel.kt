package de.stustapay.stustapay.ui.cashiermanagement

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.api.models.CashRegisterStocking
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.repository.CashierRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject

@HiltViewModel
class CashierManagementViewModel @Inject constructor(
    private val cashierRepository: CashierRepository,
) : ViewModel() {
    private val _status = MutableStateFlow<CashierManagementStatus>(CashierManagementStatus.None)

    private val _stockings = MutableStateFlow<List<CashRegisterStocking>>(listOf())
    val stockings = _stockings.asStateFlow()

    private val _registers = MutableStateFlow<List<de.stustapay.api.models.CashRegister>>(listOf())
    val registers = _registers.asStateFlow()

    val status = _status.asStateFlow()

    suspend fun getData() {
        when (val stockings = cashierRepository.getCashierStockings()) {
            is Response.OK -> {
                _stockings.update { stockings.data }
            }

            else -> {
                _stockings.update { listOf() }
            }
        }

        when (val registers = cashierRepository.getRegisters()) {
            is Response.OK -> {
                _registers.update { registers.data }
            }

            else -> {
                _registers.update { listOf() }
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

    fun idleState() {
        _status.update { CashierManagementStatus.None }
    }
}

sealed interface CashierManagementStatus {
    object None : CashierManagementStatus
    data class Done(
        val res: Response<Unit>
    ) : CashierManagementStatus
}