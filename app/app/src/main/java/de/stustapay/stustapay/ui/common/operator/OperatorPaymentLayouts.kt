package de.stustapay.stustapay.ui.common.operator

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Button
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Surface
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class OperatorPaymentLayoutProfile(
    val counterLayout: Boolean,
    val gap: Dp,
    val cardHeight: Dp,
    val railWidth: Dp,
)

@Composable
fun OperatorAdaptivePaymentLayout(
    modifier: Modifier = Modifier,
    mainContent: @Composable ColumnScope.(OperatorPaymentLayoutProfile) -> Unit,
    railContent: @Composable ColumnScope.(OperatorPaymentLayoutProfile) -> Unit,
) {
    BoxWithConstraints(modifier = modifier.fillMaxSize()) {
        val aspectRatio = maxWidth.value / maxHeight.value
        val counterLayout = maxWidth >= 760.dp && aspectRatio > 0.56f
        val profile = OperatorPaymentLayoutProfile(
            counterLayout = counterLayout,
            gap = if (counterLayout) 14.dp else 12.dp,
            cardHeight = if (counterLayout) 132.dp else 118.dp,
            railWidth = 272.dp,
        )

        if (counterLayout) {
            Row(
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.spacedBy(profile.gap),
            ) {
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight(),
                    verticalArrangement = Arrangement.spacedBy(profile.gap),
                ) {
                    mainContent(profile)
                }
                Column(
                    modifier = Modifier
                        .width(profile.railWidth)
                        .fillMaxHeight(),
                    verticalArrangement = Arrangement.spacedBy(profile.gap),
                ) {
                    railContent(profile)
                }
            }
        } else {
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(profile.gap),
            ) {
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(profile.gap),
                ) {
                    mainContent(profile)
                }
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(profile.gap),
                ) {
                    railContent(profile)
                }
            }
        }
    }
}

@Composable
fun OperatorMetricCard(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    accent: Boolean = false,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = OperatorPalette.panel,
        border = BorderStroke(1.5.dp, OperatorPalette.panelBorder),
        elevation = 0.dp,
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                text = label,
                color = OperatorPalette.subtitle,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = value,
                color = if (accent) OperatorPalette.success else OperatorPalette.title,
                fontSize = 22.sp,
                fontWeight = FontWeight.ExtraBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
fun OperatorAmountOptionCard(
    amount: String,
    modifier: Modifier = Modifier,
    title: String = "",
    description: String? = null,
    amountFontSize: TextUnit = 24.sp,
    trailingLabel: String? = null,
    selected: Boolean = false,
    onClick: () -> Unit,
) {
    val hasHeader = title.isNotBlank() || description != null
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        color = if (selected) Color(0xFF163A66) else OperatorPalette.interactivePanel,
        border = BorderStroke(
            width = 1.5.dp,
            color = if (selected) OperatorPalette.accent else OperatorPalette.panelBorder,
        ),
        elevation = 0.dp,
    ) {
        Column(
            modifier = Modifier
                .padding(14.dp)
                .fillMaxWidth()
                .then(if (!hasHeader) Modifier.fillMaxHeight() else Modifier),
            verticalArrangement = if (hasHeader) {
                Arrangement.spacedBy(10.dp)
            } else {
                Arrangement.Center
            },
        ) {
            if (hasHeader) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (title.isNotBlank()) {
                        Text(
                            text = title,
                            color = OperatorPalette.title,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    if (description != null) {
                        Text(
                            text = description,
                            color = OperatorPalette.subtitle,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = amount,
                    color = OperatorPalette.title,
                    fontSize = amountFontSize,
                    fontWeight = FontWeight.ExtraBold,
                )
                if (!trailingLabel.isNullOrBlank()) {
                    Surface(
                        shape = RoundedCornerShape(999.dp),
                        color = OperatorPalette.accent,
                        elevation = 0.dp,
                    ) {
                        Text(
                            text = trailingLabel,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            color = OperatorPalette.accentText,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun OperatorRailSummaryRow(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    accent: Boolean = false,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            color = OperatorPalette.subtitle,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            text = value,
            color = if (accent) OperatorPalette.success else OperatorPalette.title,
            fontSize = 20.sp,
            fontWeight = FontWeight.ExtraBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

enum class OperatorActionButtonStyle {
    Primary,
    Secondary,
    PeerPrimary,
}

@Composable
fun OperatorActionButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    primary: Boolean = true,
    destructive: Boolean = false,
    style: OperatorActionButtonStyle = if (primary) OperatorActionButtonStyle.Primary else OperatorActionButtonStyle.Secondary,
) {
    val backgroundColor = when {
        destructive -> Color(0xFFC63E3E)
        style == OperatorActionButtonStyle.Primary || style == OperatorActionButtonStyle.PeerPrimary -> OperatorPalette.accent
        else -> OperatorPalette.pill
    }
    val contentColor = when {
        destructive -> Color.White
        style == OperatorActionButtonStyle.Primary || style == OperatorActionButtonStyle.PeerPrimary -> OperatorPalette.accentText
        else -> OperatorPalette.title
    }

    Button(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp),
        enabled = enabled,
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(
            backgroundColor = backgroundColor,
            contentColor = contentColor,
            disabledBackgroundColor = OperatorPalette.panel,
            disabledContentColor = OperatorPalette.subtitle,
        ),
    ) {
        Text(
            text = text,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
fun OperatorStatePanel(
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    success: Boolean,
) {
    OperatorPanel(
        modifier = modifier,
        backgroundColor = if (success) OperatorPalette.successPanel else Color(0xFF3A1D25),
        borderColor = if (success) OperatorPalette.success else Color(0xFFC63E3E),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                text = title,
                color = if (success) OperatorPalette.success else Color(0xFFFFB6B6),
                fontSize = 28.sp,
                fontWeight = FontWeight.ExtraBold,
            )
            Text(
                text = message,
                color = OperatorPalette.title,
                fontSize = 16.sp,
                lineHeight = 22.sp,
                fontWeight = FontWeight.Medium,
            )
        }
    }
}
