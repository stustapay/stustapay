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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Card
import androidx.compose.material.Icon
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.material.icons.filled.TouchApp
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Enhanced Account Scan Content with better visual cues for users
 */
@Composable
fun EnhancedAccountScanContent(
    isIminFalcons2: Boolean,
    isSmallScreen: Boolean = false,
    scanStatus: String
) {
    // Pulsing animation for the NFC icon
    val infiniteTransition = rememberInfiniteTransition()
    val pulseAnimation by infiniteTransition.animateFloat(
        initialValue = 0.8f,
        targetValue = 1.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(800),
            repeatMode = RepeatMode.Reverse
        )
    )
    
    // Create an animated alpha for the arrows to create a "flowing" effect
    val arrowsAlpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000),
            repeatMode = RepeatMode.Reverse
        )
    )
    
    // Adjust sizes based on screen size
    val headerFontSize = if (isSmallScreen) 16.sp else 24.sp
    val subtitleFontSize = if (isSmallScreen) 14.sp else 18.sp
    val accountIconSize = if (isSmallScreen) 70.dp else 100.dp
    val iconSize = if (isSmallScreen) 50.dp else 80.dp
    val touchIconSize = if (isSmallScreen) 24.dp else 40.dp
    val arrowIconSize = if (isSmallScreen) 16.dp else 24.dp
    val infoIconSize = if (isSmallScreen) 18.dp else 24.dp
    val chipBoxWidth = if (isSmallScreen) 80.dp else 120.dp
    val chipBoxHeight = if (isSmallScreen) 40.dp else 60.dp
    val statusFontSize = if (isSmallScreen) 12.sp else 16.sp
    val cardPadding = if (isSmallScreen) 4.dp else 16.dp
    val contentPadding = if (isSmallScreen) 4.dp else 16.dp
    val spacerHeight = if (isSmallScreen) 4.dp else 16.dp
    
    Card(
        modifier = Modifier
            .padding(if (isSmallScreen) 2.dp else 8.dp)
            .fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = 4.dp
    ) {
        Column(
            modifier = Modifier
                .padding(cardPadding),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Header text - different for Falcon 2
            Text(
                text = if (isIminFalcons2) "Chip hier vorhalten" else "Scan a Chip",
                fontWeight = FontWeight.Bold,
                fontSize = headerFontSize,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = if (isSmallScreen) 4.dp else 16.dp)
            )
            
            Text(
                text = "Kontostand anzeigen",
                fontSize = subtitleFontSize,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = if (isSmallScreen) 4.dp else 16.dp)
            )
            
            // Main visual container
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(contentPadding),
                contentAlignment = Alignment.Center
            ) {
                // Account icon in the background
                Icon(
                    imageVector = Icons.Filled.AccountBalance,
                    contentDescription = "Account",
                    modifier = Modifier
                        .size(accountIconSize)
                        .alpha(0.1f),
                    tint = MaterialTheme.colors.primary
                )
                
                // NFC Icon with pulse animation
                Icon(
                    imageVector = Icons.Filled.NearMe,
                    contentDescription = "NFC",
                    modifier = Modifier
                        .size(iconSize)
                        .scale(pulseAnimation)
                        .alpha(0.9f),
                    tint = MaterialTheme.colors.primary
                )
                
                // Touch icon to indicate user action
                Icon(
                    imageVector = Icons.Filled.TouchApp,
                    contentDescription = "Touch",
                    modifier = Modifier
                        .align(
                            if (isIminFalcons2) Alignment.CenterStart else Alignment.Center
                        )
                        .padding(start = if (isIminFalcons2) 8.dp else 0.dp)
                        .size(touchIconSize),
                    tint = MaterialTheme.colors.secondary
                )
                
                // Info icon
                Icon(
                    imageVector = Icons.Filled.Info,
                    contentDescription = "Info",
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(if (isSmallScreen) 4.dp else 8.dp)
                        .size(infoIconSize),
                    tint = MaterialTheme.colors.primary
                )
                
                // Directional arrows for Falcon 2 devices (pointing left)
                if (isIminFalcons2) {
                    Row(
                        modifier = Modifier
                            .align(Alignment.CenterStart)
                            .alpha(arrowsAlpha),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Multiple arrows pointing left
                        repeat(3) { index ->
                            Icon(
                                imageVector = Icons.Filled.ArrowForward,
                                contentDescription = "Arrow",
                                modifier = Modifier
                                    .size(arrowIconSize)
                                    .rotate(180f) // Rotate to point left
                                    .alpha(1f - (index * 0.2f)), // Fade out as they go further
                                tint = MaterialTheme.colors.secondary
                            )
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(spacerHeight))
            
            // Visual chip indicator - simplified on small screens
            if (!isSmallScreen) {
                Box(
                    modifier = Modifier
                        .size(width = chipBoxWidth, height = chipBoxHeight)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFFEEEEEE))
                        .border(
                            width = 2.dp,
                            color = MaterialTheme.colors.primary,
                            shape = RoundedCornerShape(8.dp)
                        )
                        .padding(8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "NFC Chip",
                        fontSize = if (isSmallScreen) 12.sp else 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.DarkGray
                    )
                }
                
                Spacer(modifier = Modifier.height(spacerHeight))
            }
            
            // Status text
            Text(
                text = scanStatus,
                fontSize = statusFontSize,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = if (isSmallScreen) 2.dp else 8.dp)
            )
        }
    }
} 