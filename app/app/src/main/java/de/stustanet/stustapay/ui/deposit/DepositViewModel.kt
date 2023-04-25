package de.stustanet.stustapay.ui.deposit

import android.media.MediaDrm.LogMessage
import android.util.Log
import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.ec.ECPayment
import de.stustanet.stustapay.model.NewTopUp
import de.stustanet.stustapay.model.TopUpType
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.TopUpRepository
import de.stustanet.stustapay.ui.ec.ECState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.math.BigDecimal
import java.util.*
import javax.inject.Inject

enum class DepositPage(val route: String) {
    Amount("amount"),
    Cash("cash"),
    Done("done"),
    Failure("aborted"),
}

data class DepositState(
    /** desired deposit amount in cents */
    var currentAmount: UInt = 0u,
    var currentTagId: UserTag? = null,
    var topUpType: TopUpType? = null,
    var status: String = "ready",
)

@HiltViewModel
class DepositViewModel @Inject constructor(
    private val topUpRepository: TopUpRepository
) : ViewModel() {
    val _navState = MutableStateFlow(DepositPage.Amount)

    private val _depositState = MutableStateFlow(DepositState())
    val depositState = _depositState.asStateFlow()

    fun setAmount(amount: UInt) {
        _depositState.update {
            val cpy = it.copy()
            cpy.currentAmount = amount
            cpy
        }
    }

    fun clear() {
        _depositState.update {
            DepositState()
        }
    }

    /** validates the amount so we can continue to checkout */
    suspend fun checkAmount(): Boolean {
        val minimum = 100U
        if (_depositState.value.currentAmount < minimum) {
            _depositState.update { it.copy(status = "at least ${minimum.toFloat() / 100} needed") }
            return false
        }else {
            val uid = _depositState.value.currentTagId?.uid
            val type = _depositState.value.topUpType
            if (uid == null) {
                return false
            }
            if (type == null){
                return false
            }
            var newTopUp = NewTopUp(_depositState.value.currentAmount.toDouble(),
                                    uid,
                                    type)
            val response = topUpRepository.checkTopUp(newTopUp)
            Log.e("Stustapay", "checkamount finished?")
            when (response) {
                is Response.OK -> {
                    _depositState.update { it.copy(
                        status = "validated")
                    }
                   // _navState.update { SalePage.Confirm }
                }
//                is Response.Error.Service -> {
//                    // maybe only clear tag for some errors.
//                    clearScannedTag()
//                    _navState.update { SalePage.Error }
//                    _status.update { response.msg() }
//                }
                is Response.Error -> {
                    return false;
                   // _status.update { response.msg() }
                }
            }
        }
        return true
    }

    /**
     * creates a ec payment with new id for the current selected sum.
     */
    fun getECPayment(userTag: UserTag): ECPayment {
        return ECPayment(
            id = UUID.randomUUID().toString(),
            amount = BigDecimal(_depositState.value.currentAmount.toLong()),
            tag = userTag,
        )
    }

    suspend fun cashFinished(tag: UserTag){
        _depositState.update{
            it.copy(currentTagId = tag, topUpType = TopUpType.Cash)
        }

        val uid = _depositState.value.currentTagId?.uid
        val type = _depositState.value.topUpType
        if (uid == null) {
            return
        }
        if (type == null){
            return
        }

        var newTopUp = NewTopUp(_depositState.value.currentAmount.toDouble(),
            uid,
            type)
        val response = topUpRepository.bookTopUp(newTopUp)
        when (response) {
            is Response.OK -> {
                _depositState.update {
                    it.copy(status = "cash for $tag booked :)")
                }
            }
            is Response.Error -> {
                _depositState.update {
                    it.copy(status = "cash topup for $tag failed")
                }
            }
        }
        _navState.update { DepositPage.Done }
    }

    fun ecFinished(ecState: ECState) {
        when (ecState) {
            is ECState.None -> {}
            is ECState.Success -> {
                // TODO: send to backend
                _depositState.update {
                    it.copy(status = "error: ${ecState.msg}")
                }
                _navState.update { DepositPage.Done }
            }
            is ECState.Error -> {
                _depositState.update {
                    it.copy(status = "error: ${ecState.msg}")
                }
                _navState.update { DepositPage.Failure }
            }
        }
    }
}