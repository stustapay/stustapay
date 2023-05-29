package de.stustanet.stustapay.ui.root

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.res.stringResource
import de.stustanet.stustapay.R
import de.stustanet.stustapay.model.Access


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
        label = R.string.root_item_status,
        navDestination = RootNavDests.status,
        canAccess = { _, _ -> true }
    ),
    StartpageItem(
        icon = Icons.Filled.List,
        label = R.string.root_item_history,
        navDestination = RootNavDests.history,
        canAccess = { u, t -> Access.canSell(u, t) }
    ),
    StartpageItem(
        icon = Icons.Filled.Favorite,
        label = R.string.root_item_rewards,
        navDestination = RootNavDests.rewards,
        canAccess = { u, _ -> Access.canGiveVouchers(u) || Access.canGiveFreeTickets(u) }
    ),
    StartpageItem(
        icon = Icons.Filled.ThumbUp,
        label = R.string.root_item_cashierManagement,
        navDestination = RootNavDests.cashierManagement,
        canAccess = { u, _ -> Access.canManageCashiers(u) }
    ),
    StartpageItem(
        icon = Icons.Filled.Info,
        label = R.string.root_item_cashierStatus,
        navDestination = RootNavDests.cashierStatus,
        canAccess = { _, _ -> true }
    )
)