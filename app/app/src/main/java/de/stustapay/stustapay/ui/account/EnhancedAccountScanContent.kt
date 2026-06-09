package de.stustapay.stustapay.ui.account

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Card
import androidx.compose.material.Icon
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.material.icons.filled.TouchApp
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePalette

@Composable
fun EnhancedAccountScanContent(
    isIminFalcons2: Boolean,
    isSmallScreen: Boolean = false,
    isSelfService: Boolean = false,
    scanStatus: String
) {
    val infiniteTransition = rememberInfiniteTransition()
    val pulseAnimation by infiniteTransition.animateFloat(
        initialValue = 0.94f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(850),
            repeatMode = RepeatMode.Reverse
        )
    )

    if (isSelfService) {
        SelfServiceScanContent(
            isSmallScreen = isSmallScreen,
            pulseAnimation = pulseAnimation,
            scanStatus = scanStatus
        )
        return
    }

    val iconSize = if (isSmallScreen) 52.dp else 78.dp
    Card(
        modifier = Modifier
            .padding(if (isSmallScreen) 4.dp else 10.dp)
            .fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = 4.dp
    ) {
        Column(
            modifier = Modifier.padding(if (isSmallScreen) 10.dp else 18.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = if (isIminFalcons2) {
                    stringResource(R.string.selfservice_scan_balance_title_compact)
                } else {
                    stringResource(R.string.nfc_scan_prompt)
                },
                fontWeight = FontWeight.Bold,
                fontSize = if (isSmallScreen) 18.sp else 26.sp,
                textAlign = TextAlign.Center
            )
            Icon(
                imageVector = Icons.Filled.NearMe,
                contentDescription = null,
                modifier = Modifier
                    .size(iconSize)
                    .scale(pulseAnimation),
                tint = MaterialTheme.colors.primary
            )
            Text(
                text = scanStatus,
                fontSize = if (isSmallScreen) 12.sp else 16.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.alpha(0.75f)
            )
        }
    }
}

@Composable
private fun SelfServiceScanContent(
    isSmallScreen: Boolean,
    pulseAnimation: Float,
    scanStatus: String,
) {
    val titleSize = if (isSmallScreen) 28.sp else 40.sp
    val subtitleSize = if (isSmallScreen) 14.sp else 20.sp
    val panelPadding = if (isSmallScreen) 10.dp else 16.dp

    Card(
        modifier = Modifier
            .padding(if (isSmallScreen) 4.dp else 8.dp)
            .fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        elevation = 0.dp,
        backgroundColor = SelfServicePalette.panel,
    ) {
        Column(
            modifier = Modifier
                .border(1.5.dp, SelfServicePalette.panelBorder, RoundedCornerShape(16.dp))
                .padding(panelPadding),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = stringResource(R.string.selfservice_scan_balance_title),
                color = SelfServicePalette.title,
                fontWeight = FontWeight.ExtraBold,
                fontSize = titleSize,
                textAlign = TextAlign.Center
            )
            Text(
                text = stringResource(R.string.selfservice_scan_balance_subtitle),
                color = SelfServicePalette.subtitle,
                fontSize = subtitleSize,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(6.dp))

            Box(
                modifier = Modifier
                    .size(if (isSmallScreen) 120.dp else 170.dp)
                    .background(SelfServicePalette.scanOuter, CircleShape)
                    .padding(if (isSmallScreen) 22.dp else 28.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SelfServicePalette.scanInner, CircleShape)
                        .padding(if (isSmallScreen) 20.dp else 24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(SelfServicePalette.accent, CircleShape)
                            .scale(pulseAnimation),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Filled.NearMe,
                            contentDescription = null,
                            tint = SelfServicePalette.accentText,
                            modifier = Modifier.size(if (isSmallScreen) 20.dp else 30.dp)
                        )
                    }
                }
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.TouchApp,
                    contentDescription = null,
                    tint = SelfServicePalette.subtitle,
                    modifier = Modifier.size(if (isSmallScreen) 16.dp else 20.dp)
                )
                Text(
                    text = scanStatus,
                    color = SelfServicePalette.subtitle,
                    fontSize = if (isSmallScreen) 12.sp else 15.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}
