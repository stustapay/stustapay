package de.stustapay.stustapay.ui.common

import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import de.stustapay.libssp.model.NfcTag

@Composable
fun TagItem(
    tag: NfcTag, modifier: Modifier = Modifier
) {
    Text(
        "ID: ${tagIDtoString(tag.uid.ulongValue())}",
        style = MaterialTheme.typography.h5,
        modifier = modifier,
    )
}