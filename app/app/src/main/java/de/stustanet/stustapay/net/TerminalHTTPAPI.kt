package de.stustanet.stustapay.net

import de.stustanet.stustapay.model.*
import de.stustanet.stustapay.storage.RegistrationLocalDataSource
import kotlinx.coroutines.flow.first
import kotlinx.serialization.Serializable
import javax.inject.Inject


/**
 * contact the terminal api via http.
 */
class TerminalHTTPAPI @Inject constructor(
    private val regLocalStatus: RegistrationLocalDataSource,
) : TerminalAPI {

    /**
     * create a http client that can fetch base url and login token
     * through our current api registration state.
     */
    private val client: HttpClient = HttpClient {
        regLocalStatus.registrationState.first()
    }

    // base
    override suspend fun getTerminalConfig(): Response<TerminalConfig> {
        return client.get("config")
    }

    override suspend fun getHealthStatus(apiUrl: String): Response<HealthStatus> {
        return client.get("health", basePath = apiUrl)
    }

    override suspend fun getCashierStockings(): Response<List<CashierStocking>> {
        return client.get("cash-register-stockings")
    }

    override suspend fun equipCashier(equip: CashierEquip): Response<Unit> {
        return client.post("stock-up-cash-register") { equip }
    }

    override suspend fun listRegisters(): Response<List<CashRegister>> {
        return client.get("cash-registers")
    }

    // order
    override suspend fun listOrders(): Response<List<Order>> {
        return client.get("order")
    }

    override suspend fun getOrder(orderId: Int): Response<Order> {
        return client.get("order/$orderId")
    }

    override suspend fun checkSale(newSale: NewSale): Response<PendingSale> {
        return client.post("order/check-sale") { newSale }
    }

    override suspend fun bookSale(newSale: NewSale): Response<CompletedSale> {
        return client.post("order/book-sale") { newSale }
    }

    override suspend fun cancelSale(id: Int): Response<Unit> {
        return client.post<Unit, Unit>("order/$id/cancel")
    }

    override suspend fun checkTopUp(newTopUp: NewTopUp): Response<PendingTopUp> {
        return client.post("order/check-topup") { newTopUp }
    }

    override suspend fun bookTopUp(newTopUp: NewTopUp): Response<CompletedTopUp> {
        return client.post("order/book-topup") { newTopUp }
    }

    override suspend fun checkTicketSale(newTicketSale: NewTicketSale): Response<PendingTicketSale> {
        return client.post("order/check-ticket-sale") { newTicketSale }
    }

    override suspend fun bookTicketSale(newTicketSale: NewTicketSale): Response<CompletedTicketSale> {
        return client.post("order/book-ticket-sale") { newTicketSale }
    }

    override suspend fun checkPayOut(newPayOut: NewPayOut): Response<PendingPayOut> {
        return client.post("order/check-payout") { newPayOut }
    }

    override suspend fun bookPayOut(newPayOut: NewPayOut): Response<CompletedPayOut> {
        return client.post("order/book-payout") { newPayOut }
    }

    // auth
    /**
     * register the terminal at the till.
     * special implementation: we don't have an api endpoint or key yet,
     * therefore the request has to be done manually.
     */
    override suspend fun register(
        startApiUrl: String,
        registrationToken: String
    ): Response<TerminalRegistrationSuccess> {
        var apiUrl = startApiUrl.removeSuffix("/")

        @Serializable
        data class RegistrationRequest(
            val registration_uuid: String
        )

        return client.post("auth/register_terminal", basePath = apiUrl) {
            RegistrationRequest(registrationToken)
        }
    }

    override suspend fun deregister(): Response<Unit> {
        return client.post<Unit, Unit>("auth/logout_terminal")
    }


    // user
    override suspend fun currentUser(): Response<CurrentUser?> {
        return client.get("user")
    }

    override suspend fun checkLogin(userTag: UserTag): Response<CheckLoginResult> {
        return client.post("user/check-login") { userTag }
    }

    override suspend fun userLogin(payload: LoginPayload): Response<CurrentUser> {
        return client.post("user/login") { payload }
    }

    override suspend fun userLogout(): Response<Unit> {
        return client.post<Unit, Unit>("user/logout")
    }

    override suspend fun userCreate(newUser: NewUser): Response<CurrentUser> {
        return client.post("user/create-user") { newUser }
    }

    override suspend fun userUpdate(updateUser: UpdateUser): Response<CurrentUser> {
        return client.post("user/update-user-roles") { updateUser }
    }

    override suspend fun grantFreeTicket(newTicket: NewFreeTicketGrant): Response<Customer> {
        return client.post("user/grant-free-ticket") { newTicket }
    }

    override suspend fun grantVouchers(grant: GrantVouchers): Response<Customer> {
        return client.post("user/grant-vouchers") { grant }
    }

    // customer
    override suspend fun getCustomer(id: ULong): Response<Customer> {
        return client.get("customer/$id")
    }

    override suspend fun switchTag(switch: SwitchTag): Response<Unit> {
        return client.post("customer/switch_tag") { switch }
    }

    // cashier
    override suspend fun bookTransport(change: AccountChange): Response<Unit> {
        return client.post("change-cash-register-balance") { change }
    }

    override suspend fun bookVault(change: TransportAccountChange): Response<Unit> {
        return client.post("change-transport-register-balance") { change }
    }

    override suspend fun getCashierInfo(tag: UserInfoPayload): Response<UserInfo> {
        return client.post("user-info") { tag }
    }
}
