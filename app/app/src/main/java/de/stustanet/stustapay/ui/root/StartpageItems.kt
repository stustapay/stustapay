package de.stustanet.stustapay.ui.root

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import de.stustanet.stustapay.model.Access
import de.stustanet.stustapay.model.Privilege


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
        canAccess = { u, _ -> Access.canSell(u) }
    ),
    StartpageItem(
        icon = Icons.Filled.Add,
        label = "Account TopUp",
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
        label = "Transaction History",
        navDestination = RootNavDests.history,
        canAccess = { u, _ -> Access.canSell(u) }
    ),
    StartpageItem(
        icon = Icons.Filled.Favorite,
        label = "Helper Vouchers",
        navDestination = RootNavDests.vouchers,
        canAccess = { u, _ -> Access.canGiveVouchers(u) }
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