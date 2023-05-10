package de.stustanet.stustapay.ui.ticket

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.CompletedTicketSale
import de.stustanet.stustapay.model.PaymentMethod
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.TerminalConfigRepository
import de.stustanet.stustapay.repository.TerminalConfigState
import de.stustanet.stustapay.repository.TicketRepository
import de.stustanet.stustapay.util.mapState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject


enum class TicketPage(val route: String) {
    Amount("amount"),
    Scan("scan"),
    Confirm("confirm"),
    Done("done"),
    Failure("aborted"),
}

sealed interface TagScanStatus {
    object NoScan : TagScanStatus
    data class Scan(val step: Int, val wanted: Int) : TagScanStatus
    data class ScanNext(val step: Int, val wanted: Int) : TagScanStatus
    data class Duplicate(val step: Int, val wanted: Int) : TagScanStatus
}


@HiltViewModel
class TicketViewModel @Inject constructor(
    private val ticketRepository: TicketRepository,
    private val terminalConfigRepository: TerminalConfigRepository,
) : ViewModel() {

    // navigation in views
    private val _navState = MutableStateFlow(TicketPage.Amount)
    val navState = _navState.asStateFlow()

    private val _status = MutableStateFlow("")
    val status = _status.asStateFlow()

    // tag scanning
    private val _tagScanStatus = MutableStateFlow<TagScanStatus>(TagScanStatus.NoScan)
    val tagScanStatus = _tagScanStatus.asStateFlow()

    // ticket purchase selection
    private val _ticketStatus = MutableStateFlow(TicketStatus())
    val ticketDraft = _ticketStatus.asStateFlow()

    // when we finished a ticket sale
    private val _saleCompleted = MutableStateFlow<CompletedTicketSale?>(null)
    val saleCompleted = _saleCompleted.asStateFlow()

    // configuration infos from backend
    val ticketConfig: StateFlow<TicketConfig> = mapTicketConfig(
        terminalConfigRepository.terminalConfigState
    )

    suspend fun fetchConfig() {
        terminalConfigRepository.fetchConfig()
    }

    fun navTo(page: TicketPage) {
        _navState.update { page }
    }

    fun incrementButton(buttonId: Int) {
        _ticketStatus.update { status ->
            val newStatus = status.copy()
            newStatus.incrementButton(buttonId)
            newStatus
        }
    }

    fun decrementButton(buttonId: Int) {
        _ticketStatus.update { status ->
            val newStatus = status.copy()
            newStatus.decrementButton(buttonId)
            newStatus
        }
    }

    /**
     * how much do we have to pay? we get this from the PendingTicketSale
     */
    fun getPrice(): Double {
        return _ticketStatus.value.checkedSale?.total_price ?: 0.0
    }

    /** when confirming the ticket selections by button click */
    suspend fun confirmSelection() {
        // now all tickets have to be scanned
        _navState.update { TicketPage.Scan }

        continueScan()
    }


    /** when one clicks away the scan dialog */
    fun tagScanDismissed() {
        _tagScanStatus.update { TagScanStatus.NoScan }
    }

    /** one resumes scanning tickets. also triggered by button press in the scanning view */
    suspend fun continueScan() {
        if (_ticketStatus.value.allTagsScanned()) {
            checkSale()
        }
        else {
            _tagScanStatus.update {
                TagScanStatus.Scan(
                    step = _ticketStatus.value.tagScanStepNumber(),
                    wanted = _ticketStatus.value.tagScansRequired(),
                )
            }
        }
    }

    /**
     *  test if a tag scan was successful, i.e. we didn't scan it previously.
     * if this returns false, the scan dialog will remain open.
     */
    fun checkTagScan(tag: UserTag): Boolean {
        return if (_ticketStatus.value.tagKnown(tag)) {
            _tagScanStatus.update {
                TagScanStatus.Duplicate(
                    step = _ticketStatus.value.tagScanStepNumber(),
                    wanted = _ticketStatus.value.tagScansRequired(),
                )
            }
            false
        } else {
            true
        }
    }

    /**
     * when checkTagScan above returned true, we end up here after the scan dialog closed.
     */
    suspend fun tagScanned(tag: UserTag) {
        _ticketStatus.update { status ->
            val newStatus = status.copy()
            if (!newStatus.tagScanned(tag)) {
                // this tag was already scanned
                _status.update { "scan accepted even though ticket was already scanned!" }
            }
            newStatus
        }

        if (_ticketStatus.value.allTagsScanned()) {
            checkSale()
        } else {
            // scan another one
            _tagScanStatus.update {
                TagScanStatus.ScanNext(
                    step = _ticketStatus.value.tagScanStepNumber(),
                    wanted = _ticketStatus.value.tagScansRequired(),
                )
            }
        }
    }


    /** when the delete-selections button is clicked */
    suspend fun clearDraft() {
        _ticketStatus.update { TicketStatus() }
    }

    /** once the sale was booked completely */
    suspend fun clearTicketSale(success: Boolean = false) {
        _ticketStatus.update { TicketStatus() }
        _navState.update { TicketPage.Amount }
        _saleCompleted.update { null }

        if (success) {
            _status.update { "Order cleared - ready." }
        } else {
            _status.update { "Order cleared" }
        }
    }

    suspend fun checkSale() {
        val selection = _ticketStatus.value
        if (selection.buttonSelection.isEmpty()) {
            _status.update { "Nothing ordered!" }
            return
        }

        if (!selection.allTagsScanned()) {
            _status.update { "Not all tickets scanned" }
            return
        }

        _status.update { "Checking order..." }

        // check if the sale is nice and well
        val response = ticketRepository.checkTicketSale(
            // HACK: we always say Cash, because the payment method is only known after the confirmation step
            selection.getNewTicketSale(PaymentMethod.Cash)
        )

        when (response) {
            is Response.OK -> {
                _ticketStatus.update { status ->
                    val newSale = status.copy()
                    newSale.updateWithPendingTicketSale(response.data)
                    newSale
                }
                _status.update { "Ticket order validated!" }
                _navState.update { TicketPage.Confirm }
            }

            is Response.Error.Service -> {
                _status.update { response.msg() }
                _navState.update { TicketPage.Failure }
            }

            is Response.Error -> {
                _status.update { response.msg() }
            }
        }
    }

    suspend fun bookSale(paymentMethod: PaymentMethod) {
        // checks
        if (!_ticketStatus.value.allTagsScanned()) {
            _status.update { "Not all tags were scanned!" }
            return
        }

        _saleCompleted.update { null }

        val response = ticketRepository.bookTicketSale(
            _ticketStatus.value.getNewTicketSale(paymentMethod)
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
                _navState.update { TicketPage.Failure }
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
                            tickets = terminalConfig.config.ticket_buttons?.associate {
                                Pair(
                                    it.id,
                                    TicketItemConfig(
                                        it.id,
                                        it.name,
                                        it.price ?: 0.0
                                    )
                                )
                            } ?: mapOf(),
                        )
                    }

                    is TerminalConfigState.Error -> {
                        _status.update { terminalConfig.message }
                        TicketConfig()
                    }

                    is TerminalConfigState.Loading -> {
                        _status.update { "Loading config..." }
                        TicketConfig()
                    }
                }
            }
    }
}