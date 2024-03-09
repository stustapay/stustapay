package de.stustapay.stustapay.net

import android.util.Log
import de.stustapay.api.apis.AuthApi
import de.stustapay.api.apis.BaseApi
import de.stustapay.api.apis.CashierApi
import de.stustapay.api.apis.CustomerApi
import de.stustapay.api.apis.OrderApi
import de.stustapay.api.apis.UserApi
import de.stustapay.api.infrastructure.HttpResponse
import de.stustapay.stustapay.model.RegistrationState
import de.stustapay.stustapay.storage.RegistrationLocalDataSource
import io.ktor.client.HttpClientConfig
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.HttpRequestRetry
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logger
import io.ktor.client.plugins.logging.Logging
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json

class TerminalApiAccessorImpl(
    private val registrationLocalDataSource: RegistrationLocalDataSource,
    private val retry: Boolean = false,
    private val logRequests: Boolean = true
) : TerminalApiAccessor {
    private var authApi =
        AuthApi("http://localhost", CIO.create { this.https {} }) { configureApi(it) }
    private var baseApi =
        BaseApi("http://localhost", CIO.create { this.https {} }) { configureApi(it) }
    private var cashierApi =
        CashierApi("http://localhost", CIO.create { this.https {} }) { configureApi(it) }
    private var customerApi =
        CustomerApi("http://localhost", CIO.create { this.https {} }) { configureApi(it) }
    private var orderApi =
        OrderApi("http://localhost", CIO.create { this.https {} }) { configureApi(it) }
    private var userApi =
        UserApi("http://localhost", CIO.create { this.https {} }) { configureApi(it) }

    fun configureApi(conf: HttpClientConfig<*>) {
        conf.install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }

        if (retry) {
            conf.install(HttpRequestRetry) {
                retryOnServerErrors(maxRetries = 5)
                retryOnException(maxRetries = 3, retryOnTimeout = true)
                exponentialDelay()
            }
        }

        conf.install(HttpTimeout) {
            connectTimeoutMillis = 5000
            requestTimeoutMillis = 10000
            socketTimeoutMillis = 10000
        }

        if (logRequests) {
            conf.install(Logging) {
                level = LogLevel.ALL
                logger = object : Logger {
                    override fun log(message: String) {
                        Log.d("StuStaPay req", message)
                    }
                }
            }
        }

        conf.expectSuccess = false

        conf.install(Logging)
    }

    suspend fun checkRegistration(): Boolean {
        return when (val reg = registrationLocalDataSource.registrationState.first()) {
            is RegistrationState.Registered -> {
                authApi = AuthApi(reg.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                baseApi = BaseApi(reg.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                cashierApi = CashierApi(reg.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                customerApi = CustomerApi(reg.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                orderApi = OrderApi(reg.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                userApi = UserApi(reg.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                authApi.setAccessToken(reg.token)
                baseApi.setAccessToken(reg.token)
                cashierApi.setAccessToken(reg.token)
                customerApi.setAccessToken(reg.token)
                orderApi.setAccessToken(reg.token)
                userApi.setAccessToken(reg.token)
                true
            }
            is RegistrationState.NotRegistered -> {
                false
            }
            is RegistrationState.Error -> {
                false
            }
        }
    }

    override suspend fun auth(): AuthApi {
        checkRegistration()
        return authApi
    }

    override suspend fun base(): BaseApi {
        checkRegistration()
        return baseApi
    }

    override suspend fun cashier(): CashierApi {
        checkRegistration()
        return cashierApi
    }

    override suspend fun customer(): CustomerApi {
        checkRegistration()
        return customerApi
    }

    override suspend fun order(): OrderApi {
        checkRegistration()
        return orderApi
    }

    override suspend fun user(): UserApi {
        checkRegistration()
        return userApi
    }
}