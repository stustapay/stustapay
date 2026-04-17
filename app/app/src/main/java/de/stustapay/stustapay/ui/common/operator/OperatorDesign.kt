package de.stustapay.stustapay.ui.common.operator

import androidx.compose.foundation.Image
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Icon
import androidx.compose.material.Button
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Surface
import androidx.compose.material.Text
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.Icons
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePalette
import de.stustapay.stustapay.ui.common.theme.TfPayBluePalette

object OperatorPalette {
    val backgroundTop = TfPayBluePalette.backgroundTop
    val backgroundBottom = TfPayBluePalette.backgroundBottom
    val panel = TfPayBluePalette.panel
    val panelMuted = TfPayBluePalette.panelMuted
    val panelBorder = TfPayBluePalette.panelBorder
    val interactivePanel = TfPayBluePalette.interactivePanel
    val title = TfPayBluePalette.title
    val subtitle = TfPayBluePalette.subtitle
    val accent = SelfServicePalette.accent
    val accentText = backgroundTop
    val success = SelfServicePalette.success
    val successPanel = Color(0xFF16342A)
    val danger = Color(0xFFFF6B6B)
    val dangerPanel = Color(0xFF3A1D25)
    val dangerMuted = Color(0xFFFFB6B6)
    val pill = TfPayBluePalette.elevated
}

/**
 * Compact header matching the sale flow: back (optional), primary flow title, till/terminal on the side.
 * [compactHandheld] true = single row with till trailing; false = back + stacked title/till in a panel.
 */
@Composable
fun OperatorCompactFlowHeader(
    flowTitle: String,
    tillLabel: String?,
    onBack: (() -> Unit)?,
    compactHandheld: Boolean,
    modifier: Modifier = Modifier,
) {
    if (compactHandheld) {
        Surface(
            modifier = modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            color = OperatorPalette.panel,
            border = BorderStroke(1.5.dp, OperatorPalette.panelBorder),
            elevation = 0.dp,
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (onBack != null) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .background(OperatorPalette.pill, CircleShape)
                            .clickable(onClick = onBack),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = null,
                            tint = OperatorPalette.title,
                        )
                    }
                }
                Text(
                    text = flowTitle,
                    color = OperatorPalette.title,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f),
                )
                if (!tillLabel.isNullOrBlank()) {
                    Text(
                        text = tillLabel,
                        color = OperatorPalette.subtitle,
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
        return
    }

    OperatorPanel(
        modifier = modifier.fillMaxWidth(),
        backgroundColor = OperatorPalette.panel,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (onBack != null) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(OperatorPalette.pill, CircleShape)
                        .clickable(onClick = onBack),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = null,
                        tint = OperatorPalette.title,
                    )
                }
            }
            Column {
                Text(
                    text = flowTitle,
                    color = OperatorPalette.title,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold,
                )
                if (!tillLabel.isNullOrBlank()) {
                    Text(
                        text = tillLabel,
                        color = OperatorPalette.subtitle,
                        fontSize = 14.sp,
                    )
                }
            }
        }
    }
}

@Composable
fun OperatorBackground(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(OperatorPalette.backgroundTop, OperatorPalette.backgroundBottom)
                )
            ),
        content = content,
    )
}

@Composable
fun OperatorScaffold(
    title: String,
    subtitle: String,
    icon: ImageVector,
    iconPainter: Painter? = null,
    terminalLabel: String,
    footerHint: String,
    footerSection: String,
    footerStatus: String,
    modifier: Modifier = Modifier,
    languageLabel: String = "DE | EN | NL",
    showFooter: Boolean = true,
    onBack: (() -> Unit)? = null,
    headerAction: (@Composable () -> Unit)? = null,
    /** When set with [onBack], shows the same compact header as sale (flow title + till). */
    headerFlowTitle: String? = null,
    headerTillLabel: String? = null,
    content: @Composable BoxScope.() -> Unit,
) {
    BoxWithConstraints(modifier = modifier.fillMaxSize()) {
        val compactLayout = maxWidth < 600.dp
        val routeHeader = onBack != null
        val scaffoldPadding = if (compactLayout) 12.dp else 24.dp
        val scaffoldSpacing = if (routeHeader) 10.dp else if (compactLayout) 12.dp else 20.dp

        OperatorBackground {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(scaffoldPadding),
                verticalArrangement = Arrangement.spacedBy(scaffoldSpacing),
            ) {
                OperatorHeader(
                    title = title,
                    subtitle = subtitle,
                    icon = icon,
                    iconPainter = iconPainter,
                    terminalLabel = terminalLabel,
                    languageLabel = languageLabel,
                    onBack = onBack,
                    headerAction = headerAction,
                    compactRouteHeader = routeHeader,
                    headerFlowTitle = headerFlowTitle,
                    headerTillLabel = headerTillLabel,
                )
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    content = content,
                )
                if (showFooter) {
                    OperatorFooter(
                        hint = footerHint,
                        sectionLabel = footerSection,
                        statusLabel = footerStatus,
                    )
                }
            }
        }
    }
}

