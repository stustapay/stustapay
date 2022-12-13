package de.stustanet.stustapay

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustanet.stustapay.ui.theme.StuStaPayTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            StuStaPayTheme {
                // A surface container using the 'background' color from the theme
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colors.background
                ) {
                    SSPAppRoot()
                }
            }
        }
    }
}


data class DrawerMenuItem(
    val icon: ImageVector,
    val label: String,
    val isUnread: Boolean = false
)

@Composable
private fun SSPTopAppBar(onMenuIconClick: () -> Unit) {
    TopAppBar(
        title = { Text(text = "StuStaPay") },
        navigationIcon = {
            IconButton(
                onClick = {
                    onMenuIconClick()
                }
            ) {
                Icon(Icons.Filled.Menu, "Open the menu")
            }
        }
    )
}

@Composable
private fun SSPDrawer(
    itemClick: (String) -> Unit
) {
    val gradientColors = listOf(Color(0xFFF70A74), Color(0xFFF59118))
    val itemsList = getMenuItems()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = Brush.verticalGradient(colors = gradientColors)),
        horizontalAlignment = Alignment.CenterHorizontally,
        contentPadding = PaddingValues(vertical = 36.dp)
    ) {

        item {
            Image(
                imageVector = Icons.Filled.Person,
                modifier = Modifier
                    .size(size = 120.dp)
                    .clip(shape = CircleShape),
                contentDescription = "Avatar"
            )
            Text(
                modifier = Modifier.padding(top = 12.dp),
                text = "Walter Hoppenstedt",
                fontSize = 26.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Text(
                modifier = Modifier.padding(top = 8.dp, bottom = 30.dp),
                text = "Potzelt",
                fontWeight = FontWeight.Normal,
                fontSize = 16.sp,
                color = Color.White
            )
        }

        items(itemsList) { item ->
            MenuListItem(item = item) {
                itemClick(item.label)
            }
        }
    }
}

@Composable
private fun MenuListItem(
    item: DrawerMenuItem,
    unreadBollenColor: Color = Color(0xFF0FFF93),
    itemClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable {
                itemClick()
            }
            .padding(horizontal = 24.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {

        Box {
            Icon(
                imageVector = item.icon,
                modifier = Modifier
                    .padding(all = 2.dp)
                    .size(size = 28.dp),
                contentDescription = null,
                tint = Color.White
            )
            if (item.isUnread) {
                Box(
                    modifier = Modifier
                        .size(size = 8.dp)
                        .align(alignment = Alignment.TopEnd)
                        .background(color = unreadBollenColor, shape = CircleShape)
                )
            }
        }

        Text(
            modifier = Modifier.padding(start = 16.dp),
            text = item.label,
            fontSize = 20.sp,
            fontWeight = FontWeight.Medium,
            color = Color.White
        )
    }
}

@Composable
private fun getMenuItems(): List<DrawerMenuItem> {
    val itemsList = arrayListOf<DrawerMenuItem>()

    itemsList.add(
        DrawerMenuItem(
            icon = Icons.Filled.ShoppingCart,
            label = "Process Orders"
        )
    )
    itemsList.add(
        DrawerMenuItem(
            icon = Icons.Filled.Home,
            label = "Overview"
        )
    )
    itemsList.add(
        DrawerMenuItem(
            icon = Icons.Filled.Email,
            label = "System Messages",
            isUnread = true
        )
    )
    itemsList.add(
        DrawerMenuItem(
            icon = Icons.Filled.List,
            label = "Transaction History",
        )
    )
    itemsList.add(
        DrawerMenuItem(
            icon = Icons.Filled.Person,
            label = "Profile"
        )
    )
    itemsList.add(
        DrawerMenuItem(
            icon = Icons.Filled.Settings,
            label = "Settings"
        )
    )
    itemsList.add(
        DrawerMenuItem(
            icon = Icons.Filled.ExitToApp,
            label = "Logout"
        )
    )

    return itemsList
}


@Composable
fun SSPAppRoot() {
    val state = rememberScaffoldState()
    val scope = rememberCoroutineScope()
    val contextForToast = LocalContext.current.applicationContext

    Scaffold(
        scaffoldState = state,
        topBar = {
            SSPTopAppBar {
                scope.launch {
                    state.drawerState.open()
                }
            }
        },

        drawerContent = {
            SSPDrawer { itemLabel ->
                Toast.makeText(contextForToast, "Clicked: $itemLabel", Toast.LENGTH_SHORT).show()
                scope.launch {
                    state.drawerState.close()
                }
            }
        }
    ) {
        Text(text = "Nur noch wenige Lüfterumdrehungen...")
    }
}


@Preview(showBackground = true)
@Composable
fun DefaultPreview() {
    StuStaPayTheme {
        SSPAppRoot()
    }
}