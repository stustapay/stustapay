package de.stustapay.stustapay.ui.stats

import android.app.DatePickerDialog
import android.widget.DatePicker
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.Divider
import androidx.compose.material.DropdownMenu
import androidx.compose.material.DropdownMenuItem
import androidx.compose.material.Icon
import androidx.compose.material.MaterialTheme
import androidx.compose.material.OutlinedTextField
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowRight
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
import de.stustapay.libssp.ui.theme.StartpageItemStyle
import de.stustapay.libssp.util.formatCurrencyValue
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.nav.NavScaffold
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

    NavScaffold(
        title = { Text(stringResource(R.string.root_item_stats)) }, navigateBack = {
            when (currentSubView) {
                StatsSubView.Root -> leaveView()
                StatsSubView.DailyRevenue -> viewModel.goTo(StatsSubView.Root)
                StatsSubView.HourlyRevenue -> viewModel.goTo(StatsSubView.Root)
            }
        }
    ) {
        Scaffold(content = { padding ->
            Column(
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize()
            ) {
                when (currentSubView) {
                    StatsSubView.Root -> StatsViewRoot(viewModel, leaveView)
                    StatsSubView.DailyRevenue -> StatsViewDailyRevenue(viewModel)
                    StatsSubView.HourlyRevenue -> StatsViewHourlyRevenue(viewModel)
                }
            }
        }, bottomBar = {
            Column {
                Spacer(modifier = Modifier.height(10.dp))
                Divider()

                Box(modifier = Modifier.padding(10.dp)) {
                    Column {
                        val text = when (status) {
                            is StatsStatus.Idle -> {
                                stringResource(R.string.common_status_idle)
                            }

                            is StatsStatus.Fetching -> {
                                stringResource(R.string.common_status_fetching)
                            }

                            is StatsStatus.Done -> {
                                stringResource(R.string.common_status_done)
                            }

                            is StatsStatus.Failed -> {
                                (status as StatsStatus.Failed).msg
                            }
                        }
                        Text(text, fontSize = 24.sp)
                    }
                }
            }
        })
    }
}

@Composable
fun StatsViewRoot(
    viewModel: StatsViewModel, leaveView: () -> Unit
) {
    val scrollState = rememberScrollState()

    BackHandler {
        leaveView()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(10.dp)
            .verticalScroll(state = scrollState)
    ) {
        Row(modifier = Modifier
            .fillMaxWidth()
            .clickable {
                viewModel.goTo(StatsSubView.DailyRevenue)
            }
            .padding(horizontal = 24.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.Filled.KeyboardArrowRight,
                modifier = Modifier
                    .padding(all = 2.dp)
                    .size(size = 28.dp),
                contentDescription = null,
                tint = MaterialTheme.colors.primary
            )

            Text(
                modifier = Modifier.padding(start = 16.dp),
                text = stringResource(R.string.stats_daily_revenue),
                style = StartpageItemStyle,
            )
        }

        Row(modifier = Modifier
            .fillMaxWidth()
            .clickable {
                viewModel.goTo(StatsSubView.HourlyRevenue)
            }
            .padding(horizontal = 24.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.Filled.KeyboardArrowRight,
                modifier = Modifier
                    .padding(all = 2.dp)
                    .size(size = 28.dp),
                contentDescription = null,
                tint = MaterialTheme.colors.primary
            )

            Text(
                modifier = Modifier.padding(start = 16.dp),
                text = stringResource(R.string.stats_hourly_revenue),
                style = StartpageItemStyle,
            )
        }
    }
}

@Composable
fun StatsViewDailyRevenue(
    viewModel: StatsViewModel
) {
    val scrollState = rememberScrollState()
    val stats by viewModel.stats.collectAsStateWithLifecycle()

    BackHandler {
        viewModel.goTo(StatsSubView.Root)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(10.dp)
            .verticalScroll(state = scrollState)
    ) {
        for (dailyStats in stats.dailyIntervals) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    dailyStats.fromTime.toZonedDateTime()
                        .withZoneSameInstant(TimeZone.getDefault().toZoneId())
                        .format(DateTimeFormatter.ofPattern("E dd.MM.yyyy")), fontSize = 24.sp
                )
                Text(formatCurrencyValue(dailyStats.revenue), fontSize = 24.sp)
            }
        }
    }
}

@Composable
fun StatsViewHourlyRevenue(
    viewModel: StatsViewModel
) {
    val scrollState = rememberScrollState()
    val stats by viewModel.stats.collectAsStateWithLifecycle()

    BackHandler {
        viewModel.goTo(StatsSubView.Root)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(10.dp)
            .verticalScroll(state = scrollState)
    ) {
        for (hourlyStats in stats.hourlyIntervals) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    hourlyStats.fromTime.toZonedDateTime()
                        .withZoneSameInstant(TimeZone.getDefault().toZoneId())
                        .format(DateTimeFormatter.ofPattern("E HH:mm")) + " - " + hourlyStats.toTime.toZonedDateTime()
                        .withZoneSameInstant(TimeZone.getDefault().toZoneId())
                        .format(DateTimeFormatter.ofPattern("HH:mm")), fontSize = 24.sp
                )
                Text(formatCurrencyValue(hourlyStats.revenue), fontSize = 24.sp)
            }
        }
    }
}