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
import io.ktor.client.network.sockets.ConnectTimeoutException
import io.ktor.client.network.sockets.SocketTimeoutException
import io.ktor.client.plugins.HttpRequestTimeoutException
import io.ktor.serialization.JsonConvertException
import java.io.Closeable
import java.net.UnknownHostException
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

/**
 * High-level API accessor that handles connection failures and manages the lifecycle of 
 * the inner implementation. This class allows client code to interact with the API without
 * knowing the details of connection handling.
 */
open class TerminalApiAccessor(
    registrationRepository: RegistrationRepositoryInner
) : Closeable {
    private val inner = TerminalApiAccessorInner(registrationRepository.registrationState, retry = true)

    /**
     * Executes an API call and handles failures appropriately
     */
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
            Log.e("TeamFestlichPay req", "JSON conversion error: ${e.localizedMessage}")
            Response.Error.BadResponse(e.localizedMessage.orEmpty())
        } catch (e: ConnectTimeoutException) {
            // Connection timeouts can indicate network issues
            Log.e("TeamFestlichPay req", "Connection timeout: ${e.localizedMessage}")
            recordConnectionIssue()
            Response.Error.Request(null, e)
        } catch (e: SocketTimeoutException) {
            // Socket timeouts can indicate network issues
            Log.e("TeamFestlichPay req", "Socket timeout: ${e.localizedMessage}")
            recordConnectionIssue()
            Response.Error.Request(null, e)
        } catch (e: HttpRequestTimeoutException) {
            // HTTP request timeouts can indicate network issues
            Log.e("TeamFestlichPay req", "HTTP request timeout: ${e.localizedMessage}")
            recordConnectionIssue()
            Response.Error.Request(null, e)
        } catch (e: UnknownHostException) {
            // DNS resolution failures
            Log.e("TeamFestlichPay req", "Unknown host: ${e.localizedMessage}")
            recordConnectionIssue()
            Response.Error.Request(null, e)
        } catch (e: Exception) {
            Log.e("TeamFestlichPay req", "Request failed: ${e::class.simpleName} - ${e.localizedMessage}")
            // Only record as connection issue if it appears to be network-related
            if (isNetworkRelated(e)) {
                recordConnectionIssue()
            }
            Response.Error.Request(null, e)
        }
    }
    
    /**
     * Determine if an exception appears to be network-related
     */
    private fun isNetworkRelated(e: Exception): Boolean {
        val message = e.message?.lowercase() ?: ""
        return message.contains("network") ||
               message.contains("connection") ||
               message.contains("socket") ||
               message.contains("timeout") ||
               message.contains("host") ||
               message.contains("dns") ||
               message.contains("route")
    }
    
    /**
     * Record a connection issue and potentially trigger client reset
     */
    private fun recordConnectionIssue() {
        inner.recordConnectionFailure()
    }
    
    /**
     * Force reset the network client - can be called when the app detects
     * persistent connection issues
     */
    fun resetNetworkClient() {
        Log.i("TeamFestlichPay", "Manual network client reset requested")
        inner.resetClient()
    }
    
    /**
     * Clean up resources when no longer needed
     */
    override fun close() {
        inner.close()
    }
}
