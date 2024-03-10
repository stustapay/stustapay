package de.stustapay.stustapay.net

import android.util.Log
import de.stustapay.api.apis.AuthApi
import de.stustapay.api.apis.BaseApi
import de.stustapay.api.apis.CashierApi
import de.stustapay.api.apis.CustomerApi
import de.stustapay.api.apis.OrderApi
import de.stustapay.api.apis.UserApi
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
import kotlinx.coroutines.flow.onEach
import kotlinx.serialization.json.Json

class TerminalApiAccessorInner(
    registrationLocalDataSource: RegistrationLocalDataSource,
    private val retry: Boolean = false,
    private val logRequests: Boolean = true
) {
    private var authApi: AuthApi? = null
    private var baseApi: BaseApi? = null
    private var cashierApi: CashierApi? = null
    private var customerApi: CustomerApi? = null
    private var orderApi: OrderApi? = null
    private var userApi: UserApi? = null

    init {
        registrationLocalDataSource.registrationState.onEach {
            when (it) {
                is RegistrationState.Registered -> {
                    if (authApi == null) {
                        authApi =
                            AuthApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                        baseApi =
                            BaseApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                        cashierApi = CashierApi(it.apiUrl,
                            CIO.create { this.https {} }) { configureApi(it) }
                        customerApi = CustomerApi(it.apiUrl,
                            CIO.create { this.https {} }) { configureApi(it) }
                        orderApi =
                            OrderApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                        userApi =
                            UserApi(it.apiUrl, CIO.create { this.https {} }) { configureApi(it) }
                        authApi!!.setAccessToken(it.token)
                        baseApi!!.setAccessToken(it.token)
                        cashierApi!!.setAccessToken(it.token)
                        customerApi!!.setAccessToken(it.token)
                        orderApi!!.setAccessToken(it.token)
                        userApi!!.setAccessToken(it.token)
                    }
                }

                is RegistrationState.NotRegistered -> {}
                is RegistrationState.Error -> {}
            }
        }
    }

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

    fun auth(): AuthApi {
        return authApi!!
    }

    fun base(): BaseApi {
        return baseApi!!
    }

    fun cashier(): CashierApi {
        return cashierApi!!
    }

    fun customer(): CustomerApi {
        return customerApi!!
    }

    fun order(): OrderApi {
        return orderApi!!
    }

    fun user(): UserApi {
        return userApi!!
    }
}