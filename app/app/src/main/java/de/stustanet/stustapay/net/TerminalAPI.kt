package de.stustanet.stustapay.net

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import de.stustanet.stustapay.model.NewOrder
import de.stustanet.stustapay.model.PendingOrder
import de.stustanet.stustapay.model.TerminalRegistrationSuccess
import de.stustanet.stustapay.storage.RegistrationLocalDataSource
import java.util.*
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object TerminalAPIModule {

    @Provides
    @Singleton
    fun providesTerminalAPI(registrationLocalDataSource: RegistrationLocalDataSource): TerminalAPI {
        return TerminalHTTPAPI(registrationLocalDataSource)
    }
}

interface TerminalAPI {
    /**
     * Register this terminal to the core.
     */
    suspend fun register(
        startApiUrl: String,
        registrationToken: String
    ): TerminalRegistrationSuccess

    /**
     * Create a new order, which is not yet booked.
     */
    suspend fun createOrder(newOrder: NewOrder): PendingOrder
}