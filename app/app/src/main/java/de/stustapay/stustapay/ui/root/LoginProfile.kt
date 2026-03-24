package de.stustapay.stustapay.ui.root

import androidx.compose.foundation.layout.padding
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R

@Composable
fun LoginProfile(
    viewModel: TerminalConfigViewModel
) {
    val loginProfileUiState: LoginProfileUIState by viewModel.loginProfileUIState.collectAsStateWithLifecycle()

    /*
    var image: ImageVector = Icons.Filled.Person
    if (loginProfileUiState is LoginProfileUIState.NotLoggedIn) {
        image = Icons.Filled.Warning
    }

    // TODO: display the user profile picture :)
    Image(
        imageVector = image,
        modifier = Modifier
            .size(size = 70.dp)
            .clip(shape = CircleShape)
            .padding(top = 2.dp),
        contentDescription = "Avatar",
        colorFilter = ColorFilter.tint(MaterialTheme.colors.primary)
    )
    */

    when (val login = loginProfileUiState) {
        is LoginProfileUIState.LoggedIn -> {
            Text(
                modifier = Modifier.padding(top = 5.dp),
                textAlign = TextAlign.Center,
                text = login.username,
                fontSize = 26.sp,
                fontWeight = FontWeight.Bold,
            )
            Text(
                modifier = Modifier.padding(top = 4.dp, bottom = 10.dp),
                text = login.role,
                fontSize = 18.sp,
            )
        }

        is LoginProfileUIState.NotLoggedIn -> {
            Text(
                modifier = Modifier.padding(top = 4.dp, bottom = 10.dp),
                textAlign = TextAlign.Center,
                text = stringResource(R.string.not_logged_in),
                fontSize = 18.sp,
            )
        }

        is LoginProfileUIState.Error -> {
            Text(
                modifier = Modifier.padding(
                    start = 10.dp,
                    end = 10.dp,
                    top = 8.dp,
                    bottom = 30.dp,
                ),
                text = login.message,
                fontSize = 18.sp,
            )
        }
    }
}
