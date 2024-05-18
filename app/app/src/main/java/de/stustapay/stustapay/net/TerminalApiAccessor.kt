package de.stustapay.stustapay.net

import com.sumup.android.logging.Log
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
    private val inner = TerminalApiAccessorInner(registrationRepository)

    internal suspend inline fun <reified O : Any> execute(fn: ((acc: TerminalApiAccessorInner) -> HttpResponse<O>?)): Response<O> {
        return try {
            val res = fn(this.inner)
            if (res != null) {
                transformResponse(res.response)
            } else {
                Response.Error.Request("not registered")
            }
        } catch (e: JsonConvertException) {
            Response.Error.BadResponse(e.localizedMessage.orEmpty())
        } catch (e: Exception) {
            Response.Error.Request(null, e)
        }
    }
}