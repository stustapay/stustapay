package de.stustapay.stustapay.ui.common

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.material.Icon
import androidx.compose.material.IconButton
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import de.stustapay.libssp.ui.theme.Theme

@Composable
fun ButtonListItem(
    modifier: Modifier = Modifier,
    icon: @Composable (() -> Unit)? = null,
    text: @Composable (() -> Unit),
    buttons: @Composable (() -> Unit)? = null,
) {

    val iconPadMin = 20.dp
    val iconPad = 8.dp
    val iconPadVertical = 16.dp

    Row(modifier.heightIn(min = 80.dp).fillMaxWidth()) {
        if (icon != null) {
            val minSize = iconPad + iconPadMin
            Box(
                Modifier
                    .sizeIn(minWidth = minSize, minHeight = minSize)
                    .padding(
                        start = iconPad,
                        top = iconPadVertical,
                        bottom = iconPadVertical
                    ),
                contentAlignment = Alignment.CenterStart
            ) { icon() }
        }

        Column(
            Modifier
                .weight(1f)
                .padding(start = iconPad, end = iconPad, top = 5.dp, bottom = 5.dp)
        ) {
            text()
        }

        if (buttons != null) {
            Box(contentAlignment = Alignment.Center) {
                buttons()
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun PreviewButtonListItem() {
    Theme(darkTheme = false) {
        ButtonListItem(
            icon = {
                Icon(
                    Icons.Filled.LocalFireDepartment,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp)
                )
            },
            text = {
                Column {
                    Text("some pretext")
                    Text("great stuff", style = MaterialTheme.typography.h5)
                    Text("some subtext")
                    Text("more subtext")
                }
            },
            buttons = {
                Row {
                    IconButton(
                        modifier = Modifier
                            .size(80.dp),
                        onClick = { },
                    ) {
                        Icon(
                            modifier = Modifier
                                .size(60.dp),
                            imageVector = Icons.Filled.Language,
                            contentDescription = null,
                        )
                    }
                    IconButton(
                        modifier = Modifier
                            .size(80.dp),
                        onClick = { },
                    ) {
                        Icon(
                            modifier = Modifier
                                .size(60.dp),
                            imageVector = Icons.Filled.LocalFireDepartment,
                            contentDescription = null,
                        )
                    }
                }
            },
        )
    }
}