package de.stustapay.stustapay.ui.root

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import de.stustapay.stustapay.R
import de.stustapay.stustapay.model.Access


val startpageItems = listOf(
    StartpageItem(
        icon = Icons.Filled.Face,
        label = R.string.root_item_ticket,
        navDestination = RootNavDests.ticket,
        canAccess = { u, t -> Access.canSellTicket(t, u) }
    ),
    StartpageItem(
        icon = Icons.Filled.ShoppingCart,
        label = R.string.root_item_sale,
        navDestination = RootNavDests.sale,
        canAccess = { u, t -> Access.canSell(u, t) }
    ),
    StartpageItem(
        icon = Icons.Filled.KeyboardArrowUp,
        label = R.string.root_item_topup,
        navDestination = RootNavDests.topup,
        canAccess = { u, t -> Access.canTopUp(t, u) }
    ),
    StartpageItem(
        icon = Icons.Filled.Info,
        label = R.string.customer_title,
        navDestination = RootNavDests.status,
        canAccess = { _, _ -> true }
    ),
    StartpageItem(
        icon = Icons.Filled.List,
        label = R.string.history_title,
        navDestination = RootNavDests.history,
        canAccess = { u, t -> Access.canSell(u, t) }
    ),
    StartpageItem(
        icon = Icons.Filled.DateRange,
        label = R.string.root_item_stats,
        navDestination = RootNavDests.stats,
        canAccess = { u, _ -> Access.canViewStats(u) }
    ),
    StartpageItem(
        icon = Icons.Filled.Favorite,
        label = R.string.root_item_rewards,
        navDestination = RootNavDests.rewards,
        canAccess = { u, _ -> Access.canGiveVouchers(u) || Access.canGiveFreeTickets(u) }
    ),
    StartpageItem(
        icon = Icons.Filled.ThumbUp,
        label = R.string.management_title,
        navDestination = RootNavDests.cashier,
        canAccess = { u, t -> Access.canManageCashiers(u) or (t.till?.allowCashOut == true) or (t.till?.allowTopUp == true) or (t.till?.allowTicketSale == true) }
    )
)