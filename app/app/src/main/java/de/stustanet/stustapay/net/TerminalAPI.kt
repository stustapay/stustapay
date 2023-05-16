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

    /**
     * Get possible cashier stockings.
     */
    suspend fun getCashierStockings(): Response<List<CashierStocking>>

    /**
     * Equip a cashier with a specific stocking.
     */
    suspend fun equipCashier(equip: CashierEquip): Response<Unit>

    /**
     * Get available cash registers.
     */
    suspend fun listRegisters(): Response<List<CashRegister>>

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
     * Create a user with specific roles.
     */
    suspend fun userCreate(newUser: NewUser): Response<CurrentUser>

    /**
     * Change a user's roles.
     */
    suspend fun userUpdate(updateUser: UpdateUser): Response<CurrentUser>

    /**
     * Registers a new free ticket.
     */
    suspend fun grantFreeTicket(newTicket: NewFreeTicketGrant): Response<Customer>

    /**
     * Grant drink vouchers to a customer tag
     */
    suspend fun grantVouchers(grant: GrantVouchers): Response<Customer>

    // customer
    /**
     * Get the account status for a customer tag.
     */
    suspend fun getCustomer(id: ULong): Response<Customer>

    /**
     * Move customer account to a new tag.
     */
    suspend fun switchTag(switch: SwitchTag): Response<Unit>

    // cashier
    /**
     * Move cash between a cashier and a bag.
     */
    suspend fun bookTransport(change: AccountChange): Response<Unit>

    /**
     * Move cash between a bag and the vault.
     */
    suspend fun bookVault(change: TransportAccountChange): Response<Unit>

    /**
     * Get information about cashier / orga accounts.
     */
    suspend fun getCashierInfo(tag: UserInfoPayload): Response<UserInfo>
}
