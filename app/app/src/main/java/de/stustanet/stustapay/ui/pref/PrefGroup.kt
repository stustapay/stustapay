package de.stustanet.stustapay.ui.pref

import androidx.compose.foundation.layout.*
import androidx.compose.material.MaterialTheme
import androidx.compose.material.ProvideTextStyle
import androidx.compose.material.Surface
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp


@Composable
fun PrefGroup(
    modifier: Modifier = Modifier,
    title: @Composable (() -> Unit)? = null,
    preferences: @Composable ColumnScope.() -> Unit,
) {
    Surface {
        Column(
            modifier = modifier.fillMaxWidth(),
        ) {
            if (title != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(40.dp)
                        .padding(horizontal = 16.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    val primary = MaterialTheme.colors.primary
                    val titleStyle = MaterialTheme.typography.subtitle1.copy(color = primary)
                    ProvideTextStyle(value = titleStyle) { title() }
                }
            }
            preferences()
        }
    }
}


@Preview
@Composable
internal fun PrefGroupPreview() {
    MaterialTheme {
        PrefGroup(
            title = { Text(text = "Random Title") }
        ) {
            Box(
                modifier = Modifier
                    .height(64.dp)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center,
            ) {
                Text(text = "Really cool content")
            }
        }
    }
}
