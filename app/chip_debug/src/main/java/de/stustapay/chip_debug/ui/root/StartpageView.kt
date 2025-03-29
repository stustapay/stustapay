package de.stustapay.chip_debug.ui.root

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.Divider
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import de.stustapay.chip_debug.R
import de.stustapay.chip_debug.ui.nav.NavDest
import de.stustapay.libssp.util.restartApp

@Preview
@Composable
fun PreviewStartpageView() {
    StartpageView(viewModel = hiltViewModel())
}


@Composable
fun StartpageView(
    navigateTo: (NavDest) -> Unit = {}, viewModel: StartpageViewModel = hiltViewModel()
) {
    val gradientColors = listOf(MaterialTheme.colors.background, MaterialTheme.colors.onSecondary)
    val scope = rememberCoroutineScope()
    val activity = LocalActivity.current!!

    val navigateToHook = fun(dest: NavDest): Unit {
        navigateTo(dest)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = Brush.verticalGradient(colors = gradientColors)),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 5.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = "StuStaPay", fontSize = 30.sp, modifier = Modifier.padding(top = 10.dp)
            )

            Text(
                modifier = Modifier.padding(top = 4.dp, bottom = 10.dp),
                textAlign = TextAlign.Center,
                text = "NFC Chip Debug App",
                style = MaterialTheme.typography.body1,
            )

            Column(verticalArrangement = Arrangement.Bottom) {

                if (startpageItems.isNotEmpty()) {
                    Divider()
                }

                val scroll = rememberScrollState()
                Column(
                    Modifier
                        .weight(1.0f)
                        .verticalScroll(state = scroll)
                ) {
                    for (item in startpageItems) {
                        StartpageEntry(item = item, navigateTo = navigateToHook)
                    }
                }

                Divider()

                StartpageEntry(item = StartpageItem(
                    icon = Icons.Filled.Refresh,
                    label = R.string.root_item_restart_app,
                    navDestination = RootNavDests.startpage,
                ), navigateTo = {
                    restartApp(activity)
                })
            }
        }
    }
}