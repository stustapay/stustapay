package de.stustapay.stustapay.ui.common

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import de.stustapay.stustapay.R

@Composable
fun ErrorBox(
    modifier: Modifier = Modifier,
    actuallyOk: Boolean = false,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = modifier
            .padding(horizontal = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            if (actuallyOk) {
                Image(
                    imageVector = Icons.Filled.CheckCircle,
                    modifier = Modifier
                        .size(size = 120.dp)
                        .clip(shape = CircleShape)
                        .padding(top = 2.dp),
                    colorFilter = ColorFilter.tint(MaterialTheme.colors.primary),
                    contentDescription = stringResource(R.string.success),
                )
            }
            else {
                FailureIcon(Modifier.size(60.dp))
            }

            content()
        }
    }
}

@Preview
@Composable
fun PreviewErrorBox() {
    ErrorBox(actuallyOk = true) {
        Text("have you ever seen something this broken? i haven't.")
    }
}