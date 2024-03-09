package de.stustapay.stustapay.net

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
import de.stustapay.stustapay.storage.RegistrationLocalDataSource
import io.ktor.serialization.JsonConvertException
import java.net.ConnectException
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object TerminalApiAccessorModule {

    @Provides
    @Singleton
    fun providesTerminalApiAccessor(registrationLocalDataSource: RegistrationLocalDataSource): TerminalApiAccessor {
        return TerminalApiAccessorImpl(registrationLocalDataSource)
    }
}

interface TerminalApiAccessor {
    suspend fun auth(): AuthApi
    suspend fun base(): BaseApi
    suspend fun cashier(): CashierApi
    suspend fun customer(): CustomerApi
    suspend fun order(): OrderApi
    suspend fun user(): UserApi
}

suspend inline fun <reified O : Any> TerminalApiAccessor.execute(fn: ((acc: TerminalApiAccessor) -> HttpResponse<O>)): Response<O> {
    return try {
        transformResponse(fn(this).response)
    } catch (e: Exception) {
        Response.Error.Request(null, e)
    }
}