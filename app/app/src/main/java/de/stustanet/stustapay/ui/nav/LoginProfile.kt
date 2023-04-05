package de.stustanet.stustapay.ui.nav

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Warning
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun LoginProfile(
    viewModel: LoginProfileViewModel = hiltViewModel()
) {
    val loginProfileUiState: LoginProfileUIState by viewModel.loginProfileUIState.collectAsStateWithLifecycle()

    LaunchedEffect(true) {
        viewModel.fetchLogin()
    }

    var image: ImageVector = Icons.Filled.Person
    if (loginProfileUiState is LoginProfileUIState.NotLoggedIn) {
        image = Icons.Filled.Warning
    }

    Image(
        imageVector = image,
        modifier = Modifier
            .size(size = 120.dp)
            .clip(shape = CircleShape),
        contentDescription = "Avatar"
    )

    when (val login = loginProfileUiState) {
        is LoginProfileUIState.LoggedIn -> {
            Text(
                modifier = Modifier.padding(top = 12.dp),
                text = login.username,
                fontSize = 26.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Text(
                modifier = Modifier.padding(top = 8.dp, bottom = 30.dp),
                text = login.privileges,
                fontWeight = FontWeight.Normal,
                fontSize = 16.sp,
                color = Color.White
            )
        }
        is LoginProfileUIState.NotLoggedIn -> {
            Text(
                modifier = Modifier.padding(top = 8.dp, bottom = 30.dp),
                text = "No Login",
                fontWeight = FontWeight.Normal,
                fontSize = 16.sp,
                color = Color.Cyan
            )
        }
        is LoginProfileUIState.Error -> {
            Text(
                modifier = Modifier.padding(top = 8.dp, bottom = 30.dp),
                text = login.message,
                fontWeight = FontWeight.Normal,
                fontSize = 16.sp,
                color = Color.White
            )
        }
    }
}