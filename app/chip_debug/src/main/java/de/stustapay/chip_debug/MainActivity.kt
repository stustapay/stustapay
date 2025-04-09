package de.stustapay.chip_debug

import android.annotation.SuppressLint
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
import dagger.hilt.android.AndroidEntryPoint
import de.stustapay.chip_debug.ui.Main
import de.stustapay.libssp.nfc.NfcHandler
import de.stustapay.libssp.util.ActivityCallback
import de.stustapay.libssp.util.SysUiController
import javax.inject.Inject
import kotlin.streams.asSequence

@AndroidEntryPoint
class MainActivity : ComponentActivity(), SysUiController {
    @Inject
    lateinit var activityCallback: ActivityCallback

    @Inject
    lateinit var nfcHandler: NfcHandler

    val viewModel: MainActivityViewModel by viewModels()

    @SuppressLint("SourceLockedOrientationActivity")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // disable all automatic screen rotation
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT

        val uids = resources.openRawResource(R.raw.uids).bufferedReader().lines().skip(1).map {
            val line = it.split(",")
            Pair(line[3].toULong(16), line[2])
        }.asSequence().toMap()

        nfcHandler.onCreate(this, uids)

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
    }

    public override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
    }

    @Deprecated("Deprecated in Android")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)

        activityCallback.activityResult(requestCode, resultCode, data)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        this.hideSystemUI()
    }

    private var sysUiHidden = false

    @SuppressLint("ObsoleteSdkInt")
    @Suppress("DEPRECATION")
    override fun hideSystemUI() {
        if (sysUiHidden) {
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let {
                it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                window.navigationBarColor = getColor(R.color.black_semitransparent)
                it.hide(WindowInsets.Type.navigationBars())
            }
        } else {
            var uiVisibility = window.decorView.systemUiVisibility

            // don't draw essential navigation controls (home, back, ...)
            uiVisibility = uiVisibility or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            uiVisibility = uiVisibility or View.SYSTEM_UI_FLAG_IMMERSIVE

            window.decorView.systemUiVisibility = uiVisibility
        }
        sysUiHidden = true
    }

    @SuppressLint("ObsoleteSdkInt")
    @Suppress("DEPRECATION")
    override fun showSystemUI() {
        if (!sysUiHidden) {
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.show(WindowInsets.Type.navigationBars())
        } else {
            var uiVisibility: Int = window.decorView.systemUiVisibility

            uiVisibility = uiVisibility and View.SYSTEM_UI_FLAG_HIDE_NAVIGATION.inv()
            uiVisibility = uiVisibility and View.SYSTEM_UI_FLAG_IMMERSIVE.inv()

            window.decorView.systemUiVisibility = uiVisibility
        }
        sysUiHidden = false
    }
}
