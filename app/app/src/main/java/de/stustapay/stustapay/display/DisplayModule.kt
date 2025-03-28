package de.stustapay.stustapay.display

import android.content.Context
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import de.stustapay.stustapay.repository.TerminalConfigRepository
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DisplayModule {

    @Provides
    @Singleton
    fun provideCustomerDisplayManager(
        @ApplicationContext context: Context,
        terminalConfigRepository: TerminalConfigRepository
    ): CustomerDisplayManager {
        return CustomerDisplayManager(context, terminalConfigRepository)
    }
} 