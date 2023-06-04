package de.stustanet.stustapay.ui.common

import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.Text
import androidx.compose.material.TextField
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType

@Composable

fun TagTextField(
    tagID: ULong?,
    modifier: Modifier = Modifier,
    onTagIDChanged: (ULong?) -> Unit = { },
) {
    var value by remember { mutableStateOf("") }
    LaunchedEffect(tagID) {
        value = tagID?.let { tagIDtoString(it) } ?: ""
    }

    TextField(
        value = value,
        placeholder = { Text("Tag UID in Hex") },
        onValueChange = {
            value = it
            onTagIDChanged(tagIDfromString(value))
        },
        modifier = modifier,
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Ascii),
        isError = tagIDfromString(value) == null,
    )
}

fun tagIDtoString(id: ULong): String {
    val hexChar = "0123456789ABCDEF"
    var ret = ""

    for (i in 0 until 7) {
        val b = (id shr ((6 - i) * 8)) and 0xffu
        ret += hexChar[((b shr 4) and 0x0fu).toInt()]
        ret += hexChar[(b and 0x0fu).toInt()]
    }

    return ret
}

fun tagIDfromString(id: String): ULong? {
    val hexChar = "0123456789abcdef"
    var ret: ULong = 0u
    val s = id.lowercase()

    if (s.length != 14) {
        return null
    }
    for (c in s) {
        if (!hexChar.contains(c)) {
            return null
        }
    }

    for (i in 0 until 7) {
        val h = hexChar.indexOf(s[i * 2]).toULong()
        val l = hexChar.indexOf(s[i * 2 + 1]).toULong()
        ret += ((h shl 4) or l) shl ((6 - i) * 8)
    }

    return ret
}