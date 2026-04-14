package de.stustapay.stustapay.baselineprofile

import android.content.Intent
import androidx.benchmark.macro.MacrobenchmarkScope
import androidx.test.platform.app.InstrumentationRegistry

internal const val targetPackageName = "de.teamfestlichpay.teamfestlichpay"
private const val benchmarkStartRouteExtra =
    "de.stustapay.stustapay.extra.BENCHMARK_START_ROUTE"

internal object BenchmarkRoutes {
    const val STARTPAGE = "startpage"
    const val SALE = "sale"
    const val TOPUP = "topup"
    const val HISTORY = "history"
}

internal fun launchIntent(route: String): Intent {
    val context = InstrumentationRegistry.getInstrumentation().context
    return requireNotNull(context.packageManager.getLaunchIntentForPackage(targetPackageName)).apply {
        addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NEW_TASK)
        putExtra(benchmarkStartRouteExtra, route)
    }
}

internal fun MacrobenchmarkScope.startRouteAndWait(route: String) {
    startActivityAndWait(launchIntent(route))
    device.waitForIdle()
}
