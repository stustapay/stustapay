package de.stustapay.stustapay.net

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import de.stustapay.api.infrastructure.HttpResponse
import de.stustapay.libssp.net.Response
import de.stustapay.libssp.net.transformResponse
import de.stustapay.stustapay.storage.RegistrationLocalDataSource
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