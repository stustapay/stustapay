package de.stustapay.stustapay.ui.ticket

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.api.models.CompletedTicketSale
import de.stustapay.api.models.NewTicketSale
import de.stustapay.api.models.PaymentMethod
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.net.Response
import de.stustapay.libssp.util.ResourcesProvider
import de.stustapay.libssp.util.mapState
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ec.ECPayment
import de.stustapay.stustapay.netsource.TicketRemoteDataSource
import de.stustapay.stustapay.repository.ECPaymentRepository
import de.stustapay.stustapay.repository.ECPaymentResult
import de.stustapay.stustapay.repository.InfallibleRepository
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.stustapay.ui.common.TerminalLoginState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.math.BigDecimal
import javax.inject.Inject


enum class TicketPage(val route: String) {
    Scan("scan"), Confirm("confirm"), Done("done"), Error("aborted"),
}

sealed interface TagScanStatus {
    object NoScan : TagScanStatus
    object Scan : TagScanStatus
    object Duplicate : TagScanStatus
}


@HiltViewModel
class TicketViewModel @Inject constructor(
    private val ticketApi: TicketRemoteDataSource,
    private val terminalConfigRepository: TerminalConfigRepository,
    private val ecPaymentRepository: ECPaymentRepository,
    private val resourcesProvider: ResourcesProvider,
    private val infallibleRepository: InfallibleRepository,
) : ViewModel() {

    // navigation in views
    private val _navState = MutableStateFlow(TicketPage.Scan)
    val navState = _navState.asStateFlow()

    private val _status = MutableStateFlow("")
    val status = _status.asStateFlow()

    val requestActive = infallibleRepository.active

    // tag scanning
    private val _tagScanStatus = MutableStateFlow<TagScanStatus>(TagScanStatus.Scan)
    val tagScanStatus = _tagScanStatus.asStateFlow()

    // ticket purchase selection
    private val _ticketDraft = MutableStateFlow(TicketDraft())
    val ticketDraft = _ticketDraft.asStateFlow()

    // when we finished a ticket sale
    private val _saleCompleted = MutableStateFlow<CompletedTicketSale?>(null)
    val saleCompleted = _saleCompleted.asStateFlow()

    // configuration infos from backend
    val terminalLoginState = terminalConfigRepository.terminalConfigState.mapState(
        initialValue = TerminalLoginState(), scope = viewModelScope
    ) { terminal ->
        TerminalLoginState(terminal = terminal)
    }

    fun navTo(page: TicketPage) {
        _navState.update { page }
    }

    /**
     * how much do we have to pay? we get this from the PendingTicketSale
     */
    fun getPrice(): UInt {
        val price = _ticketDraft.value.pendingSale?.totalPrice ?: 0.0
        return (price * 100).toUInt()
    }

    /**
     *  test if a tag scan was successful, i.e. we didn't scan it previously.
     * if this returns false, the scan dialog will remain open.
     */
    fun checkTagScan(tag: NfcTag): Boolean {
        return if (_ticketDraft.value.tagKnown(tag)) {
            _tagScanStatus.update {
                TagScanStatus.Duplicate
            }
            false
        } else {
            _tagScanStatus.update {
                TagScanStatus.Scan
            }
            true
        }
    }

    /**
     * when checkTagScan above returned true, we end up here after a successful tag scan.
     * this function is only called if the tag is not already known.
     */
    suspend fun tagScanned(tag: NfcTag) {
        // duplicates were already checked by checkTagScan
        if (tag.pin == null) {
            _status.update { "no pin in tag scan" }
            return
        }

        _ticketDraft.update { oldDraft ->
            val draft = oldDraft.copy()
            draft.addScan(tag)
            if (!checkTicketDraft(draft)) {
                return@update oldDraft
            }
            _status.update { resourcesProvider.getString(R.string.ticket_valid) }
            draft
        }

    }

    private suspend fun checkTicketDraft(draft: TicketDraft): Boolean {
        val response = ticketApi.checkTicketScan(draft.getTicketScan())

        when (response) {
            is Response.OK -> {

                val scanned = response.data.scannedTickets
                if (scanned.size != draft.scans.size) {
                    _status.update { resourcesProvider.getString(R.string.ticket_unknown) }
                    return false
                }

                // this is displayed in ui
                draft.tickets = scanned.map {
                    val tag = NfcTag(
                        uid = it.customerTagUid,
                        pin = it.customerTagPin,
                    )

                    // update draft, which is used for getting the editing amount
                    val topUpAmount = it.topUpAmount
                    if (topUpAmount != null) {
                        draft.setTopUpAmount(tag, topUpAmount)
                    }

                    ScannedTicket(
                        nfcTag = tag,
                        ticket = it.ticket,
                        plannedTopUp = topUpAmount ?: 0.0,
                        accountBalance = it.account?.balance,
                        voucherToken = it.ticketVoucher?.token,
                    )
                }
                return true
            }

            is Response.Error.Service -> {
                _status.update { response.msg() }
                return false
            }

            is Response.Error -> {
                _status.update { response.msg() }
                return false
            }
        }
    }

    fun getTagTopUp(tag: NfcTag?): UInt {
        return ((_ticketDraft.value.scans[tag]?.topUpAmount ?: 0.0) * 100.0).toUInt()
    }

    suspend fun setTagTopUp(tag: NfcTag?, amount: UInt) {
        if (tag == null) {
            return
        }
        _ticketDraft.update { oldDraft ->
            val draft = oldDraft.copy()
            val amountD = amount.toDouble() / 100.0
            if (!draft.setTopUpAmount(tag, amountD)) {
                return@update oldDraft
            }
            if (!checkTicketDraft(draft)) {
                return@update oldDraft
            }
            _status.update { resourcesProvider.getString(R.string.common_action_topup_validated) }
            draft
        }
    }

    suspend fun setTagTicketVoucherToken(tag: NfcTag?, voucherToken: String) {
        if (tag == null) {
            return
        }
        _ticketDraft.update { oldDraft ->
            val draft = oldDraft.copy()
            if (!draft.setVoucherToken(tag, voucherToken)) {
                return@update oldDraft
            }
            if (!checkTicketDraft(draft)) {
                return@update oldDraft
            }
            _status.update { resourcesProvider.getString(R.string.ticket_voucher_valid) }
            draft
        }
    }

    /** when the delete-selections button is clicked */
    fun clearDraft() {
        _status.update { "cleared" }
        _tagScanStatus.update { TagScanStatus.Scan }
        _ticketDraft.update { TicketDraft() }
    }

    fun dismissSuccess() {
        clearTicketSale(success = true)
    }

    fun dismissError() {
        _navState.update { TicketPage.Scan }
        // TODO: clearTicketSale(success = false)?
    }

    /** once the sale was booked completely */
    private fun clearTicketSale(success: Boolean = false) {
        _ticketDraft.update { TicketDraft() }
        _navState.update { TicketPage.Scan }
        _saleCompleted.update { null }

        if (success) {
            // todo: some feedback during this refresh?
            viewModelScope.launch {
                terminalConfigRepository.tokenRefresh()
            }
            _status.update { resourcesProvider.getString(R.string.ticket_order_cleared_success) }
        } else {
            _status.update { resourcesProvider.getString(R.string.ticket_order_cleared) }
        }
    }

    /** test if we can sell this */
    suspend fun checkSale() {
        val draft = _ticketDraft.value

        _status.update { resourcesProvider.getString(R.string.sale_order_checking) }

        // check if the sale is nice and well
        val response = ticketApi.checkTicketSale(
            draft.getNewTicketSale(null)
        )

        when (response) {
            is Response.OK -> {
                _ticketDraft.update { draft ->
                    draft.copy(response.data)
                }
                _status.update { resourcesProvider.getString(R.string.ticket_order_validated) }

                if (response.data.totalPrice == 0.0) {
                    // when response has item and totalprice zero, skip to process sale directly!
                    processSale(paymentMethod = PaymentMethod.cash)
                }
                else {
                    _navState.update { TicketPage.Confirm }
                }
            }

            is Response.Error.Service -> {
                _status.update { response.msg() }
                _navState.update { TicketPage.Error }
            }

            is Response.Error -> {
                _status.update { response.msg() }
            }
        }
    }

    /** let's start the payment process. context needed for sumup. */
    suspend fun processSale(paymentMethod: PaymentMethod, context: Activity? = null) {
        // checks
        if (_ticketDraft.value.scans.isEmpty()) {
            _status.update { "No tags were scanned!" }
            return
        }

        val pendingSale = _ticketDraft.value.pendingSale
        if (pendingSale == null) {
            _status.update { "Ticket sales were not checked yet" }
            return
        }

        // generates a new order UUID every time.
        val newSale = _ticketDraft.value.getNewTicketSale(paymentMethod)

        // if we do cash payment, the confirmation was already presented by CashECPay
        if (paymentMethod == PaymentMethod.cash) {
            bookSale(newSale)
            return
        }

        if (context == null) {
            error("process sale for PaymentMethod.sumup needs activity as context")
        }

        // otherwise, perform ec payment
        val firstTag = _ticketDraft.value.scans.keys.first()
        val payment = ECPayment(
            id = newSale.uuid.toString(),
            amount = BigDecimal(pendingSale.totalPrice),
            tag = firstTag,
        )

        // register the sale so the backend can ask sumup for completion
        val response = ticketApi.registerTicketSale(newSale)
        when (response) {
            is Response.OK -> {
                _status.update { resourcesProvider.getString(R.string.ticket_order_announced) }
            }

            is Response.Error.Service -> {
                _status.update { response.msg() }
                _navState.update { TicketPage.Error }
                return
            }

            is Response.Error -> {
                _status.update { response.msg() }
                return
            }
        }

        when (val ecResult = ecPaymentRepository.pay(context = context, ecPayment = payment)) {
            is ECPaymentResult.Failure -> {
                // oh dear, the ec payment failed - let's tell the backend.
                ticketApi.cancelPendingTicketSale(orderUUID = newSale.uuid)
                _status.update { ecResult.msg }
            }

            is ECPaymentResult.Success -> {
                _status.update { ecResult.result.msg }
                bookSale(newSale)
            }
        }
    }

    private suspend fun bookSale(newTicketSale: NewTicketSale) {
        _saleCompleted.update { null }

        val response = infallibleRepository.bookTicketSale(newTicketSale)

        when (response) {
            is Response.OK -> {
                // delete the sale draft
                clearDraft()
                _status.update { resourcesProvider.getString(R.string.ticket_order_booked) }
                // now we have a completed sale
                _saleCompleted.update { response.data }
                _navState.update { TicketPage.Done }
            }

            is Response.Error.Service -> {
                _navState.update { TicketPage.Error }
                _status.update { response.msg() }
            }

            is Response.Error -> {
                _status.update { response.msg() }
            }
        }
    }
}