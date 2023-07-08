package de.stustapay.stustapay.ui.common

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.MaterialTheme
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import de.stustapay.stustapay.R


@Composable
fun SuccessIcon(modifier: Modifier = Modifier) {
    Image(
        imageVector = Icons.Filled.CheckCircle,
        modifier = modifier
            .clip(shape = CircleShape)
            .padding(top = 2.dp),
        colorFilter = ColorFilter.tint(MaterialTheme.colors.primary),
        contentDescription = stringResource(R.string.success),
    )
}
