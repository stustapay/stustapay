package de.stustapay.stustapay.ui.common.selfservice

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Button
import androidx.compose.material.ButtonColors
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Card
import androidx.compose.material.LinearProgressIndicator
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

object SelfServicePalette {
    val backgroundTop = Color(0xFF0A1322)
    val backgroundBottom = Color(0xFF101D34)
    val panel = Color(0xFF182A46)
    val panelMuted = Color(0xFF12213A)
    val panelBorder = Color(0xFF2C3D5A)
    val title = Color(0xFFF4F8FF)
    val subtitle = Color(0xFFB4C2D8)
    val accent = Color(0xFFFFB547)
    val success = Color(0xFF1FC892)
    val successMuted = Color(0xFFD8FFF2)
    val error = Color(0xFFFF6B6B)
    val errorMuted = Color(0xFFFFC8C8)
}

@Composable
fun SelfServiceBackground(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(SelfServicePalette.backgroundTop, SelfServicePalette.backgroundBottom)
                )
            ),
        content = content
    )
}

@Composable
fun SelfServicePanel(
    modifier: Modifier = Modifier,
    borderColor: Color = SelfServicePalette.panelBorder,
    backgroundColor: Color = SelfServicePalette.panel,
    content: @Composable () -> Unit
) {
    Card(
        modifier = modifier,
        backgroundColor = backgroundColor,
        shape = RoundedCornerShape(16.dp),
        elevation = 0.dp
    ) {
        Box(
            modifier = Modifier
                .border(1.5.dp, borderColor, RoundedCornerShape(16.dp))
                .padding(14.dp)
        ) {
            content()
        }
    }
}

@Composable
fun SelfServiceHeadline(
    title: String,
    subtitle: String,
    subtitleColor: Color = SelfServicePalette.subtitle,
    titleFontSize: androidx.compose.ui.unit.TextUnit = 42.sp,
    subtitleFontSize: androidx.compose.ui.unit.TextUnit = 19.sp,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            text = title,
            color = SelfServicePalette.title,
            fontWeight = FontWeight.ExtraBold,
            fontSize = titleFontSize
        )
        Text(
            text = subtitle,
            color = subtitleColor,
            fontWeight = FontWeight.SemiBold,
            fontSize = subtitleFontSize
        )
    }
}

@Composable
fun SelfServiceCountdownCard(
    label: String,
    subLabel: String,
    progress: Float,
    modifier: Modifier = Modifier
) {
    SelfServicePanel(
        modifier = modifier,
        backgroundColor = SelfServicePalette.panelMuted
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                text = label,
                color = SelfServicePalette.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold
            )
            LinearProgressIndicator(
                progress = progress.coerceIn(0f, 1f),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(10.dp),
                color = SelfServicePalette.accent,
                backgroundColor = SelfServicePalette.panelBorder
            )
            Text(
                text = subLabel,
                color = SelfServicePalette.subtitle,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
fun selfServicePrimaryButtonColors(): ButtonColors = ButtonDefaults.buttonColors(
    backgroundColor = SelfServicePalette.accent,
    contentColor = SelfServicePalette.backgroundTop,
    disabledBackgroundColor = SelfServicePalette.panelBorder,
    disabledContentColor = SelfServicePalette.subtitle
)

@Composable
fun selfServiceSecondaryButtonColors(): ButtonColors = ButtonDefaults.buttonColors(
    backgroundColor = SelfServicePalette.panel,
    contentColor = SelfServicePalette.title,
    disabledBackgroundColor = SelfServicePalette.panelBorder,
    disabledContentColor = SelfServicePalette.subtitle
)

@Composable
fun SelfServiceActionButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    primary: Boolean = true,
    enabled: Boolean = true,
    fontSize: androidx.compose.ui.unit.TextUnit = 18.sp
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(56.dp),
        shape = RoundedCornerShape(14.dp),
        colors = if (primary) selfServicePrimaryButtonColors() else selfServiceSecondaryButtonColors()
    ) {
        Text(
            text = text,
            fontSize = fontSize,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun SelfServiceBottomActions(
    primaryText: String,
    onPrimary: () -> Unit,
    secondaryText: String,
    onSecondary: () -> Unit,
    buttonTextSize: androidx.compose.ui.unit.TextUnit = 18.sp,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        SelfServiceActionButton(
            text = primaryText,
            onClick = onPrimary,
            modifier = Modifier.weight(1f),
            primary = true,
            fontSize = buttonTextSize
        )
        SelfServiceActionButton(
            text = secondaryText,
            onClick = onSecondary,
            modifier = Modifier.weight(1f),
            primary = false,
            fontSize = buttonTextSize
        )
    }
}
