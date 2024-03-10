package de.stustapay.stustapay.net

import android.util.Log
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
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
import io.ktor.serialization.JsonConvertException
import io.ktor.serialization.kotlinx.json.json
import io.ktor.util.reflect.instanceOf
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json
import java.net.ConnectException
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object TerminalApiAccessorModule {

    @Provides
    @Singleton
    fun providesTerminalApiAccessor(registrationLocalDataSource: RegistrationLocalDataSource): TerminalApiAccessor {
        return TerminalApiAccessor(registrationLocalDataSource)
    }
}

open class TerminalApiAccessor(
    registrationLocalDataSource: RegistrationLocalDataSource
) {
    private val inner = TerminalApiAccessorInner(registrationLocalDataSource)

    internal suspend inline fun <reified O : Any> execute(fn: ((acc: TerminalApiAccessorInner) -> HttpResponse<O>)): Response<O> {
        return try {
            transformResponse(fn(this.inner).response)
        } catch (e: Exception) {
            Response.Error.Request(null, e)
        }
    }
}