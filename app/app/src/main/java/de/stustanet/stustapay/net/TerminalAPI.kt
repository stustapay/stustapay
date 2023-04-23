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
    // base
    /**
     * configuration values for the terminal.
     */
    suspend fun getTerminalConfig(): Response<TerminalConfig>

    /**
     * get health information at this api url.
     */
    suspend fun getHealthStatus(apiUrl: String): Response<HealthStatus>

    // order
    /**
     * List orders of this till.
     */
    suspend fun listOrders(): Response<List<Order>>

    /**
     * Create a new order, which is not yet booked.
     */
    suspend fun checkSale(newSale: NewSale): Response<PendingSale>

    /**
     * Book a new order - this transfers the money between accounts.
     */
    suspend fun bookSale(newSale: NewSale): Response<CompletedSale>

    /**
     * Get infos about a single order.
     */
    suspend fun checkTopUp(newTopUp: NewTopUp): Response<PendingTopUp>

    /**
     * Book a new order - this transfers the money between accounts.
     */
    suspend fun bookTopUp(newTopUp: NewTopUp): Response<CompletedTopUp>

    /**
     * Get infos about a single order.
     */
    suspend fun getOrder(orderId: Int): Response<Order>

    // auth
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

    // user
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

    /**
     * Create a user with cashier privileges.
     */
    suspend fun userCreateCashier(newUser: NewUser): Response<User>

    /**
     * Create a user with Finanzorga privileges.
     */
    suspend fun userCreateFinanzorga(newUser: NewUser): Response<User>
}
