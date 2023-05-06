package de.stustanet.stustapay.ui.cashiermanagement

import androidx.compose.material.Text
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
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
    private val _status = MutableStateFlow<CashierManagementStatus>(CashierManagementStatus.None)

    val stockings = _stockings.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(3000),
        initialValue = List(0) { CashierStocking() }
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