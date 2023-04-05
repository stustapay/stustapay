package de.stustanet.stustapay.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Info
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import de.stustanet.stustapay.BuildConfig

@OptIn(ExperimentalMaterialApi::class)
@Preview
@Composable
fun AboutView() {
    Column {

        ListItem(
            text = { Text("Version: " + BuildConfig.VERSION_NAME) },
            icon = {
                Icon(
                    Icons.Filled.Info,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp)
                )
            }
        )

        ListItem(
            text = { Text("Version code: " + BuildConfig.VERSION_CODE) },
            icon = {
                Icon(
                    Icons.Filled.Build,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp)
                )
            }
        )
    }
}

