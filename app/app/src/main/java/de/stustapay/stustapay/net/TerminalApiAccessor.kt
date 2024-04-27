package de.stustapay.stustapay.net

import android.util.Log
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import de.stustapay.api.infrastructure.HttpResponse
import de.stustapay.libssp.net.Response
import de.stustapay.libssp.net.transformResponse
import de.stustapay.stustapay.repository.RegistrationRepository
import de.stustapay.stustapay.repository.RegistrationRepositoryInner
import de.stustapay.stustapay.storage.RegistrationLocalDataSource
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object TerminalApiAccessorModule {

    @Provides
    @Singleton
    fun providesTerminalApiAccessor(registrationRepository: RegistrationRepositoryInner): TerminalApiAccessor {
        return TerminalApiAccessor(registrationRepository)
    }
}

open class TerminalApiAccessor(
    registrationRepository: RegistrationRepositoryInner
) {
    private val inner = TerminalApiAccessorInner(registrationRepository)

    internal suspend inline fun <reified O : Any> execute(fn: ((acc: TerminalApiAccessorInner) -> HttpResponse<O>?)): Response<O> {
        return try {
            val res = fn(this.inner)
            if (res != null) {
                transformResponse(res.response)
            } else {
                Response.Error.Request("not registered")
            }
        } catch (e: Exception) {
            Response.Error.Request(null, e)
        }
    }
}