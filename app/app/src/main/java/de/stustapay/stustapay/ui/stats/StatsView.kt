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
            StatsSubView.Root -> stringResource(R.string.stats_subtitle_root)
            StatsSubView.DailyRevenue -> stringResource(R.string.stats_subtitle_daily)
            StatsSubView.HourlyRevenue -> stringResource(R.string.stats_subtitle_hourly)
        },
        icon = Icons.Filled.DateRange,
        terminalLabel = stringResource(R.string.stats_terminal_label),
        footerHint = statsStatusText(status),
        footerSection = stringResource(R.string.stats_footer_section),
        footerStatus = when (currentSubView) {
            StatsSubView.Root -> stringResource(R.string.stats_footer_root)
            StatsSubView.DailyRevenue -> stringResource(R.string.stats_footer_daily)
            StatsSubView.HourlyRevenue -> stringResource(R.string.stats_footer_hourly)
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
            description = stringResource(R.string.stats_daily_desc),
            icon = Icons.Filled.DateRange,
            onClick = { viewModel.goTo(StatsSubView.DailyRevenue) },
            modifier = Modifier.fillMaxWidth(),
            emphasized = true,
        )
        OperatorActionCard(
            title = stringResource(R.string.stats_hourly_revenue),
            description = stringResource(R.string.stats_hourly_desc),
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

@Composable
private fun statsStatusText(status: StatsStatus): String {
    return when (status) {
        is StatsStatus.Idle -> stringResource(R.string.common_status_idle)
        is StatsStatus.Fetching -> stringResource(R.string.stats_status_fetching)
        is StatsStatus.Done -> stringResource(R.string.stats_status_done)
        is StatsStatus.Failed -> status.msg
    }
}
