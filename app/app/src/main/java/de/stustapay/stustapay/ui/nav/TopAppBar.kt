package de.stustapay.stustapay.ui.nav

import androidx.compose.material.Icon
import androidx.compose.material.IconButton
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Menu
import androidx.compose.runtime.Composable
import androidx.compose.material.TopAppBar as MaterialTopAppBar

class TopAppBarIcon(
    val type: Type,
    val onClick: () -> Unit
) {
    enum class Type {
        MENU,
        BACK,
    }
}


@Composable
fun TopAppBar(
    title: @Composable () -> Unit,
    icon: TopAppBarIcon? = null,
) {
    MaterialTopAppBar(
        title = title,
        navigationIcon = if (icon != null) {
            {
                IconButton(onClick = {
                    icon.onClick()
                }) {
                    when (icon.type) {
                        TopAppBarIcon.Type.MENU -> {
                            Icon(Icons.Filled.Menu, "Open the menu")
                        }

                        TopAppBarIcon.Type.BACK -> {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "Go back")
                        }
                    }
                }
            }
        } else {
            null
        }
    )
}
