package de.stustanet.stustapay.ui.root

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.Icon
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustanet.stustapay.ui.nav.NavDest
import de.stustanet.stustapay.ui.theme.StartpageItemStyle


@Composable
fun StartpageEntry(
    item: StartpageItem,
    unreadBadgeColor: Color = MaterialTheme.colors.secondary,
    navigateTo: (NavDest) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable {
                if (item.navDestination != null) {
                    navigateTo(item.navDestination)
                }
            }
            .padding(horizontal = 24.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {

        Box {
            Icon(
                imageVector = item.icon,
                modifier = Modifier
                    .padding(all = 2.dp)
                    .size(size = 28.dp),
                contentDescription = null,
                tint = MaterialTheme.colors.primary
            )
            if (item.isUnread) {
                Box(
                    modifier = Modifier
                        .size(size = 8.dp)
                        .align(alignment = Alignment.TopEnd)
                        .background(color = unreadBadgeColor, shape = CircleShape)
                )
            }
        }

        Text(
            modifier = Modifier.padding(start = 16.dp),
            text = item.label,
            style = StartpageItemStyle,
        )
    }
}
