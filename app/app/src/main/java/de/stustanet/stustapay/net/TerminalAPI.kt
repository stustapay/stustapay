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
     * Book a new order - this transfers the money between accounts.
     */
    suspend fun processOrder(id: Int): Response<CompletedOrder>

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

    /**
     * Get the account status for a customer tag.
     */
    suspend fun getCustomer(id: ULong): Response<Account>
}
