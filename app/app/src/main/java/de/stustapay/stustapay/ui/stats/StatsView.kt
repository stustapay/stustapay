package de.stustapay.stustapay.ui.stats

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.util.formatCurrencyValue
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorActionCard
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import java.time.format.DateTimeFormatter
import java.util.TimeZone

@Composable
fun StatsView(
    viewModel: StatsViewModel = hiltViewModel(), leaveView: () -> Unit
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val currentSubView by viewModel.currentSubView.collectAsStateWithLifecycle()

    LaunchedEffect(null) {
        viewModel.fetchHistory()
    }

    OperatorScaffold(
        title = stringResource(R.string.root_item_stats),
        subtitle = when (currentSubView) {
            StatsSubView.Root -> "Revenue analytics for daily and hourly breakdowns."
            StatsSubView.DailyRevenue -> "Daily revenue intervals loaded from sales history."
            StatsSubView.HourlyRevenue -> "Hourly revenue intervals loaded from sales history."
        },
        icon = Icons.Filled.DateRange,
        terminalLabel = "Analytics",
        footerHint = statsStatusText(status),
        footerSection = "Stats",
        footerStatus = when (currentSubView) {
            StatsSubView.Root -> "2 routes"
            StatsSubView.DailyRevenue -> "Daily"
            StatsSubView.HourlyRevenue -> "Hourly"
        },
        onBack = {
            when (currentSubView) {
                StatsSubView.Root -> leaveView()
                StatsSubView.DailyRevenue -> viewModel.goTo(StatsSubView.Root)
                StatsSubView.HourlyRevenue -> viewModel.goTo(StatsSubView.Root)
            }
        },
    ) {
        when (currentSubView) {
            StatsSubView.Root -> StatsViewRoot(viewModel, leaveView)
            StatsSubView.DailyRevenue -> StatsViewDailyRevenue(viewModel)
            StatsSubView.HourlyRevenue -> StatsViewHourlyRevenue(viewModel)
        }
    }
}

@Composable
fun StatsViewRoot(
    viewModel: StatsViewModel, leaveView: () -> Unit
) {
    BackHandler {
        leaveView()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(state = rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        OperatorActionCard(
            title = stringResource(R.string.stats_daily_revenue),
            description = "Open revenue totals grouped by day.",
            icon = Icons.Filled.DateRange,
            onClick = { viewModel.goTo(StatsSubView.DailyRevenue) },
            modifier = Modifier.fillMaxWidth(),
            emphasized = true,
        )
        OperatorActionCard(
            title = stringResource(R.string.stats_hourly_revenue),
            description = "Open revenue totals grouped by hour.",
            icon = Icons.Filled.DateRange,
            onClick = { viewModel.goTo(StatsSubView.HourlyRevenue) },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
fun StatsViewDailyRevenue(
    viewModel: StatsViewModel
) {
    val stats by viewModel.stats.collectAsStateWithLifecycle()

    BackHandler {
        viewModel.goTo(StatsSubView.Root)
    }

    OperatorPanel(
        modifier = Modifier
            .fillMaxSize()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(state = rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            stats.dailyIntervals.forEach { dailyStats ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        dailyStats.fromTime.toZonedDateTime()
                            .withZoneSameInstant(TimeZone.getDefault().toZoneId())
                            .format(DateTimeFormatter.ofPattern("E dd.MM.yyyy")),
                        fontSize = 24.sp,
                        color = OperatorPalette.title,
                    )
                    Text(
                        formatCurrencyValue(dailyStats.revenue),
                        fontSize = 24.sp,
                        color = OperatorPalette.accent,
                    )
                }
            }
        }
    }
}

@Composable
fun StatsViewHourlyRevenue(
    viewModel: StatsViewModel
) {
    val stats by viewModel.stats.collectAsStateWithLifecycle()

    BackHandler {
        viewModel.goTo(StatsSubView.Root)
    }

    OperatorPanel(
        modifier = Modifier
            .fillMaxSize()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(state = rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            stats.hourlyIntervals.forEach { hourlyStats ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        hourlyStats.fromTime.toZonedDateTime()
                            .withZoneSameInstant(TimeZone.getDefault().toZoneId())
                            .format(DateTimeFormatter.ofPattern("E HH:mm")) + " - " + hourlyStats.toTime.toZonedDateTime()
                            .withZoneSameInstant(TimeZone.getDefault().toZoneId())
                            .format(DateTimeFormatter.ofPattern("HH:mm")),
                        fontSize = 24.sp,
                        color = OperatorPalette.title,
                    )
                    Text(
                        formatCurrencyValue(hourlyStats.revenue),
                        fontSize = 24.sp,
                        color = OperatorPalette.accent,
                    )
                }
            }
        }
    }
}

private fun statsStatusText(status: StatsStatus): String {
    return when (status) {
        is StatsStatus.Idle -> "Idle"
        is StatsStatus.Fetching -> "Fetching statistics from history."
        is StatsStatus.Done -> "Statistics loaded."
        is StatsStatus.Failed -> status.msg
    }
}
