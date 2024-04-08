package de.stustapay.chip_debug.ui.root

import androidx.compose.ui.graphics.vector.ImageVector
import de.stustapay.chip_debug.ui.nav.NavDest

data class StartpageItem(
    val icon: ImageVector,
    val label: Int,
    val navDestination: NavDest? = null,
    val isUnread: Boolean = false,
)
