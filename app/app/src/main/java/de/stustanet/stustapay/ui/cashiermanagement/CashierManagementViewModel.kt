package de.stustanet.stustapay.ui.cashiermanagement

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
    private val cashierRepository: CashierRepository
) : ViewModel() {
    private val _stockings = MutableStateFlow(List(0) { CashierStocking() })

    val stockings = _stockings.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(3000),
        initialValue = List(0) { CashierStocking() }
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
        cashierRepository.equipCashier(tagId, stockingId)
    }
}