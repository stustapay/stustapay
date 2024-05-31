package de.stustapay.stustapay.ui.root

import android.util.Log
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle


@Composable
fun RootWrapper(
    viewModel: RootWrapperViewModel = hiltViewModel(), content: @Composable () -> Unit
) {
    val borderState by viewModel.borderState.collectAsStateWithLifecycle()
    val infallibleVisible by viewModel.infallibleVisible.collectAsStateWithLifecycle()

    when (val border = borderState) {
        is BorderState.NoBorder -> {
            RootWrapperContent(infallibleVisible, content)
        }

        is BorderState.Border -> {
            val borderSize = 4.dp
            Box(
                modifier = Modifier
                    .border(BorderStroke(borderSize, MaterialTheme.colors.error))
                    .padding(borderSize)
            ) {
                Column {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colors.error)
                    ) {
                        Text(
                            border.msg,
                            style = MaterialTheme.typography.h6,
                            modifier = Modifier.fillMaxWidth(),
                            textAlign = TextAlign.Center,
                            color = MaterialTheme.colors.onError,
                        )
                    }

                    RootWrapperContent(infallibleVisible, content)
                }
            }
        }
    }
}


@Composable
fun RootWrapperContent(infallibleVisible: Boolean, content: @Composable () -> Unit) {
    if (infallibleVisible) {
        Log.e("render", "render infallible")
        InfallibleError()
    } else {
        Log.e("render", "render content")
        content()
    }
}
