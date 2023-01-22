package de.stustanet.stustapay.ui

import androidx.compose.material.Icon
import androidx.compose.material.IconButton
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Menu
import androidx.compose.runtime.Composable
import androidx.compose.material.TopAppBar as MaterialTopAppBar


@Composable
fun TopAppBar(
    title: @Composable () -> Unit, iconType: TopAppBarIcon, onTopLeftIconClick: () -> Unit
) {
    MaterialTopAppBar(title = title, navigationIcon = {
        IconButton(onClick = {
            onTopLeftIconClick()
        }) {
            when (iconType) {
                TopAppBarIcon.MENU -> {
                    Icon(Icons.Filled.Menu, "Open the menu")
                }
                TopAppBarIcon.BACK -> {
                    Icon(Icons.Filled.ArrowBack, "Go back")
                }
            }
        }
    })
}
