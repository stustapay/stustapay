package de.stustanet.stustapay.ui.startpage

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustanet.stustapay.R

@Composable
fun StartpageView() {
    Box(
        modifier = Modifier
            .height(64.dp)
            .fillMaxWidth(),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = stringResource(R.string.welcome_to_stustapay),
            fontSize = 20.sp
        )

        // TODO: useful buttons for actions needed now?
    }
}