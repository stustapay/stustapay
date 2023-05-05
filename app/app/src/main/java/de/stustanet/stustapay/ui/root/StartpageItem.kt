package de.stustanet.stustapay.ui.root

import androidx.compose.ui.graphics.vector.ImageVector
import de.stustanet.stustapay.model.TerminalConfig
import de.stustanet.stustapay.model.CurrentUser
import de.stustanet.stustapay.ui.nav.NavDest

data class StartpageItem(
    val icon: ImageVector,
    val label: String,
    val navDestination: NavDest? = null,
    val isUnread: Boolean = false,
    val canAccess: (CurrentUser, TerminalConfig) -> Boolean = { _, _ -> false },
)
