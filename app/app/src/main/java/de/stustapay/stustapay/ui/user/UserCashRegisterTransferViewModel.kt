package de.stustapay.stustapay.ui.user

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.api.models.UserTag
import de.stustapay.stustapay.R
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.repository.CashierRepository
import de.stustapay.libssp.util.ResourcesProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject


sealed interface TransferCashRegisterState {
    object ScanSource : TransferCashRegisterState
    data class ScanTarget(val sourceTag: UserTag) : TransferCashRegisterState
    data class Done(
        val cashRegisterName: String,
        val balance: Double,
    ) : TransferCashRegisterState

    data class Error(val msg: String) : TransferCashRegisterState
}


@HiltViewModel
class UserCashRegisterTransferViewModel @Inject constructor(
    private val cashierRepository: CashierRepository,
    private val resourcesProvider: ResourcesProvider,
) : ViewModel() {

    private var _status = MutableStateFlow("")
    var status = _status.asStateFlow()

    private var _transferCashRegisterState = MutableStateFlow<TransferCashRegisterState>(
        TransferCashRegisterState.ScanSource
    )
    val transferCashRegisterState = _transferCashRegisterState.asStateFlow()

    fun clear() {
        _transferCashRegisterState.update { TransferCashRegisterState.ScanSource }
    }

    fun checkScan(tag: UserTag): Boolean {
        when (val state = _transferCashRegisterState.value) {
            is TransferCashRegisterState.ScanTarget -> {
                if (state.sourceTag == tag) {
                    _status.update {
                        resourcesProvider.getString(R.string.cash_register_same_source_target)
                    }
                    _transferCashRegisterState.update {
                        TransferCashRegisterState.ScanSource
                    }
                    return false
                }
                return true
            }

            else -> {
                return true
            }
        }
    }

    suspend fun tagScanned(tag: UserTag) {
        when (val state = _transferCashRegisterState.value) {
            is TransferCashRegisterState.ScanSource -> {
                _transferCashRegisterState.update {
                    TransferCashRegisterState.ScanTarget(tag)
                }
            }

            is TransferCashRegisterState.ScanTarget -> {
                transferCashRegisterSubmit(state.sourceTag, tag)
            }

            // tag scan not possible here.
            is TransferCashRegisterState.Done -> {}
            is TransferCashRegisterState.Error -> {}
        }
    }

    private suspend fun transferCashRegisterSubmit(sourceTag: UserTag, targetTag: UserTag) {

        _status.update {
            resourcesProvider.getString(R.string.cash_register_transferring)
        }
        val transferResult = cashierRepository.transferCashRegister(sourceTag, targetTag)
        _status.update {
            ""
        }

        when (transferResult) {
            is Response.OK -> {
                val currentCashierTagUid = transferResult.data.currentCashierTagUid
                if (currentCashierTagUid != targetTag.uid) {
                    if (currentCashierTagUid == null) {
                        TransferCashRegisterState.Error(
                            resourcesProvider.getString(R.string.cash_register_notassigned)
                        )
                    } else {
                        _transferCashRegisterState.update {
                            TransferCashRegisterState.Error(
                                resourcesProvider.getString(R.string.cash_register_unexpected_assign)
                                    .format(
                                        UserTag(currentCashierTagUid), UserTag(targetTag.uid)
                                    )
                            )
                        }
                    }
                }

                _transferCashRegisterState.update {
                    TransferCashRegisterState.Done(
                        cashRegisterName = transferResult.data.name,
                        balance = transferResult.data.currentBalance,
                    )
                }
            }

            is Response.Error -> {
                _transferCashRegisterState.update {
                    TransferCashRegisterState.Error(transferResult.msg())
                }
            }
        }
    }
}