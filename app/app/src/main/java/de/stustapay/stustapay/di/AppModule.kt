package de.stustapay.stustapay.di

import android.content.Context
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import de.stustapay.stustapay.device.AndroidWifiSuggestionClient
import de.stustapay.stustapay.device.ManagedWifiSuggestionStateStore
import de.stustapay.stustapay.device.SharedPrefsManagedWifiSuggestionStateStore
import de.stustapay.stustapay.device.WifiSuggestionClient
import javax.inject.Singleton

/**
 * Application module that provides system-level dependencies like Context
 */
@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    /**
     * Explicitly provides the application context for injection
     * This helps Hilt know how to provide Context when it's requested with @ApplicationContext
     */
    @Provides
    @Singleton
    fun provideContext(@ApplicationContext context: Context): Context {
        return context
    }

    @Provides
    @Singleton
    fun provideWifiSuggestionClient(client: AndroidWifiSuggestionClient): WifiSuggestionClient {
        return client
    }

    @Provides
    @Singleton
    fun provideManagedWifiSuggestionStateStore(
        store: SharedPrefsManagedWifiSuggestionStateStore
    ): ManagedWifiSuggestionStateStore {
        return store
    }
}
