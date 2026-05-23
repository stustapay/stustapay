package de.stustapay.stustapay.ui.nav

import androidx.compose.material.Icon
import androidx.compose.material.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.painterResource
import de.stustapay.libssp.R
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
                            Icon(painter = painterResource(R.drawable.menu_24), "Open the menu")
                        }

                        TopAppBarIcon.Type.BACK -> {
                            Icon(painter = painterResource(R.drawable.arrow_back_24), "Go back")
                        }
                    }
                }
            }
        } else {
            null
        }
    )
}
