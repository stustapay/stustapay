package de.stustanet.stustapay.net

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object TerminalAPIModule {

    @Provides
    @Singleton
    fun providesTerminalAPI(): TerminalAPI {
        return TerminalHTTPAPI()
    }
}

interface TerminalAPI {
    suspend fun getHealthStatus(apiUrl: String): String

    /**
     * Register this terminal to the core.
     */
    suspend fun register(apiUrl: String, registrationToken: String) : RegisterResult
}