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
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
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
    companion object {
        const val EXTRA_BENCHMARK_START_ROUTE =
            "de.stustapay.stustapay.extra.BENCHMARK_START_ROUTE"
    }

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
        applyFullscreenWindowFlags(enabled = true)

        // Set default orientation based on device type
        setDefaultOrientation();

        // things that need the activity
        nfcHandler.onCreate(this, mapOf())
        sumUp.attachActivityCallback(activityCallback)

        setContent {
            Main(this)
        }

        window.decorView.post {
            infallible.launch()
            customerDisplayManager.initializeCustomerDisplay()
        }
    }

    public override fun onPause() {
        super.onPause()

        nfcHandler.onPause(this)
    }

    public override fun onResume() {
        super.onResume()

        nfcHandler.onResume(this)
        reapplyDesiredSystemUI()
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
        reapplyDesiredSystemUI()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            reapplyDesiredSystemUI()
        }
    }

    private var sysUiHidden = false
    private var desiredSysUiHidden = true
    private var insetsListenerInstalled = false

    private fun reapplyDesiredSystemUI() {
        applySystemUIVisibility(hidden = desiredSysUiHidden, force = true)
    }

    @SuppressLint("ObsoleteSdkInt")
    private fun installSystemUiRehideListeners() {
        if (insetsListenerInstalled) {
            return
        }

        val decorView = window.decorView
        ViewCompat.setOnApplyWindowInsetsListener(decorView) { _, insets ->
            if (desiredSysUiHidden && insets.isVisible(WindowInsetsCompat.Type.systemBars())) {
                decorView.post { reapplyDesiredSystemUI() }
            }
            insets
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            @Suppress("DEPRECATION")
            decorView.setOnSystemUiVisibilityChangeListener { visibility ->
                if (desiredSysUiHidden &&
                    (visibility and View.SYSTEM_UI_FLAG_FULLSCREEN == 0 ||
                        visibility and View.SYSTEM_UI_FLAG_HIDE_NAVIGATION == 0)
                ) {
                    decorView.post { reapplyDesiredSystemUI() }
                }
            }
        }

        insetsListenerInstalled = true
    }

    @SuppressLint("ObsoleteSdkInt")
    private fun applyFullscreenWindowFlags(enabled: Boolean) {
        if (enabled) {
            window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
            @Suppress("DEPRECATION")
            window.addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS)
        } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
            @Suppress("DEPRECATION")
            window.clearFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes = window.attributes.apply {
                layoutInDisplayCutoutMode = if (enabled) {
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
                } else {
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT
                }
            }
        }
    }

    @SuppressLint("ObsoleteSdkInt")
    @Suppress("DEPRECATION")
    private fun applySystemUIVisibility(hidden: Boolean, force: Boolean = false) {
        if (!force && sysUiHidden == hidden) {
            return
        }

        applyFullscreenWindowFlags(enabled = hidden)
        installSystemUiRehideListeners()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let {
                if (hidden) {
                    it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    window.statusBarColor = android.graphics.Color.TRANSPARENT
                    window.navigationBarColor = android.graphics.Color.TRANSPARENT
                    it.hide(WindowInsets.Type.systemBars())
                } else {
                    it.show(WindowInsets.Type.systemBars())
                }
            }
        } else {
            var uiVisibility = window.decorView.systemUiVisibility

            if (hidden) {
                uiVisibility = uiVisibility or View.SYSTEM_UI_FLAG_FULLSCREEN
                // don't draw essential navigation controls (home, back, ...)
                uiVisibility = uiVisibility or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                uiVisibility = uiVisibility or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            } else {
                uiVisibility = uiVisibility and View.SYSTEM_UI_FLAG_FULLSCREEN.inv()
                uiVisibility = uiVisibility and View.SYSTEM_UI_FLAG_HIDE_NAVIGATION.inv()
                uiVisibility = uiVisibility and View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY.inv()
            }

            window.decorView.systemUiVisibility = uiVisibility
        }
        sysUiHidden = hidden
    }

    override fun hideSystemUI() {
        desiredSysUiHidden = true
        applySystemUIVisibility(hidden = true)
    }

    @SuppressLint("ObsoleteSdkInt")
    @Suppress("DEPRECATION")
    override fun showSystemUI() {
        desiredSysUiHidden = false
        applySystemUIVisibility(hidden = false)
    }
}
