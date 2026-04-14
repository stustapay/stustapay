package de.stustapay.stustapay.baselineprofile

import androidx.benchmark.macro.FrameTimingMetric
import androidx.benchmark.macro.StartupMode
import androidx.benchmark.macro.StartupTimingMetric
import androidx.benchmark.macro.junit4.MacrobenchmarkRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class StuStaPayMacrobenchmark {
    @get:Rule
    val benchmarkRule = MacrobenchmarkRule()

    @Test
    fun coldStartupStartpage() = benchmarkRule.measureRepeated(
        packageName = targetPackageName,
        metrics = listOf(StartupTimingMetric()),
        iterations = 5,
        startupMode = StartupMode.COLD,
        setupBlock = {
            pressHome()
        },
    ) {
        startRouteAndWait(BenchmarkRoutes.STARTPAGE)
    }

    @Test
    fun warmStartupStartpage() = benchmarkRule.measureRepeated(
        packageName = targetPackageName,
        metrics = listOf(StartupTimingMetric()),
        iterations = 5,
        startupMode = StartupMode.WARM,
        setupBlock = {
            pressHome()
        },
    ) {
        startRouteAndWait(BenchmarkRoutes.STARTPAGE)
    }

    @Test
    fun frameTimingStartpage() = measureFrameTiming(BenchmarkRoutes.STARTPAGE)

    @Test
    fun frameTimingSale() = measureFrameTiming(BenchmarkRoutes.SALE)

    @Test
    fun frameTimingTopUp() = measureFrameTiming(BenchmarkRoutes.TOPUP)

    @Test
    fun frameTimingHistory() = measureFrameTiming(BenchmarkRoutes.HISTORY)

    private fun measureFrameTiming(route: String) = benchmarkRule.measureRepeated(
        packageName = targetPackageName,
        metrics = listOf(FrameTimingMetric()),
        iterations = 5,
        startupMode = StartupMode.WARM,
        setupBlock = {
            pressHome()
        },
    ) {
        startRouteAndWait(route)
    }
}
