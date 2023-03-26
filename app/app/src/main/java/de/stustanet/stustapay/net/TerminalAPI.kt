package de.stustanet.stustapay.net

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import de.stustanet.stustapay.model.NewOrder
import de.stustanet.stustapay.model.PendingOrder
import de.stustanet.stustapay.model.TerminalRegistrationSuccess
import de.stustanet.stustapay.storage.RegistrationLocalDataSource
import java.util.*
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object TerminalAPIModule {

    @Provides
    @Singleton
    fun providesTerminalAPI(registrationLocalDataSource: RegistrationLocalDataSource): TerminalAPI {
        return TerminalHTTPAPI(registrationLocalDataSource)
    }
}


/**
 * communication api response result type.
 * T: success type
 * E: deserialized error body type
 */
sealed class Response<out T> {
    data class OK<T>(val data: T) : Response<T>()
    sealed class Error : Response<Nothing>() {
        abstract fun msg(): String

        data class Exception(val throwable: Throwable) : Error() {
            override fun msg(): String {
                return throwable.localizedMessage
            }
        }

        data class Msg(val msg: String, val code: Int? = null) : Error() {
            override fun msg(): String {
                return msg
            }
        }
    }
}


interface TerminalAPI {
    /**
     * Register this terminal to the core.
     */
    suspend fun register(
        startApiUrl: String,
        registrationToken: String
    ): Response<TerminalRegistrationSuccess>

    /**
     * Create a new order, which is not yet booked.
     */
    suspend fun createOrder(newOrder: NewOrder): Response<PendingOrder>
}