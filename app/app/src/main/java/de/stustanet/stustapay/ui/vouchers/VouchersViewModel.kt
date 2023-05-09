package de.stustanet.stustapay.ui.vouchers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.CustomerRepository
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class VouchersViewModel @Inject constructor(
    private val customerRepository: CustomerRepository
) : ViewModel() {
    private val _response = MutableStateFlow<VouchersViewStatus>(VouchersViewStatus.None)

    val status = _response.map { res ->
        when (res) {
            is VouchersViewStatus.None -> {
                ""
            }
            is VouchersViewStatus.Granted -> {
                "Vouchers granted"
            }
            is VouchersViewStatus.Error -> {
                "Failed to grant vouchers"
            }
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(3000),
        initialValue = ""
    )

    suspend fun giveVouchers(id: ULong, vouchers: Int) {
        when (customerRepository.grantVouchers(id, vouchers)) {
            is Response.OK -> {
                _response.update { VouchersViewStatus.Granted }
            }
            is Response.Error -> {
                _response.update { VouchersViewStatus.Error }
            }
        }
    }
}

sealed interface VouchersViewStatus {
    object None : VouchersViewStatus
    object Granted : VouchersViewStatus
    object Error : VouchersViewStatus
}