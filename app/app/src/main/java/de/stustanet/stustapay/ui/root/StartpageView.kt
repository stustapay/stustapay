package de.stustanet.stustapay.ui.root

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.Divider
import androidx.compose.material.Icon
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.model.Access
import de.stustanet.stustapay.model.TerminalConfig
import de.stustanet.stustapay.model.User
import de.stustanet.stustapay.ui.nav.NavDest

data class NavMenuItem(
    val icon: ImageVector,
    val label: String,
    val navDestination: NavDest? = null,
    val isUnread: Boolean = false,
    val dividePrevious: Boolean = false,
    val canAccess: (User, TerminalConfig) -> Boolean = { _, _ -> false },
    val alwaysShow: Boolean = false
)

@Composable
private fun getNavItems(): List<NavMenuItem> {
    val itemsList = arrayListOf<NavMenuItem>()

    itemsList.add(
        NavMenuItem(
            icon = Icons.Filled.ShoppingCart,
            label = "Process Orders",
            navDestination = RootNavDests.ordering,
            canAccess = { u, _ -> Access.canSell(u) }
        )
    )
    itemsList.add(
        NavMenuItem(
            icon = Icons.Filled.Add,
            label = "Process Deposits",
            navDestination = RootNavDests.deposit,
            canAccess = { _, t -> Access.canTopUp(t) }
        )
    )
    itemsList.add(
        NavMenuItem(
            icon = Icons.Filled.Info,
            label = "Account Status",
            navDestination = RootNavDests.status,
            canAccess = { u, _ -> Access.canSell(u) }
        )
    )
    itemsList.add(
        NavMenuItem(
            icon = Icons.Filled.List,
            label = "Transaction History",
            navDestination = RootNavDests.history,
            canAccess = { u, _ -> Access.canSell(u) }
        )
    )
    itemsList.add(
        NavMenuItem(
            icon = Icons.Filled.Person,
            navDestination = RootNavDests.user,
            label = "User",
            alwaysShow = true
        )
    )
    itemsList.add(
        NavMenuItem(
            icon = Icons.Filled.Settings,
            label = "Settings",
            navDestination = RootNavDests.settings,
            dividePrevious = true,
            alwaysShow = true
        )
    )
    itemsList.add(
        NavMenuItem(
            icon = Icons.Filled.Send,
            label = "Development",
            navDestination = RootNavDests.development,
            canAccess = { u, _ -> Access.canHackTheSystem(u) }
        )
    )

    return itemsList
}


@Composable
fun StartpageView(
    navigateTo: (NavDest) -> Unit = {},
    viewModel: StartpageViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val navItems = getNavItems()
    val gradientColors = listOf(MaterialTheme.colors.background, MaterialTheme.colors.onSecondary)

    LaunchedEffect(null) {
        viewModel.fetchAccessData()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = Brush.verticalGradient(colors = gradientColors)),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "StuStaPay",
            fontSize = 30.sp,
            modifier = Modifier.padding(top = 10.dp)
        )

        LoginProfile()

        for (item in navItems) {
            if (item.dividePrevious) {
                Spacer(modifier = Modifier.weight(1.0f))
                Divider()
            }

            if (item.alwaysShow || uiState.checkAccess(item.canAccess)) {
                StartpageEntry(item = item, navigateTo = navigateTo)
            }
        }
    }
}


@Composable
private fun StartpageEntry(
    item: NavMenuItem,
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
            fontSize = 20.sp,
            fontWeight = FontWeight.Medium,
        )
    }
}