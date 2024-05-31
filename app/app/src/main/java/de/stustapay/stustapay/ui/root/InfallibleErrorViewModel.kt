package de.stustapay.stustapay.ui.root

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.stustapay.repository.InfallibleRepository
import de.stustapay.stustapay.repository.InfallibleState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject


@HiltViewModel
class InfallibleErrorViewModel @Inject constructor(
    private val infallibleRepository: InfallibleRepository
) : ViewModel() {


    val state = infallibleRepository.state.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = InfallibleState.Hide,
    )

    private val clickCounter = MutableStateFlow(0)

    fun resetClicker() {
        clickCounter.update { 0 }
    }

    fun bypass() {
        clickCounter.update { it + 1 }
        if (clickCounter.value > 20) {
            viewModelScope.launch {
                infallibleRepository.clear()
            }
        }
    }

    /** retry button action */
    fun retry() {
        viewModelScope.launch {
            infallibleRepository.retry()
        }
    }

    /** after requests were successful */
    fun dismiss() {
        viewModelScope.launch {
            infallibleRepository.dismissSuccess()
        }
    }
}