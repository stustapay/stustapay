package de.stustanet.stustapay.ui.ticket

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.ec.ECPayment
import de.stustanet.stustapay.model.CompletedTicketSale
import de.stustanet.stustapay.model.NewTicketScan
import de.stustanet.stustapay.model.PaymentMethod
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.ECPaymentRepository
import de.stustanet.stustapay.repository.ECPaymentResult
import de.stustanet.stustapay.repository.TerminalConfigRepository
import de.stustanet.stustapay.repository.TerminalConfigState
import de.stustanet.stustapay.repository.TicketRepository
import de.stustanet.stustapay.util.mapState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.math.BigDecimal
import javax.inject.Inject


enum class TicketPage(val route: String) {
    Scan("scan"),
    Confirm("confirm"),
    Done("done"),
    Error("aborted"),
}

sealed interface TagScanStatus {
    object NoScan : TagScanStatus
    object Scan : TagScanStatus
    object Duplicate : TagScanStatus
}


@HiltViewModel
class TicketViewModel @Inject constructor(
    private val ticketRepository: TicketRepository,
    private val terminalConfigRepository: TerminalConfigRepository,
    private val ecPaymentRepository: ECPaymentRepository,
) : ViewModel() {

    // navigation in views
    private val _navState = MutableStateFlow(TicketPage.Scan)
    val navState = _navState.asStateFlow()

    private val _status = MutableStateFlow("")
    val status = _status.asStateFlow()

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
    val ticketConfig: StateFlow<TicketConfig> = mapTicketConfig(
        terminalConfigRepository.terminalConfigState
    )

    fun navTo(page: TicketPage) {
        _navState.update { page }
    }

    /**
     * how much do we have to pay? we get this from the PendingTicketSale
     */
    fun getPrice(): UInt {
        val price = _ticketDraft.value.checkedSale?.total_price ?: 0.0
        return (price * 100).toUInt()
    }

    /**
     *  test if a tag scan was successful, i.e. we didn't scan it previously.
     * if this returns false, the scan dialog will remain open.
     */
    fun checkTagScan(tag: UserTag): Boolean {
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
    suspend fun tagScanned(tag: UserTag) {
        val response = ticketRepository.checkTicketScan(
            NewTicketScan(
                customer_tag_uids = listOf(tag.uid)
            )
        )

        when (response) {
            is Response.OK -> {
                _ticketDraft.update { status ->
                    val scanned = response.data.scanned_tickets
                    if (scanned.isEmpty()) {
                        _status.update { "ticket unknown" }
                        return
                    }

                    val scanResult = scanned[0]
                    if (scanResult.customer_tag_uid != tag.uid) {
                        _status.update { "returned ticket id != ticket unknown" }
                        return
                    }

                    val newStatus = status.copy()
                    val ret = newStatus.addTicket(
                        ScannedTicket(
                            tag = tag,
                            ticket = scanResult.ticket
                        )
                    )
                    if (!ret) {
                        _status.update { "failed to store new ticket" }
                    }
                    newStatus
                }
                _status.update { "Ticket order validated!" }
            }

            is Response.Error.Service -> {
                _status.update { response.msg() }
            }

            is Response.Error -> {
                _status.update { response.msg() }
            }
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
    }

    /** once the sale was booked completely */
    private fun clearTicketSale(success: Boolean = false) {
        _ticketDraft.update { TicketDraft() }
        _navState.update { TicketPage.Scan }
        _saleCompleted.update { null }

        if (success) {
            _status.update { "Order cleared - ready." }
        } else {
            _status.update { "Order cleared" }
        }
    }

    /** test if we can sell this */
    suspend fun checkSale() {
        val selection = _ticketDraft.value

        _status.update { "Checking order..." }

        // check if the sale is nice and well
        val response = ticketRepository.checkTicketSale(
            // HACK: we always say Cash, because the payment method is only known after the confirmation step
            selection.getNewTicketSale(PaymentMethod.Cash)
        )

        when (response) {
            is Response.OK -> {
                _ticketDraft.update { status ->
                    val newSale = status.copy()
                    newSale.updateWithPendingTicketSale(response.data)
                    newSale
                }
                _status.update { "Ticket order validated!" }
                _navState.update { TicketPage.Confirm }
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

    /** let's start the payment process */
    suspend fun processSale(context: Activity, paymentMethod: PaymentMethod) {
        // checks
        if (_ticketDraft.value.scans.isEmpty()) {
            _status.update { "Not all tags were scanned!" }
            return
        }

        val checkedSale = _ticketDraft.value.checkedSale
        if (checkedSale == null) {
            _status.update { "no ticket sale check present" }
            return
        }


        // if we do cash payment, the confirmation was already presented by CashECPay
        if (paymentMethod == PaymentMethod.Cash) {
            bookSale(paymentMethod = PaymentMethod.Cash)
            return
        }

        // otherwise, perform ec payment
        val payment = ECPayment(
            id = checkedSale.uuid,
            amount = BigDecimal(checkedSale.total_price),
            tag = _ticketDraft.value.scans[0].tag,
        )

        when (val ecResult = ecPaymentRepository.pay(context = context, ecPayment = payment)) {
            is ECPaymentResult.Failure -> {
                _status.update { ecResult.msg }
            }

            is ECPaymentResult.Success -> {
                _status.update { ecResult.result.msg }
                bookSale(PaymentMethod.SumUp)
            }
        }
    }

    private suspend fun bookSale(paymentMethod: PaymentMethod) {
        _saleCompleted.update { null }

        val response = ticketRepository.bookTicketSale(
            _ticketDraft.value.getNewTicketSale(paymentMethod)
        )

        when (response) {
            is Response.OK -> {
                // delete the sale draft
                clearDraft()
                _status.update { "Order booked!" }
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

    private fun mapTicketConfig(
        terminalConfigFlow: StateFlow<TerminalConfigState>,
    ): StateFlow<TicketConfig> {

        return terminalConfigFlow
            .mapState(TicketConfig(), viewModelScope) { terminalConfig ->
                when (terminalConfig) {
                    is TerminalConfigState.Success -> {
                        _status.update { "ready" }
                        TicketConfig(
                            ready = true,
                            tillName = terminalConfig.config.name,
                        )
                    }

                    is TerminalConfigState.Error -> {
                        _status.update { terminalConfig.message }
                        TicketConfig()
                    }

                    is TerminalConfigState.NoConfig -> {
                        _status.update { "Loading config..." }
                        TicketConfig()
                    }
                }
            }
    }
}