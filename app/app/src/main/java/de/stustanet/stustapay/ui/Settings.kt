package de.stustanet.stustapay.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Settings
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.BuildConfig
import de.stustanet.stustapay.model.UserPreferencesViewModel
import de.stustanet.stustapay.ui.pref.PrefGroup
import de.stustanet.stustapay.ui.pref.PrefLink
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch


object SettingsNavDest {
    val root = NavDest("root")
    val connection = NavDest("connection")
    val about = NavDest("about")
}

@Preview
@Composable
fun ConnectionView() {
    val context = LocalContext.current

    val viewModel = UserPreferencesViewModel(context)
    val endpoint = viewModel.getEndpoint.collectAsState(initial = "")

    val endpointValue = remember {
        mutableStateOf(TextFieldValue())
    }
    PrefGroup(title = { Text("Core Server") }) {
        Text(text = endpoint.value, modifier = Modifier.padding(start = 15.dp, end = 10.dp))
        Spacer(modifier = Modifier.height(15.dp))
        TextField(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 10.dp, end = 10.dp),
            value = endpointValue.value,
            onValueChange = {
                endpointValue.value = it
            },
            leadingIcon = { Icon(Icons.Default.AccountCircle, "URL") },
            label = { Text(text = "New Endpoint URL") },
            maxLines = 1,
            keyboardOptions = KeyboardOptions(
                imeAction = ImeAction.Done,
                keyboardType = KeyboardType.Uri
            ),
        )
        Button(
            modifier = Modifier.padding(start = 10.dp, end = 10.dp),
            onClick = {
                CoroutineScope(Dispatchers.IO).launch {
                    viewModel.updateEndpoint(endpointValue.value.text)
                }
            }
        ) {
            Text(text = "Update Endpoint")
        }
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
        hasDrawer = false
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = SettingsNavDest.root.route,
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = paddingValues.calculateBottomPadding())
        ) {
            composable(SettingsNavDest.root.route) { SettingsRootView(navController) }
            composable(SettingsNavDest.connection.route) { ConnectionView() }
            composable(SettingsNavDest.about.route) { AboutView() }
        }
    }
}