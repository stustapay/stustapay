package de.stustapay.chip_debug.ui.root

import androidx.compose.ui.res.painterResource
import de.stustapay.chip_debug.R


val startpageItems = listOf(
    StartpageItem(
        iconId = de.stustapay.libssp.R.drawable.warning_24,
        label = R.string.root_item_test,
        navDestination = RootNavDests.test,
    ),
    StartpageItem(
        iconId = de.stustapay.libssp.R.drawable.edit_24,
        label = R.string.root_item_write,
        navDestination = RootNavDests.write,
    ),
    StartpageItem(
        iconId = de.stustapay.libssp.R.drawable.search_24,
        label = R.string.root_item_verify,
        navDestination = RootNavDests.verify,
    ),
)