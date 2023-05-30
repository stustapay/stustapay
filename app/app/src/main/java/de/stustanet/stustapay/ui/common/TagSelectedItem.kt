package de.stustanet.stustapay.ui.common


import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.material.Button
import androidx.compose.material.Icon
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.ui.theme.errorButtonColors


@Preview
@Composable
fun PreviewTagSelectedItem() {
    TagSelectedItem(tag = UserTag(uid = 0x13374242abcdu), onClear = {})
}

@Composable
fun TagSelectedItem(
    tag: UserTag,
    modifier: Modifier = Modifier,
    onClear: () -> Unit
) {
    Row(
        modifier = modifier
            .fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TagItem(tag, modifier = Modifier.weight(1.0f))
        Button(
            onClick = onClear,
            colors = errorButtonColors(),
            modifier = Modifier.width(80.dp),
        ) {
            Icon(Icons.Filled.Clear, "scan new tag")
        }
    }
}
