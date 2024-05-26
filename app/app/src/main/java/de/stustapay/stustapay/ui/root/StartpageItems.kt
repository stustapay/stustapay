package de.stustapay.stustapay.ui.root

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.ThumbUp
import de.stustapay.stustapay.R
import de.stustapay.stustapay.model.Access


val startpageItems = listOf(
    StartpageItem(icon = Icons.Filled.ShoppingCart,
        label = R.string.root_item_sale,
        navDestination = RootNavDests.sale,
        canAccess = { u, t -> Access.canSell(u, t) }),
    StartpageItem(icon = Icons.Filled.KeyboardArrowUp,
        label = R.string.root_item_topup,
        navDestination = RootNavDests.topup,
        canAccess = { u, t -> Access.canTopUp(t, u) }),
    StartpageItem(icon = Icons.Filled.Face,
        label = R.string.root_item_ticket,
        navDestination = RootNavDests.ticket,
        canAccess = { u, t -> Access.canSellTicket(t, u) }),
    StartpageItem(icon = Icons.Filled.Favorite,
        label = R.string.root_item_rewards,
        navDestination = RootNavDests.rewards,
        canAccess = { u, _ -> Access.canGiveVouchers(u) || Access.canGiveFreeTickets(u) }),
    StartpageItem(icon = Icons.Filled.List,
        label = R.string.history_title,
        navDestination = RootNavDests.history,
        canAccess = { u, t -> Access.canSell(u, t) }),
    StartpageItem(icon = Icons.Filled.Info,
        label = R.string.customer_title,
        navDestination = RootNavDests.status,
        canAccess = { _, _ -> true }),
    StartpageItem(icon = Icons.Filled.Refresh,
        label = R.string.customer_swap,
        navDestination = RootNavDests.swap,
        canAccess = { u, _, -> Access.canSwap(u) }),
    StartpageItem(icon = Icons.Filled.AccountCircle,
        label = R.string.management_title,
        navDestination = RootNavDests.cashier,
        canAccess = { u, t -> Access.canManageCashiers(u) or Access.canPayOut(t, u) or Access.canTopUp(t, u) or Access.canSellTicket(t, u) }),
    StartpageItem(icon = Icons.Filled.Lock,
        label = R.string.management_vault_title,
        navDestination = RootNavDests.vault,
        canAccess = { u, _ -> Access.canManageCashiers(u) }),
    StartpageItem(icon = Icons.Filled.DateRange,
        label = R.string.root_item_stats,
        navDestination = RootNavDests.stats,
        canAccess = { u, _ -> Access.canViewStats(u) }),
)