package de.stustapay.stustapay.util

import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class Infallible @Inject constructor() {
    val scope: CoroutineScope = CoroutineScope(Dispatchers.Default + CoroutineName("infallible"))

    suspend fun make(f: suspend () -> InfallibleResult) {
        scope.launch {
            while (f() != InfallibleResult.Ok) {
                delay(1000)
            }
        }
    }
}

enum class InfallibleResult {
    Ok,
    Err
}