@Composable
fun OperatorHeader(
    title: String,
    subtitle: String,
    icon: ImageVector,
    iconPainter: Painter? = null,
    terminalLabel: String,
    modifier: Modifier = Modifier,
    languageLabel: String = "DE | EN | NL",
    onBack: (() -> Unit)? = null,
    headerAction: (@Composable () -> Unit)? = null,
    compactRouteHeader: Boolean = false,
    headerFlowTitle: String? = null,
    headerTillLabel: String? = null,
) {
    BoxWithConstraints(modifier = modifier.fillMaxWidth()) {
        if (onBack != null && headerFlowTitle != null) {
            val compactHandheld = maxWidth < 760.dp
            OperatorCompactFlowHeader(
                flowTitle = headerFlowTitle,
                tillLabel = headerTillLabel,
                onBack = onBack,
                compactHandheld = compactHandheld,
                modifier = Modifier.fillMaxWidth(),
            )
            return@BoxWithConstraints
        }

        if (compactRouteHeader && onBack != null) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = OperatorPalette.panelMuted,
                border = BorderStroke(1.5.dp, OperatorPalette.panelBorder),
                elevation = 0.dp,
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    OperatorCircleIcon(
                        icon = Icons.AutoMirrored.Filled.ArrowBack,
                        backgroundColor = OperatorPalette.pill,
                        tint = OperatorPalette.title,
                        modifier = Modifier.clickable(onClick = onBack),
                        containerSize = 40.dp,
                        iconSize = 20.dp,
                    )
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        Text(
                            text = title,
                            color = OperatorPalette.title,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.ExtraBold,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        if (subtitle.isNotBlank()) {
                            Text(
                                text = subtitle,
                                color = OperatorPalette.subtitle,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                    headerAction?.invoke()
                }
            }
            return@BoxWithConstraints
        }

        val compactLayout = maxWidth < 720.dp
        val headerPills = listOf(languageLabel, terminalLabel).filter { it.isNotBlank() }
        val horizontalPadding = if (compactLayout) 12.dp else 16.dp
        val verticalPadding = if (compactLayout) 14.dp else 18.dp
        val titleSize = if (compactLayout) 22.sp else 30.sp
        val subtitleSize = if (compactLayout) 14.sp else 16.sp

        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            color = OperatorPalette.backgroundTop,
            border = BorderStroke(1.5.dp, OperatorPalette.panelBorder),
            elevation = 0.dp,
        ) {
            if (compactLayout) {
                Column(
                    modifier = Modifier.padding(horizontal = horizontalPadding, vertical = verticalPadding),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(
                            modifier = Modifier.weight(1f),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            if (onBack != null) {
                                OperatorCircleIcon(
                                    icon = Icons.AutoMirrored.Filled.ArrowBack,
                                    backgroundColor = OperatorPalette.pill,
                                    tint = OperatorPalette.title,
                                    modifier = Modifier.clickable(onClick = onBack),
                                )
                            }
                            OperatorCircleIcon(
                                icon = icon,
                                painter = iconPainter,
                                backgroundColor = if (iconPainter != null) Color.Transparent else OperatorPalette.success,
                                tint = OperatorPalette.backgroundTop,
                                containerSize = if (iconPainter != null) 56.dp else 48.dp,
                                iconSize = if (iconPainter != null) 56.dp else 24.dp,
                            )
                            Column(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(2.dp)
                            ) {
                                Text(
                                    text = title,
                                    color = OperatorPalette.title,
                                    fontSize = titleSize,
                                    fontWeight = FontWeight.ExtraBold,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                Text(
                                    text = subtitle,
                                    color = OperatorPalette.subtitle,
                                    fontSize = subtitleSize,
                                    fontWeight = FontWeight.Medium,
                                    maxLines = 4,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }
                        headerAction?.invoke()
                    }
                    if (headerPills.isNotEmpty()) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            headerPills.forEach { pillText ->
                                OperatorHeaderPill(text = pillText)
                            }
                        }
                    }
                }
            } else {
                Row(
                    modifier = Modifier.padding(horizontal = horizontalPadding, vertical = verticalPadding),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        if (onBack != null) {
                            OperatorCircleIcon(
                                icon = Icons.AutoMirrored.Filled.ArrowBack,
                                backgroundColor = OperatorPalette.pill,
                                tint = OperatorPalette.title,
                                modifier = Modifier.clickable(onClick = onBack),
                            )
                        }
                        OperatorCircleIcon(
                            icon = icon,
                            painter = iconPainter,
                            backgroundColor = if (iconPainter != null) Color.Transparent else OperatorPalette.success,
                            tint = OperatorPalette.backgroundTop,
                            containerSize = if (iconPainter != null) 56.dp else 48.dp,
                            iconSize = if (iconPainter != null) 56.dp else 24.dp,
                        )
                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text(
                                text = title,
                                color = OperatorPalette.title,
                                fontSize = titleSize,
                                fontWeight = FontWeight.ExtraBold,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(
                                text = subtitle,
                                color = OperatorPalette.subtitle,
                                fontSize = subtitleSize,
                                fontWeight = FontWeight.Medium,
                                maxLines = 3,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                    if (headerPills.isNotEmpty()) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            headerPills.forEach { pillText ->
                                OperatorHeaderPill(text = pillText)
                            }
                        }
                    }
                    headerAction?.invoke()
                }
            }
        }
    }
}

