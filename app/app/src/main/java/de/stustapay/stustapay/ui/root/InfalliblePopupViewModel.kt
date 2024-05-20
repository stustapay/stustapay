package de.stustapay.stustapay.ui.root

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.stustapay.repository.InfallibleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class InfalliblePopupViewModel @Inject constructor(
    private val infallibleRepository: InfallibleRepository
) : ViewModel() {
    val infallibleTooManyFailues = infallibleRepository.tooManyFailures.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = false,
    )

    val infallibleRequest = infallibleRepository.currentRequest.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = null,
    )

    val resultTopUp = infallibleRepository.resultTopUp.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = null,
    )

    val resultTicketSale = infallibleRepository.resultTicketSale.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = null,
    )

    private val clickCounter = MutableStateFlow(0)

    fun reset() {
        clickCounter.update { 0 }
    }

    fun click() {
        clickCounter.update { it + 1 }
        if (clickCounter.value > 20) {
            viewModelScope.launch {
                infallibleRepository.clear()
            }
        }
    }
}