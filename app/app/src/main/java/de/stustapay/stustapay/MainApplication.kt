package de.stustapay.stustapay

import android.app.Application
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import android.util.Log
import dagger.hilt.android.HiltAndroidApp
import de.stustapay.stustapay.device.ManagedConfigWatcher
import de.stustapay.stustapay.locale.AppLocaleManager
import de.stustapay.stustapay.net.TerminalApiAccessor
import javax.inject.Inject

@HiltAndroidApp
class MainApplication : Application() {
    
    @Inject
    lateinit var terminalApiAccessor: TerminalApiAccessor

    @Inject
    lateinit var managedConfigWatcher: ManagedConfigWatcher
    
    private var connectivityManager: ConnectivityManager? = null
    
    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            Log.i("TeamFestlichPay", "Network available")
        }
        
        override fun onLost(network: Network) {
            Log.i("TeamFestlichPay", "Network lost")
        }
        
        override fun onCapabilitiesChanged(
            network: Network,
            networkCapabilities: NetworkCapabilities
        ) {
            // Reset the network client when network capabilities change significantly
            val hasInternet = networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            val hasValidated = networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            
            Log.i("TeamFestlichPay", "Network capabilities changed: internet=$hasInternet, validated=$hasValidated")
            
            if (hasInternet && hasValidated) {
                // Reset the client when a good network connection becomes available
                if (::terminalApiAccessor.isInitialized) {
                    terminalApiAccessor.resetNetworkClient()
                }
            }
        }
    }
    
    override fun onCreate() {
        super.onCreate()

        AppLocaleManager.applyStoredLocale(this)
        
        // Set up network monitoring
        setupNetworkMonitoring()
        managedConfigWatcher.start()
    }
    
    private fun setupNetworkMonitoring() {
        connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        
        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        
        connectivityManager?.registerNetworkCallback(networkRequest, networkCallback)
    }
    
    override fun onTerminate() {
        // Clean up network resources
        connectivityManager?.unregisterNetworkCallback(networkCallback)
        managedConfigWatcher.stop()
        
        // Close the API accessor if it's initialized
        if (::terminalApiAccessor.isInitialized) {
            try {
                terminalApiAccessor.close()
            } catch (e: Exception) {
                Log.e("TeamFestlichPay", "Error closing TerminalApiAccessor: ${e.message}")
            }
        }
        
        super.onTerminate()
    }
    
    companion object {
        // Method to check if the device has an active internet connection
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
