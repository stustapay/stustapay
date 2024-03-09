package de.stustapay.stustapay.ui.root

import androidx.compose.ui.graphics.vector.ImageVector
import de.stustapay.api.models.TerminalConfig
import de.stustapay.api.models.CurrentUser
import de.stustapay.stustapay.ui.nav.NavDest

data class StartpageItem(
    val icon: ImageVector,
    val label: Int,
    val navDestination: NavDest? = null,
    val isUnread: Boolean = false,
    val canAccess: (CurrentUser, TerminalConfig) -> Boolean = { _, _ -> false },
)
