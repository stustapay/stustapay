package de.stustapay.stustapay.ui.guide

import androidx.activity.compose.BackHandler
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.Button
import androidx.compose.material.IconButton
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.compose.PlayerSurface
import androidx.media3.ui.compose.SURFACE_TYPE_SURFACE_VIEW
import androidx.media3.ui.compose.modifiers.resizeWithContentScale
import androidx.media3.ui.compose.state.rememberPlayPauseButtonState
import androidx.media3.ui.compose.state.rememberPresentationState
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.KeepScreenOn
import de.stustapay.stustapay.ui.nav.NavScaffold
import kotlinx.coroutines.delay

@OptIn(UnstableApi::class)
@Preview
@Composable
fun GuideView(
    leaveView: () -> Unit = {}
) {
    val context = LocalContext.current;
    var player by remember { mutableStateOf<Player?>(null) }
    var state by remember { mutableStateOf<GuideViewState>(GuideViewState.Selection) }
    val exit: () -> Unit = {
        player?.apply { release() }
        player = null
        state = GuideViewState.Selection
        leaveView()
    }

    BackHandler {
        exit()
    }

    LaunchedEffect(Unit) {
        state = GuideViewState.Selection
    }

    NavScaffold(
        title = { Text(stringResource(R.string.guid_title)) }, navigateBack = exit
    ) {
        Box(
            Modifier
                .padding(it)
                .fillMaxSize()
        ) {
            when (state) {
                is GuideViewState.Playing -> {
                    LaunchedEffect(Unit) {
                        player = ExoPlayer.Builder(context).build().apply {
                            val uri = when ((state as GuideViewState.Playing).lang) {
                                "de" -> "https://ssp.stusta.de/apps/guide_de.mp4"
                                "en" -> "https://ssp.stusta.de/apps/guide_en.mp4"
                                else -> "https://ssp.stusta.de/apps/guide_en.mp4"
                            }
                            setMediaItem(MediaItem.fromUri(uri)) // TODO: get url from config
                            prepare()
                        }
                    }

                    player?.let {
                        val player = player!!
                        val presentationState = rememberPresentationState(player)
                        val scaledModifier = Modifier.resizeWithContentScale(
                            ContentScale.Fit, presentationState.videoSizeDp
                        )
                        var showControls by remember { mutableStateOf(true) }
                        val state = rememberPlayPauseButtonState(player)
                        val icon =
                            if (state.showPlay) Icons.Default.PlayArrow else Icons.Default.Pause

                        LaunchedEffect(Unit) {
                            player.play()
                            delay(1000)
                            showControls = false
                        }

                        Box(Modifier.fillMaxSize()) {
                            KeepScreenOn()
                            PlayerSurface(
                                player = player,
                                surfaceType = SURFACE_TYPE_SURFACE_VIEW,
                                modifier = scaledModifier.clickable(
                                    interactionSource = remember { MutableInteractionSource() },
                                    indication = null
                                ) {
                                    showControls = !showControls
                                },
                            )

                            if (presentationState.coverSurface) {
                                Box(
                                    Modifier
                                        .matchParentSize()
                                        .background(Color.Black)
                                )
                            }

                            LaunchedEffect(showControls, player.isPlaying) {
                                if (showControls && player.isPlaying) {
                                    delay(1000)
                                    showControls = false
                                }
                            }

                            if (showControls) {
                                Row(
                                    modifier = Modifier
                                        .align(Alignment.Center)
                                        .fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceEvenly,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    IconButton(
                                        onClick = state::onClick,
                                        modifier = Modifier
                                            .size(80.dp)
                                            .background(Color.Gray.copy(alpha = 0.2f), CircleShape),
                                        enabled = state.isEnabled
                                    ) {
                                        Icon(
                                            icon,
                                            contentDescription = "",
                                            modifier = Modifier
                                                .size(80.dp)
                                                .background(
                                                    Color.Gray.copy(alpha = 0.2f), CircleShape
                                                )
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                GuideViewState.Selection -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(10.dp)
                    ) {
                        Button(modifier = Modifier.fillMaxWidth(), onClick = {
                            state = GuideViewState.Playing("de")
                        }) {
                            Text("Deutsch")
                        }

                        Button(modifier = Modifier.fillMaxWidth(), onClick = {
                            state = GuideViewState.Playing("en")
                        }) {
                            Text("English")
                        }
                    }
                }
            }
        }
    }
}

sealed interface GuideViewState {
    data object Selection : GuideViewState
    data class Playing(val lang: String) : GuideViewState
}