@Composable
fun OperatorFooter(
    hint: String,
    sectionLabel: String,
    statusLabel: String,
    modifier: Modifier = Modifier,
) {
    BoxWithConstraints(modifier = modifier.fillMaxWidth()) {
        val compactLayout = maxWidth < 680.dp

        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            color = OperatorPalette.panelMuted,
            border = BorderStroke(1.5.dp, OperatorPalette.panelBorder),
            elevation = 0.dp,
        ) {
            if (compactLayout) {
                Column(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text(
                        text = hint,
                        color = OperatorPalette.subtitle,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OperatorHeaderPill(text = sectionLabel, accent = false)
                        OperatorHeaderPill(text = statusLabel, accent = true)
                    }
                }
            } else {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 18.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = hint,
                        modifier = Modifier.weight(1f),
                        color = OperatorPalette.subtitle,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OperatorHeaderPill(text = sectionLabel, accent = false)
                        OperatorHeaderPill(text = statusLabel, accent = true)
                    }
                }
            }
        }
    }
}

@Composable
fun OperatorPanel(
    modifier: Modifier = Modifier,
    backgroundColor: Color = OperatorPalette.panel,
    borderColor: Color = OperatorPalette.panelBorder,
    content: @Composable BoxScope.() -> Unit,
) {
    BoxWithConstraints(modifier = modifier) {
        val compactLayout = maxWidth < 420.dp
        val panelPadding = if (compactLayout) 14.dp else 20.dp
        val panelRadius = if (compactLayout) 20.dp else 24.dp

        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(panelRadius),
            color = backgroundColor,
            border = BorderStroke(1.5.dp, borderColor),
            elevation = 0.dp,
        ) {
            Box(
                modifier = Modifier.padding(panelPadding),
                content = content,
            )
        }
    }
}

