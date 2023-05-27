package de.stustanet.stustapay.ui.common

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Preview
@Composable
fun PreviewStatusText() {
    StatusText("roflcopter bla bla important message pls read me srsly gnampf")
}

@Composable
fun StatusText(
    status: String,
    modifier: Modifier = Modifier,
) {
    val scrollState = rememberScrollState()
    Box(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 30.dp, max = 65.dp)
            .verticalScroll(scrollState)
    ) {
        Text(
            text = status,
            modifier = Modifier.fillMaxWidth(),
            fontSize = 25.sp,
        )
    }
}