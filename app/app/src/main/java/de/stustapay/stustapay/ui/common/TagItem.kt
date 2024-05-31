package de.stustapay.stustapay.ui.common

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import de.stustapay.libssp.model.NfcTag

@Composable
fun TagItem(
    tag: NfcTag, modifier: Modifier = Modifier
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
            "ID: ",
            style = MaterialTheme.typography.h5,
        )
        SelectionContainer {
            Text(
                tagIDtoString(tag.uid.ulongValue()),
                style = MaterialTheme.typography.h5,
                modifier = modifier,
            )
        }
    }
}