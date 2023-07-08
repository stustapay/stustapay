package de.stustapay.stustapay.ui.common

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.padding
import androidx.compose.material.MaterialTheme
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import de.stustapay.stustapay.R


@Composable
fun FailureIcon(modifier: Modifier = Modifier) {
    Image(
        imageVector = Icons.Filled.Warning,
        modifier = modifier
            .padding(top = 2.dp),
        contentDescription = stringResource(R.string.error),
        colorFilter = ColorFilter.tint(MaterialTheme.colors.error),
    )
}


