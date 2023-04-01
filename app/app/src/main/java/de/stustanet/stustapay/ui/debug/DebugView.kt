package de.stustanet.stustapay.ui.debug

import androidx.compose.foundation.layout.*
import androidx.compose.material.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.ui.nav.NavDrawer
import de.stustanet.stustapay.ui.nav.TopAppBar
import de.stustanet.stustapay.ui.nav.TopAppBarIcon
import de.stustanet.stustapay.ui.nav.navigateTo
import kotlinx.coroutines.launch

@Preview
@Composable
fun DebugView() {
    val nav = rememberNavController()

    NavHost(navController = nav, startDestination = "main") {
        composable("main") {
            DebugNavView(nav)
        }
        composable("net") {
            NavScaffold(nav, "Network") {
                NetDebugView()
            }
        }
        composable("nfc") {
            NavScaffold(nav, "NFC") {
                NfcDebugView()
            }
        }
    }
}

@Composable
fun NavScaffold(nav: NavHostController, title: String, content: @Composable () -> Unit) {
    val scaffoldState = rememberScaffoldState()

    Scaffold(
        scaffoldState = scaffoldState,
        topBar = {
            TopAppBar(
                title = { Text(title) },
                iconType = TopAppBarIcon.BACK,
            ) {
                nav.navigateTo("main")
            }
        },
        content = {
            Box(
                Modifier
                    .fillMaxSize()
                    .padding(it)) {
                content()
            }
        }
    )
}