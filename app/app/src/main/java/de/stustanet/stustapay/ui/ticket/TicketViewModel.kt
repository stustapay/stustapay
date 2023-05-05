package de.stustanet.stustapay.ui.ticket

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.ec.SumUp
import de.stustanet.stustapay.model.UserTag
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
    Done("done"),
    Failure("aborted"),
}

data class TicketState(
    /** how much the user will pay */
    var payAmount: UInt = 0u,
)

enum class TicketVariant(val description: String, val price: UInt) {
    // utf8 LOVE LETTER
    Regular("\uD83D\uDC8C Ticket Normal", 1200u),
    // utf8 BEER MUG
    U18("\uD83C\uDF7A Ticket U18", 1200u),
    // utf8 DESERT ISLAND
    U16("\uD83C\uDFDD️ Ticket U16", 1200u),
}


@HiltViewModel
class TicketViewModel @Inject constructor(
    private val ticketRepository: TicketRepository,
    private val terminalConfigRepository: TerminalConfigRepository,
    private val sumUp: SumUp,
) : ViewModel() {

    private val _navState = MutableStateFlow(TicketPage.Amount)
    val navState = _navState.asStateFlow()

    private val _status = MutableStateFlow("")
    val status = _status.asStateFlow()

    private val _ticketState = MutableStateFlow(TicketState())
    val ticketState = _ticketState.asStateFlow()

    // configuration infos from backend
    val ticketConfig: StateFlow<TicketConfig> = mapTicketConfig(
        terminalConfigRepository.terminalConfigState
    )

    suspend fun fetchConfig() {
        terminalConfigRepository.fetchConfig()
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
                            amount = 20u,
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

    fun selectTicket(variant: TicketVariant) {
        TODO("Not yet implemented")
    }

    fun buyTicketWithCash(tag: UserTag) {
        TODO("Not yet implemented")
    }

    fun buyTicketWithCard(context: Activity, it: UserTag) {
        TODO()
    }
}