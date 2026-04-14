package de.stustapay.stustapay

import android.app.Application
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import dagger.hilt.android.HiltAndroidApp
import de.stustapay.stustapay.device.ManagedConfigWatcher
import de.stustapay.stustapay.locale.AppLocaleManager
import javax.inject.Inject

@HiltAndroidApp
class MainApplication : Application() {

    @Inject
    lateinit var managedConfigWatcher: ManagedConfigWatcher

    override fun onCreate() {
        super.onCreate()

        AppLocaleManager.applyStoredLocale(this)
        managedConfigWatcher.start()
    }

    override fun onTerminate() {
        managedConfigWatcher.stop()
        super.onTerminate()
    }

    companion object {
        fun hasActiveInternetConnection(context: Context): Boolean {
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val network = connectivityManager.activeNetwork ?: return false
                val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false

                capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                        capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            } else {
                @Suppress("DEPRECATION")
                connectivityManager.activeNetworkInfo?.isConnected == true
            }
        }
    }
}
