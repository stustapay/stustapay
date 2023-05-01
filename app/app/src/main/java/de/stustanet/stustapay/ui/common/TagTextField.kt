package de.stustanet.stustapay.ui.common

import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.Text
import androidx.compose.material.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType

@Composable

fun TagTextField(
    tagID: ULong?,
    modifier: Modifier = Modifier,
    onTagIDChanged: (ULong?) -> Unit = { },
) {

    var newTagError by remember { mutableStateOf(false) }

    TextField(
        value = tagID?.toString(16) ?: "",
        placeholder = { Text("Tag UID in Hex") },
        onValueChange = {
            val new = it.toULongOrNull(16)
            newTagError = if (new != null) {
                onTagIDChanged(new)
                false
            } else {
                true
            }
        },
        modifier = modifier,
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Ascii),
        isError = newTagError,
    )
}