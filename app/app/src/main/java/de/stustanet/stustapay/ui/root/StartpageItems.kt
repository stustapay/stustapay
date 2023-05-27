package de.stustanet.stustapay.ui.root

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import de.stustanet.stustapay.model.Access


val startpageItems = listOf(
    StartpageItem(
        icon = Icons.Filled.Face,
        label = "Ticket Sale",
        navDestination = RootNavDests.ticket,
        canAccess = { _, t -> Access.canSellTicket(t) }
    ),
    StartpageItem(
        icon = Icons.Filled.ShoppingCart,
        label = "Product Sale",
        navDestination = RootNavDests.sale,
        canAccess = { u, t -> Access.canSell(u, t) }
    ),
    StartpageItem(
        icon = Icons.Filled.KeyboardArrowUp,
        label = "Cash In and Out",
        navDestination = RootNavDests.topup,
        canAccess = { _, t -> Access.canTopUp(t) }
    ),
    StartpageItem(
        icon = Icons.Filled.Info,
        label = "Account Status",
        navDestination = RootNavDests.status,
        canAccess = { _, _ -> true }
    ),
    StartpageItem(
        icon = Icons.Filled.List,
        label = "Order History",
        navDestination = RootNavDests.history,
        canAccess = { u, t -> Access.canSell(u, t) }
    ),
    StartpageItem(
        icon = Icons.Filled.Favorite,
        label = "Rewards",
        navDestination = RootNavDests.rewards,
        canAccess = { u, _ -> Access.canGiveVouchers(u) || Access.canGiveFreeTickets(u) }
    ),
    StartpageItem(
        icon = Icons.Filled.ThumbUp,
        label = "Cashier Management",
        navDestination = RootNavDests.cashierManagement,
        canAccess = { u, _ -> Access.canManageCashiers(u) }
    ),
    StartpageItem(
        icon = Icons.Filled.Info,
        label = "Cashier Status",
        navDestination = RootNavDests.cashierStatus,
        canAccess = { _, _ -> true }
    )
)