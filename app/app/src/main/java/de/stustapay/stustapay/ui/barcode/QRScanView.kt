package de.stustapay.stustapay.ui.barcode

import android.Manifest
import android.content.pm.PackageManager
import android.util.Log
import android.util.Size
import android.view.View
import android.view.ViewGroup
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.LifecycleCameraController
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.min
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import de.stustapay.libssp.ui.common.DialogDisplayState
import de.stustapay.stustapay.barcode.ZXingQRCode
import de.stustapay.stustapay.barcode.ZXingQRCodeStatus
import de.stustapay.stustapay.ui.common.ConfirmCard
import androidx.camera.core.Preview as CameraPreview
import androidx.compose.ui.geometry.Size as geomSize

@Composable
fun CameraOverlay(
    modifier: Modifier,
    width: Dp,
    height: Dp,
    offsetY: Dp,
    color: Color
) {

    val offsetInPx: Float
    val widthInPx: Float
    val heightInPx: Float

    with(LocalDensity.current) {
        offsetInPx = offsetY.toPx()
        widthInPx = width.toPx()
        heightInPx = height.toPx()
    }

    Canvas(modifier = modifier) {

        val canvasWidth = size.width

        with(drawContext.canvas.nativeCanvas) {
            val checkPoint = saveLayer(null, null)

            // Darker Rest
            drawRect(Color(0x77000000))

            // Clear center
            drawRoundRect(
                topLeft = Offset(
                    x = (canvasWidth - widthInPx) / 2,
                    y = offsetInPx
                ),
                size = geomSize(widthInPx, heightInPx),
                cornerRadius = CornerRadius(30f, 30f),
                color = Color.Transparent,
                blendMode = BlendMode.Clear,
            )

            // Colored Border
            drawRoundRect(
                topLeft = Offset(
                    x = (canvasWidth - widthInPx) / 2,
                    y = offsetInPx
                ),
                size = geomSize(widthInPx, heightInPx),
                cornerRadius = CornerRadius(30f, 30f),
                color = color,
                style = Stroke(width = 4.dp.toPx())
            )
            restoreToCount(checkPoint)
        }

    }
}

@Preview
@Composable
fun QRScanView(
    modifier: Modifier = Modifier,
    viewModifier: Modifier = Modifier,
    cameraSelector: Int = CameraSelector.LENS_FACING_BACK,
    continuous: Boolean = false,
    onScan: (String) -> Unit = {},
    title: @Composable () -> Unit = {},
) {
    var code: String? by remember {
        mutableStateOf(null)
    }
    var status by remember {
        mutableStateOf("scanning...")
    }

    val context = LocalContext.current

    var hasCamPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        )
    }
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
        onResult = { granted ->
            hasCamPermission = granted
        }
    )

    LaunchedEffect(Unit) {
        launcher.launch(Manifest.permission.CAMERA)
    }

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        title()

        Row(
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier
                .padding(start = 10.dp, top = 8.dp, bottom = 20.dp)
        ) {
            Text(
                "status: ",
                fontSize = 16.sp
            )
            Text(
                status,
                fontSize = 16.sp,
            )
        }

        if (!hasCamPermission) {
            Text("no camera permission!")
            return
        }

        Box(
            modifier = viewModifier.sizeIn(minWidth = 400.dp, minHeight = 400.dp),
            contentAlignment = Alignment.Center,
        ) {
            val lifecycleOwner = LocalLifecycleOwner.current
            val cameraProviderFeature = remember {
                ProcessCameraProvider.getInstance(context)
            }

            val cameraController = remember {
                LifecycleCameraController(context).apply {
                    bindToLifecycle(lifecycleOwner)
                }
            }

            AndroidView(
                modifier = Modifier.matchParentSize(),
                factory = { context ->
                    val previewView = PreviewView(context)
                    previewView.apply {
                        controller = cameraController
                        clipToOutline = true  // lol https://android-review.googlesource.com/c/platform/frameworks/support/+/2302880
                        layoutParams = ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT,
                        )
                        scaleType = PreviewView.ScaleType.FIT_CENTER
                    }

                    val preview = CameraPreview.Builder().build()
                    preview.surfaceProvider = previewView.surfaceProvider

                    val directionSelector =
                        CameraSelector.Builder().requireLensFacing(cameraSelector).build()

                    val imageAnalysis =
                        ImageAnalysis.Builder()
                            .setBackpressureStrategy(STRATEGY_KEEP_ONLY_LATEST).build()

                    imageAnalysis.setAnalyzer(
                        ContextCompat.getMainExecutor(context),
                        ZXingQRCode(
                            scanned = { result ->
                                if (code == null || continuous) {
                                    code = result
                                    onScan(result)
                                }
                            },
                            status = { message ->

                                status = when (message) {
                                    is ZXingQRCodeStatus.Found -> "found"
                                    is ZXingQRCodeStatus.KeepScanning -> "keep scanning"
                                    is ZXingQRCodeStatus.Error -> "error"
                                }
                            },
                        )
                    )

                    runCatching {
                        cameraProviderFeature.get().bindToLifecycle(
                            lifecycleOwner, directionSelector, preview, imageAnalysis
                        )
                    }.onFailure {
                        Log.e("ssp.qrcode", "failed in qrcode scanning")
                        it.printStackTrace()
                    }

                    previewView
                },
                onRelease = {
                    cameraController.unbind()
                    cameraProviderFeature.get().unbindAll()
                }
            )

            CameraOverlay(
                modifier = Modifier.matchParentSize(),
                width = 300.dp,
                height = 300.dp,
                offsetY = 50.dp,
                color = if (code != null) {
                    MaterialTheme.colors.primary
                } else {
                    MaterialTheme.colors.error
                }
            )
        }
    }
}


@Composable
fun QRScanCard(
    state: DialogDisplayState,
    modifier: Modifier = Modifier,
    onScan: (String) -> Unit = {},
    title: @Composable () -> Unit = {},
) {
    ConfirmCard(
        modifier = modifier,
        showConfirmButton = false,
        onBack = {
            state.close()
        },
    ) {
        // TODO use camerax compose
        QRScanView(
            onScan = { qrcode ->
                onScan(qrcode)
                state.close()
            },
            title = title,
        )
    }
}


@Composable
fun QRScanDialog(
    state: DialogDisplayState,
    modifier: Modifier = Modifier,
    onScan: (String) -> Unit,
    title: @Composable () -> Unit = {},
) {
    if (state.isOpen()) {
        Dialog(
            onDismissRequest = {
                state.close()
            },
        ) {
            QRScanCard(
                modifier = modifier,
                state = state,
                onScan = onScan,
                title = title,
            )
        }
    }
}
