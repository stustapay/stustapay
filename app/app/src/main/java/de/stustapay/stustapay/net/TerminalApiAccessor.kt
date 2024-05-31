package de.stustapay.stustapay.net

import android.util.Log
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import de.stustapay.api.infrastructure.HttpResponse
import de.stustapay.libssp.net.Response
import de.stustapay.libssp.net.transformResponse
import de.stustapay.stustapay.repository.RegistrationRepositoryInner
import io.ktor.serialization.JsonConvertException
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
    private val inner = TerminalApiAccessorInner(registrationRepository, retry = true)

    internal suspend inline fun <reified O : Any> execute(fn: ((acc: TerminalApiAccessorInner) -> HttpResponse<O>?)): Response<O> {
        return try {
            // res will only be null when TerminalApiAccessorInner.<subapi> is not set (because we're not registered)
            val res = fn(this.inner)
            if (res != null) {
                transformResponse(res.response)
            } else {
                Response.Error.Access("terminal not registered")
            }
        } catch (e: JsonConvertException) {
            Response.Error.BadResponse(e.localizedMessage.orEmpty())
        } catch (e: Exception) {
            Log.e("StuStaPay req", "request failed: ${e.localizedMessage}")
            Response.Error.Request(null, e)
        }
    }
}