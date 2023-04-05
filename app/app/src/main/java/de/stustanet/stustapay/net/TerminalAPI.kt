package de.stustanet.stustapay.net

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import de.stustanet.stustapay.model.*
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
                return "Exception: ${throwable.localizedMessage}"
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
     * get health information at this api url.
     */
    suspend fun getHealthStatus(apiUrl: String): Response<HealthStatus>

    /**
     * Register this terminal to the core.
     */
    suspend fun register(
        startApiUrl: String,
        registrationToken: String
    ): Response<TerminalRegistrationSuccess>

    /**
     * Tell the core to deregister the terminal.
     */
    suspend fun deregister(): Response<Unit>

    /**
     * Create a new order, which is not yet booked.
     */
    suspend fun createOrder(newOrder: NewOrder): Response<PendingOrder>

    /**
     * Get the button configuration of the terminal.
     */
    suspend fun getTerminalConfig(): Response<TerminalConfig>

    /**
     * Get the currently logged in user.
     */
    suspend fun currentUser(): Response<User?>

    /**
     * Login a user by token.
     */
    suspend fun userLogin(userTag: UserTag): Response<User>

    /**
     * Logout the current user.
     */
    suspend fun userLogout(): Response<Unit>
}
