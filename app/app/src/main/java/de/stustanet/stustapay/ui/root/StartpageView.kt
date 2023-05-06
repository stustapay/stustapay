package de.stustanet.stustapay.ui.root

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Settings
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.model.Access
import de.stustanet.stustapay.ui.nav.NavDest
import kotlinx.coroutines.launch

@Preview
@Composable
fun PreviewStartpageView() {
    StartpageView(viewModel = hiltViewModel())
}


@Composable
fun StartpageView(
    navigateTo: (NavDest) -> Unit = {},
    viewModel: StartpageViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val gradientColors = listOf(MaterialTheme.colors.background, MaterialTheme.colors.onSecondary)
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        viewModel.fetchAccessData()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = Brush.verticalGradient(colors = gradientColors)),
    ) {
        IconButton(
            modifier = Modifier
                .align(alignment = Alignment.TopEnd)
                .padding(top = 15.dp, end = 20.dp)
                .size(30.dp),
            onClick = {
                scope.launch {
                    viewModel.fetchAccessData()
                }
            }
        ) {
            Icon(Icons.Filled.Refresh, "Refresh")
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 5.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            val title = uiState.title()
            Text(
                text = title.title,
                fontSize = 30.sp,
                modifier = Modifier.padding(top = 10.dp)
            )
            if (title.subtitle != null) {
                Text(
                    text = title.subtitle,
                    fontSize = 24.sp,
                    modifier = Modifier.padding(top = 10.dp)
                )
            }

            LoginProfile(viewModel)

            Column(verticalArrangement = Arrangement.Bottom) {
                val scroll = rememberScrollState()
                Column(Modifier.verticalScroll(state = scroll).weight(1.0f)) {
                    for (item in startpageItems) {
                        if (uiState.checkAccess(item.canAccess)) {
                            StartpageEntry(item = item, navigateTo = navigateTo)
                        }
                    }
                }

                Divider()

                StartpageEntry(
                    item = StartpageItem(
                        icon = Icons.Filled.Person,
                        navDestination = RootNavDests.user,
                        label = "User",
                    ),
                    navigateTo = navigateTo
                )

                if (uiState.checkAccess { u, _ -> Access.canChangeConfig(u) } || uiState.notConfigured()) {
                    StartpageEntry(
                        item = StartpageItem(
                            icon = Icons.Filled.Settings,
                            label = "Settings",
                            navDestination = RootNavDests.settings,
                        ),
                        navigateTo = navigateTo
                    )
                }

                if (uiState.checkAccess { u, _ -> Access.canHackTheSystem(u) }) {
                    StartpageEntry(
                        item = StartpageItem(
                            icon = Icons.Filled.Send,
                            label = "Development",
                            navDestination = RootNavDests.development,
                        ),
                        navigateTo = navigateTo
                    )
                }
            }
        }
    }
}