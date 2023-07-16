package de.stustapay.stustapay.ui.root

import androidx.compose.ui.graphics.vector.ImageVector
import de.stustapay.stustapay.model.TerminalConfig
import de.stustapay.stustapay.model.CurrentUser
import de.stustapay.stustapay.ui.nav.NavDest

data class StartpageItem(
    val icon: ImageVector,
    val label: Int,
    val navDestination: NavDest? = null,
    val isUnread: Boolean = false,
    val canAccess: (CurrentUser, TerminalConfig) -> Boolean = { _, _ -> false },
)
