package de.stustanet.stustapay.ui.order

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class OrderViewModel @Inject constructor() : ViewModel() {
    private val _currentOrder = MutableStateFlow(mapOf<String, Int>())
    private val _products: Map<String, Pair<String, Float>> = mapOf(
        Pair("bier", Pair("Bier", 3.5F)),
        Pair("mass", Pair("Maß", 6F)),
        Pair("radler", Pair("Radler", 3.5F)),
        Pair("spezi", Pair("Spezi", 3.5F)),
        Pair("weissbier", Pair("Weißbier", 3.5F)),
        Pair("pfand", Pair("Pfand", 2F)),
        Pair("pfand_ret", Pair("Pfand zurück", -2F))
    )

    val uiState = _currentOrder.map { currentOrder ->
        OrderUiState(
            currentOrder = currentOrder,
            products = _products
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = OrderUiState()
    )

    fun incrementOrderProduct(product: String) {
        if (_currentOrder.value.contains(product)) {
            _currentOrder.value += Pair(product, _currentOrder.value[product]!! + 1)
        } else {
            _currentOrder.value += Pair(product, 1)
        }
    }

    fun decrementOrderProduct(product: String) {
        if (_currentOrder.value.contains(product)) {
            if (_currentOrder.value[product]!! > 0) {
                _currentOrder.value += Pair(product, _currentOrder.value[product]!! - 1)
            }
        } else {
            _currentOrder.value += Pair(product, 0)
        }
    }

    fun clearOrder() {
        _currentOrder.value = HashMap()
    }
}

data class OrderUiState(
    var currentOrder: Map<String, Int> = mapOf(),
    var products: Map<String, Pair<String, Float>> = mapOf()
)
