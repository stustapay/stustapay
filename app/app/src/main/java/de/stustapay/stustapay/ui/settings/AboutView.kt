package de.stustapay.stustapay.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.material.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import de.stustapay.stustapay.BuildConfig

@OptIn(ExperimentalMaterialApi::class)
@Preview
@Composable
fun AboutView() {
    Column {

        ListItem(
            text = { Text("Version: " + BuildConfig.VERSION_NAME) },
            icon = {
                Icon(
                    painter = painterResource(de.stustapay.libssp.R.drawable.info_24),
                    contentDescription = null,
                    modifier = Modifier.size(40.dp)
                )
            }
        )

        ListItem(
            text = { Text("Version code: " + BuildConfig.VERSION_CODE) },
            icon = {
                Icon(
                    painter = painterResource(de.stustapay.libssp.R.drawable.build_24),
                    contentDescription = null,
                    modifier = Modifier.size(40.dp)
                )
            }
        )
    }
}

