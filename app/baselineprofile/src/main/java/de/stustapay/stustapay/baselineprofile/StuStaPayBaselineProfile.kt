package de.stustapay.stustapay.baselineprofile

import android.os.Build
import androidx.benchmark.macro.junit4.BaselineProfileRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.Assume.assumeTrue
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class StuStaPayBaselineProfile {
    @get:Rule
    val baselineProfileRule = BaselineProfileRule()

    @Test
    fun generate() {
        assumeTrue("Baseline profile collection needs Android 13+ on non-rooted devices.", Build.VERSION.SDK_INT >= 33)

        baselineProfileRule.collect(
            packageName = targetPackageName,
            includeInStartupProfile = true,
        ) {
            pressHome()
            startRouteAndWait(BenchmarkRoutes.STARTPAGE)
            startRouteAndWait(BenchmarkRoutes.SALE)
            startRouteAndWait(BenchmarkRoutes.TOPUP)
            startRouteAndWait(BenchmarkRoutes.HISTORY)
        }
    }
}
