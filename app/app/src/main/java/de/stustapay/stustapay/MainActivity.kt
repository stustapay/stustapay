package de.stustapay.stustapay

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.core.view.WindowCompat
import dagger.hilt.android.AndroidEntryPoint
import de.stustapay.stustapay.ec.SumUp
import de.stustapay.libssp.nfc.NfcHandler
import de.stustapay.stustapay.repository.InfallibleRepository
import de.stustapay.stustapay.ui.Main
import de.stustapay.libssp.util.ActivityCallback
import de.stustapay.libssp.util.SysUiController
import de.stustapay.stustapay.display.CustomerDisplayManager
import de.stustapay.stustapay.locale.AppLocaleManager
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity(), SysUiController {
    @Inject
    lateinit var activityCallback: ActivityCallback

    @Inject
    lateinit var nfcHandler: NfcHandler

    @Inject
    lateinit var sumUp: SumUp

    @Inject
    lateinit var infallible: InfallibleRepository
    
    @Inject
    lateinit var customerDisplayManager: CustomerDisplayManager

    val viewModel: MainActivityViewModel by viewModels()

    override fun attachBaseContext(newBase: Context) {
        super.attachBaseContext(AppLocaleManager.wrapContext(newBase))
    }

    @SuppressLint("SourceLockedOrientationActivity")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, false)

        // Set default orientation based on device type
        setDefaultOrientation();

        // things that need the activity
        nfcHandler.onCreate(this, mapOf())
        sumUp.init(activityCallback)

        infallible.launch()
        
        // Initialize the customer display if a secondary screen is available
        customerDisplayManager.initializeCustomerDisplay()

        setContent {
            Main(this)
        }
    }

    public override fun onPause() {
        super.onPause()

        nfcHandler.onPause(this)
    }

    public override fun onResume() {
        super.onResume()

        nfcHandler.onResume(this)
        hideSystemUI()
    }

    public override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
    }
    
    override fun onDestroy() {
        super.onDestroy()
        
        // Dismiss the presentation when the activity is destroyed
        customerDisplayManager.dismissPresentation()
    }

    @Deprecated("Deprecated in Android")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)

        activityCallback.activityResult(requestCode, resultCode, data)
    }

    private fun setDefaultOrientation() {
        // Get the screen width and height
        val screenWidth = resources.displayMetrics.widthPixels
        val screenHeight = resources.displayMetrics.heightPixels

        // Check if the device is primarily used in landscape or portrait
        requestedOrientation = if (screenWidth > screenHeight) {
            // Landscape device
            ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        } else {
            // Portrait device
            ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        this.hideSystemUI()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            hideSystemUI()
        }
    }

    private var sysUiHidden = false

    @SuppressLint("ObsoleteSdkInt")
    @Suppress("DEPRECATION")
    override fun hideSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let {
                it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                window.statusBarColor = android.graphics.Color.TRANSPARENT
                window.navigationBarColor = android.graphics.Color.TRANSPARENT
                it.hide(WindowInsets.Type.systemBars())
            }
        } else {
            var uiVisibility = window.decorView.systemUiVisibility

            uiVisibility = uiVisibility or View.SYSTEM_UI_FLAG_FULLSCREEN
            // don't draw essential navigation controls (home, back, ...)
            uiVisibility = uiVisibility or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            uiVisibility = uiVisibility or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY

            window.decorView.systemUiVisibility = uiVisibility
        }
        sysUiHidden = true
    }

    @SuppressLint("ObsoleteSdkInt")
    @Suppress("DEPRECATION")
    override fun showSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.show(WindowInsets.Type.systemBars())
        } else {
            var uiVisibility: Int = window.decorView.systemUiVisibility

            uiVisibility = uiVisibility and View.SYSTEM_UI_FLAG_FULLSCREEN.inv()
            uiVisibility = uiVisibility and View.SYSTEM_UI_FLAG_HIDE_NAVIGATION.inv()
            uiVisibility = uiVisibility and View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY.inv()

            window.decorView.systemUiVisibility = uiVisibility
        }
        sysUiHidden = false
    }
}
