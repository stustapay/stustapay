package de.stustanet.stustapay.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.Icon
import androidx.compose.material.Text
import androidx.compose.material.TextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.rememberScaffoldState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.BuildConfig
import de.stustanet.stustapay.ui.pref.PrefGroup
import de.stustanet.stustapay.ui.pref.PrefLink

object SettingsNavDest {
    val root = NavDest("root")
    val connection = NavDest("connection")
    val about = NavDest("about")
}

@Preview
@Composable
fun ConnectionView() {
    val context = LocalContext.current

    // TODO: introduce Preferences DataStore :)
    //       to save the core server url
    var srvUrl = rememberSaveable { mutableStateOf("http://localhost:9002/") }

    PrefGroup(title = { Text("Core Server") }) {
        TextField(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 10.dp, end = 10.dp),
            value = srvUrl.value,
            onValueChange = {
                srvUrl.value = it
            },
            leadingIcon = { Icon(Icons.Default.AccountCircle, "URL") },
            label = { Text(text = "Endpoint URL") },
            maxLines = 1,
            keyboardOptions = KeyboardOptions(
                imeAction = ImeAction.Done,
                keyboardType = KeyboardType.Uri
            ),
        )
    }
}


@Composable
fun SettingsRootView(navController: NavHostController) {
    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
    ) {
        item {
            PrefLink(
                icon = {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = "Settings"
                    )
                },
                title = { Text(text = "Core Connection") },
                subtitle = { Text(text = "Server settings") },
            ) {
                navController.navigate(SettingsNavDest.connection.route)
            }
        }
        item {
            PrefGroup(title = { Text("About") }) {
                PrefLink(
                    icon = { Icon(imageVector = Icons.Default.Info, contentDescription = "About") },
                    title = { Text(text = "About this App") },
                ) {
                    navController.navigate(SettingsNavDest.about.route)
                }
            }
        }
    }
}

@Preview
@Composable
fun AboutView() {
    Column {
        Text("Version: " + BuildConfig.VERSION_NAME)
        Text("Version code: " + BuildConfig.VERSION_CODE)
    }
}


@Preview
@Composable
fun SettingsView(leaveView: () -> Unit = {}) {
    val navController = rememberNavController()
    val scaffoldState = rememberScaffoldState()

    NavScaffold(
        title = { Text(text = "Settings") },
        state = scaffoldState,
        navigateBack = {
            if (navController.currentDestination?.route == SettingsNavDest.root.route) {
                leaveView()
            } else {
                navController.popBackStack()
            }
        },
        hasDrawer = false,
    ) {
        NavHost(
            navController = navController,
            startDestination = SettingsNavDest.root.route
        ) {
            composable(SettingsNavDest.root.route) { SettingsRootView(navController) }
            composable(SettingsNavDest.connection.route) { ConnectionView() }
            composable(SettingsNavDest.about.route) { AboutView() }
        }
    }
}