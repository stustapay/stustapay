package de.stustanet.stustapay.ui.common

import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import de.stustanet.stustapay.model.UserTag

@Composable
fun TagItem(
    tag: UserTag,
    modifier: Modifier = Modifier
) {
    Text(
        "ID: $tag",
        style = MaterialTheme.typography.h5,
        modifier = modifier,
    )
}