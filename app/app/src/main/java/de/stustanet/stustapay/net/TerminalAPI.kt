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
     * Get infos about a single order.
     */
    suspend fun getOrder(orderId: Int): Response<Order>

    /**
     * Create a new order, which is not yet booked.
     */
    suspend fun checkSale(newSale: NewSale): Response<PendingSale>

    /**
     * Book a new order - this transfers the money between accounts.
     */
    suspend fun bookSale(newSale: NewSale): Response<CompletedSale>

    /**
     * Book a new order - this transfers the money between accounts.
     */
    suspend fun cancelSale(id: Int): Response<Unit>

    /**
     * Validate if the topup is ok.
     */
    suspend fun checkTopUp(newTopUp: NewTopUp): Response<PendingTopUp>

    /**
     * Book the topup, this transfers money.
     */
    suspend fun bookTopUp(newTopUp: NewTopUp): Response<CompletedTopUp>

    /**
     * Validate if giving out money is ok.
     */
    suspend fun checkPayOut(newPayOut: NewPayOut): Response<PendingPayOut>

    /**
     * Perform the payout.
     */
    suspend fun bookPayOut(newPayOut: NewPayOut): Response<CompletedPayOut>

    /**
     * Check if a ticket can be sold.
     */
    suspend fun checkTicketSale(newTicketSale: NewTicketSale): Response<PendingTicketSale>

    /**
     * Sell a ticket.
     */
    suspend fun bookTicketSale(newTicketSale: NewTicketSale): Response<CompletedTicketSale>

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
    suspend fun currentUser(): Response<CurrentUser?>

    /**
     * Check which roles a user could have have.
     */
    suspend fun checkLogin(userTag: UserTag): Response<CheckLoginResult>

    /**
     * Login a user by token.
     */
    suspend fun userLogin(payload: LoginPayload): Response<CurrentUser>

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
    suspend fun userCreateCashier(newUser: NewUser): Response<CurrentUser>

    /**
     * Create a user with Finanzorga privileges.
     */
    suspend fun userCreateFinanzorga(newUser: NewUser): Response<CurrentUser>

    /**
     * Grant drink vouchers to a customer tag
     */
    suspend fun grantVouchers(grant: GrantVouchers): Response<Account>
}
