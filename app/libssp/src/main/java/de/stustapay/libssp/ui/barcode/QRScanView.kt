package de.stustapay.libssp.ui.barcode

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import android.view.ViewGroup
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.LifecycleCameraController
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.material.Icon
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.rscja.barcode.BarcodeFactory
import com.rscja.barcode.BarcodeUtility
import de.stustapay.libssp.barcode.ZXingQRCode
import de.stustapay.libssp.barcode.ZXingQRCodeStatus
import de.stustapay.libssp.ui.common.ConfirmCard
import de.stustapay.libssp.ui.common.DialogDisplayState
import androidx.camera.core.Preview as CameraPreview
import androidx.compose.ui.geometry.Size as geomSize

@Composable
fun CameraOverlay(
    modifier: Modifier, width: Dp, height: Dp, offsetY: Dp, color: Color
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
                    x = (canvasWidth - widthInPx) / 2, y = offsetInPx
                ),
                size = geomSize(widthInPx, heightInPx),
                cornerRadius = CornerRadius(30f, 30f),
                color = Color.Transparent,
                blendMode = BlendMode.Clear,
            )

            // Colored Border
            drawRoundRect(
                topLeft = Offset(
                    x = (canvasWidth - widthInPx) / 2, y = offsetInPx
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
        contract = ActivityResultContracts.RequestPermission(), onResult = { granted ->
            hasCamPermission = granted
        })

    val hasScanner = Build.MODEL == "C66"

    Log.i(
        "barcode", "Starting QR code scan with ${
            if (hasScanner) {
                "laser scanner"
            } else {
                "camera"
            }
        } on device ${Build.MODEL}"
    )

    LaunchedEffect(Unit) {
        if (!hasScanner) {
            launcher.launch(Manifest.permission.CAMERA)
        }
    }

    LaunchedEffect(Unit) {
        if (hasScanner) {
            Log.i("barcode", "open")
            BarcodeFactory.getInstance().barcodeDecoder.close()
            BarcodeFactory.getInstance().barcodeDecoder.open(context)
            BarcodeFactory.getInstance().barcodeDecoder.stopScan()
            BarcodeFactory.getInstance().barcodeDecoder.setDecodeCallback {
                if (it.resultCode == 1 && it.barcodeSymbology == 25) {
                    Log.i("barcode", "closed")
                    BarcodeFactory.getInstance().barcodeDecoder.close()
                    onScan(it.barcodeData)
                } else {
                    Log.w(
                        "barcode",
                        "error (${it.resultCode}, ${it.barcodeSymbology}): ${it.barcodeData}"
                    )
                    BarcodeFactory.getInstance().barcodeDecoder.startScan()
                }
            }
            BarcodeFactory.getInstance().barcodeDecoder.setTimeOut(5)
            BarcodeUtility.getInstance().enableVibrate(context, true)
            BarcodeFactory.getInstance().barcodeDecoder.startScan()
        }
    }

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        title()

        Row(
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier.padding(start = 10.dp, top = 8.dp, bottom = 20.dp)
        ) {
            Text(
                "status: ", fontSize = 16.sp
            )
            Text(
                status,
                fontSize = 16.sp,
            )
        }

        if (hasScanner) {
            Box(
                modifier = viewModifier.sizeIn(minWidth = 400.dp, minHeight = 200.dp),
                contentAlignment = Alignment.Center,
            ) {
                Column {
                    Icon(
                        imageVector = Icons.Filled.QrCodeScanner,
                        modifier = Modifier
                            .size(size = 80.dp),
                        contentDescription = null,
                        tint = MaterialTheme.colors.onSurface
                    )
                    Icon(
                        imageVector = Icons.Filled.ArrowUpward,
                        modifier = Modifier
                            .size(size = 80.dp),
                        contentDescription = null,
                        tint = MaterialTheme.colors.onSurface
                    )
                }

            }
        } else {
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

                AndroidView(modifier = Modifier.matchParentSize(), factory = { context ->
                    val previewView = PreviewView(context)
                    previewView.apply {
                        controller = cameraController
                        clipToOutline =
                            true  // lol https://android-review.googlesource.com/c/platform/frameworks/support/+/2302880
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
                        ImageAnalysis.Builder().setBackpressureStrategy(STRATEGY_KEEP_ONLY_LATEST)
                            .build()

                    imageAnalysis.setAnalyzer(
                        ContextCompat.getMainExecutor(context), ZXingQRCode(
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
                }, onRelease = {
                    cameraController.unbind()
                    cameraProviderFeature.get().unbindAll()
                })

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
            BarcodeFactory.getInstance().barcodeDecoder.stopScan()
            BarcodeFactory.getInstance().barcodeDecoder.close()
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
                BarcodeFactory.getInstance().barcodeDecoder.stopScan()
                BarcodeFactory.getInstance().barcodeDecoder.close()
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
