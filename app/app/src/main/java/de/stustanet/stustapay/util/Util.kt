package de.stustanet.stustapay.util

import androidx.navigation.NavHostController
import de.stustanet.stustapay.ui.nav.NavDest
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

/** because kotlin is so special and doesn't support variadic templates. next time let's use C++ :) */
inline fun <T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, R> combine(
    flow1: Flow<T1>,
    flow2: Flow<T2>,
    flow3: Flow<T3>,
    flow4: Flow<T4>,
    flow5: Flow<T5>,
    flow6: Flow<T6>,
    flow7: Flow<T7>,
    flow8: Flow<T8>,
    flow9: Flow<T9>,
    flow10: Flow<T10>,
    crossinline transform: suspend (T1, T2, T3, T4, T5, T6, T7, T8, T9, T10) -> R
): Flow<R> {
    return kotlinx.coroutines.flow.combine(
        flow1,
        flow2,
        flow3,
        flow4,
        flow5,
        flow6,
        flow7,
        flow8,
        flow9,
        flow10
    ) { args: Array<*> ->
        @Suppress("UNCHECKED_CAST")
        transform(
            args[0] as T1,
            args[1] as T2,
            args[2] as T3,
            args[3] as T4,
            args[4] as T5,
            args[5] as T6,
            args[6] as T7,
            args[7] as T8,
            args[8] as T9,
            args[9] as T10
        )
    }
}

/**
 * automatic wrapping as "optional" type.
 */
sealed interface Result<out T> {
    data class Success<T>(val data: T) : Result<T>
    data class Error(val exception: Throwable? = null) : Result<Nothing>
    object Loading : Result<Nothing>
}

/**
 * convert a flow to a flow of results.
 *
 * inject the loading element before the success elements flow.
 * when there's an exception during collection, add an error element.
 */
fun <T> Flow<T>.asResult(): Flow<Result<T>> {
    return this
        .map<T, Result<T>> {
            Result.Success(it)
        }
        .onStart { emit(Result.Loading) }
        .catch { emit(Result.Error(it)) }
}

/**
 * collect from two flow simultaneously, since we're waiting for collection on both in separate coroutines.
 */
fun <T> Flow<T>.merge(other: Flow<T>): Flow<T> = channelFlow {
    launch {
        collect { send(it) }
    }
    other.collect { send(it) }
}