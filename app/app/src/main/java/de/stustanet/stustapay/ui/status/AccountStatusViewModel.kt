package de.stustanet.stustapay.ui.status

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class AccountStatusViewModel @Inject constructor(): ViewModel() {
    private val tagId = MutableStateFlow(0uL)

    val uiState: StateFlow<AccountStatusUiState> = tagId.map { id ->
        AccountStatusUiState(
            id = id.toString()
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = AccountStatusUiState()
    )

    fun fetchData(id: ULong) {
        tagId.value = id
    }
}

data class AccountStatusUiState(
    val id: String = ""
)