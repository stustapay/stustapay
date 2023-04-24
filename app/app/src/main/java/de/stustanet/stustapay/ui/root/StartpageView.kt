package de.stustanet.stustapay.ui.root

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.Divider
import androidx.compose.material.Icon
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustanet.stustapay.ui.nav.NavDest

data class NavMenuItem(
    val icon: ImageVector,
    val label: String,
    val navDestination: NavDest? = null,
    val isUnread: Boolean = false,
    val dividePrevious: Boolean = false
)

@Composable
private fun getNavItems(): List<NavMenuItem> {
    val itemsList = arrayListOf<NavMenuItem>()

    itemsList.add(
        NavMenuItem(
            icon = Icons.Filled.ShoppingCart,
            label = "Process Orders",
            navDestination = RootNavDests.ordering,
        )
    )
    itemsList.add(
        NavMenuItem(
            icon = Icons.Filled.Add,
            label = "Process Deposits",
            navDestination = RootNavDests.deposit,
        )
    )
    itemsList.add(
        NavMenuItem(
            icon = Icons.Filled.Info,
            label = "Account Status",
            navDestination = RootNavDests.status,
        )
    )
    itemsList.add(
        NavMenuItem(
            icon = Icons.Filled.List,
            label = "Transaction History",
        )
    )
    itemsList.add(
        NavMenuItem(
            icon = Icons.Filled.Person,
            navDestination = RootNavDests.user,
            label = "User"
        )
    )
    itemsList.add(
        NavMenuItem(
            icon = Icons.Filled.Settings,
            label = "Settings",
            navDestination = RootNavDests.settings,
            dividePrevious = true,
        )
    )
    itemsList.add(
        NavMenuItem(
            icon = Icons.Filled.Send,
            label = "Development",
            navDestination = RootNavDests.development
        )
    )

    return itemsList
}


@Composable
fun StartpageView(
    navigateTo: (NavDest) -> Unit = {},
) {

    val navItems = getNavItems()
    val gradientColors = listOf(Color(0xFFF70A74), Color(0xFFF59118))

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = Brush.verticalGradient(colors = gradientColors)),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "StuStaPay",
            fontSize = 30.sp,
            color = Color.White,
            modifier = Modifier.padding(top = 10.dp)
        )

        LoginProfile()

        for (item in navItems) {
            if (item.dividePrevious) {
                Spacer(modifier = Modifier.weight(1.0f))
                Divider()
            }

            StartpageEntry(item = item, navigateTo = navigateTo)
        }
    }
}


@Composable
private fun StartpageEntry(
    item: NavMenuItem,
    unreadBadgeColor: Color = Color(0xFF0FFF93),
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
            .padding(horizontal = 24.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {

        Box {
            Icon(
                imageVector = item.icon,
                modifier = Modifier
                    .padding(all = 2.dp)
                    .size(size = 28.dp),
                contentDescription = null,
                tint = Color.White
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
            fontSize = 20.sp,
            fontWeight = FontWeight.Medium,
            color = Color.White
        )
    }
}