@Composable
fun OperatorActionCard(
    title: String,
    description: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    emphasized: Boolean = false,
) {
    OperatorPanel(
        modifier = modifier.then(
            if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier
        ),
        backgroundColor = if (emphasized) Color(0xFF223553) else OperatorPalette.panel,
        borderColor = if (emphasized) OperatorPalette.accent else OperatorPalette.panelBorder,
    ) {
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            val compactLayout = maxWidth < 420.dp
            val stackedLayout = maxWidth < 380.dp
            val titleSize = if (compactLayout) 22.sp else 26.sp
            val bodySize = if (compactLayout) 15.sp else 16.sp
            val bodyLineHeight = if (compactLayout) 20.sp else 22.sp
            val iconContainer = if (compactLayout) 42.dp else 48.dp
            val iconSize = if (compactLayout) 20.dp else 24.dp

            if (stackedLayout) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OperatorCircleIcon(
                        icon = icon,
                        backgroundColor = if (emphasized) OperatorPalette.accent else OperatorPalette.pill,
                        tint = if (emphasized) OperatorPalette.accentText else OperatorPalette.accent,
                        containerSize = iconContainer,
                        iconSize = iconSize,
                    )
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = title,
                            color = OperatorPalette.title,
                            fontSize = titleSize,
                            fontWeight = FontWeight.Bold,
                            maxLines = 3,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            text = description,
                            color = OperatorPalette.subtitle,
                            fontSize = bodySize,
                            lineHeight = bodyLineHeight,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(if (compactLayout) 10.dp else 14.dp)) {
                    OperatorCircleIcon(
                        icon = icon,
                        backgroundColor = if (emphasized) OperatorPalette.accent else OperatorPalette.pill,
                        tint = if (emphasized) OperatorPalette.accentText else OperatorPalette.accent,
                        containerSize = iconContainer,
                        iconSize = iconSize,
                    )
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = title,
                            color = OperatorPalette.title,
                            fontSize = titleSize,
                            fontWeight = FontWeight.Bold,
                            maxLines = 3,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            text = description,
                            color = OperatorPalette.subtitle,
                            fontSize = bodySize,
                            lineHeight = bodyLineHeight,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun OperatorInfoCard(
    title: String,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    OperatorPanel(modifier = modifier) {
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            val compactLayout = maxWidth < 420.dp

            Column(verticalArrangement = Arrangement.spacedBy(if (compactLayout) 8.dp else 10.dp), content = {
                Text(
                    text = title,
                    color = OperatorPalette.title,
                    fontSize = if (compactLayout) 22.sp else 28.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                )
                content()
            })
        }
    }
}

@Composable
fun OperatorPrimaryButton(
    text: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Button(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .height(92.dp),
        shape = RoundedCornerShape(20.dp),
        colors = ButtonDefaults.buttonColors(
            backgroundColor = OperatorPalette.accent,
            contentColor = OperatorPalette.accentText,
        ),
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(imageVector = icon, contentDescription = null, modifier = Modifier.size(24.dp))
            Text(text = text, fontSize = 24.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun OperatorSecondaryButton(
    text: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Button(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .height(92.dp),
        shape = RoundedCornerShape(20.dp),
        colors = ButtonDefaults.buttonColors(
            backgroundColor = OperatorPalette.pill,
            contentColor = OperatorPalette.title,
        ),
        border = BorderStroke(1.5.dp, OperatorPalette.panelBorder),
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(imageVector = icon, contentDescription = null, modifier = Modifier.size(24.dp))
            Text(text = text, fontSize = 24.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun OperatorHeaderPill(
    text: String,
    accent: Boolean = false,
) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = OperatorPalette.pill,
        border = BorderStroke(1.5.dp, OperatorPalette.panelBorder),
        elevation = 0.dp,
    ) {
        Text(
            text = text,
            modifier = Modifier
                .wrapContentWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            color = if (accent) OperatorPalette.accent else OperatorPalette.title,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun OperatorCircleIcon(
    icon: ImageVector,
    painter: Painter? = null,
    backgroundColor: Color,
    tint: Color,
    modifier: Modifier = Modifier,
    containerSize: androidx.compose.ui.unit.Dp = 48.dp,
    iconSize: androidx.compose.ui.unit.Dp = 24.dp,
) {
    Box(
        modifier = modifier
            .size(containerSize)
            .background(backgroundColor, CircleShape)
            .border(1.dp, backgroundColor, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        if (painter != null) {
            Image(
                painter = painter,
                contentDescription = null,
                modifier = Modifier.size(iconSize),
            )
        } else {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = tint,
                modifier = Modifier.size(iconSize),
            )
        }
    }
}
