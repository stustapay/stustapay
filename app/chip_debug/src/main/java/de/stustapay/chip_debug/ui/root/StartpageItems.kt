package de.stustapay.chip_debug.ui.root

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import de.stustapay.chip_debug.R


val startpageItems = listOf(
    StartpageItem(
        icon = Icons.Filled.Warning,
        label = R.string.root_item_test,
        navDestination = RootNavDests.test
    ),
)