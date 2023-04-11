package de.stustanet.stustapay.ui.barcode

import android.Manifest
import android.content.pm.PackageManager
import android.util.Log
import android.util.Size
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import de.stustanet.stustapay.barcode.ZXingQRCode
import androidx.camera.core.Preview as CameraPreview
import androidx.compose.ui.geometry.Size as geomSize
import de.stustanet.stustapay.ui.theme.Color as ThemeColor

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
fun QRScanView(onScanSuccess: (String) -> Unit = {}) {


    var code: String? by remember {
        mutableStateOf(null)
    }
    var status by remember {
        mutableStateOf("scanning...")
    }

    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val cameraProviderFeature = remember {
        ProcessCameraProvider.getInstance(context)
    }
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

    LaunchedEffect(key1 = true) {
        launcher.launch(Manifest.permission.CAMERA)
    }

    Column(
        modifier = Modifier,
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            if (code != null) code!! else "",
            fontSize = 14.sp,
        )

        Row(
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier
                .padding(start = 10.dp, top = 8.dp, bottom = 20.dp)
                .fillMaxWidth()
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

        Box(contentAlignment = Alignment.Center) {
            if (hasCamPermission) {
                AndroidView(
                    factory = { context ->
                        val previewView = PreviewView(context)
                        val preview = CameraPreview.Builder().build()
                        val selector = CameraSelector.Builder()
                            .requireLensFacing(CameraSelector.LENS_FACING_BACK).build()
                        preview.setSurfaceProvider(previewView.surfaceProvider)
                        previewView.scaleType = PreviewView.ScaleType.FIT_CENTER
                        val imageAnalysis = ImageAnalysis.Builder().setTargetResolution(
                            Size(
                                previewView.width, previewView.height
                            )
                        ).setBackpressureStrategy(STRATEGY_KEEP_ONLY_LATEST).build()
                        imageAnalysis.setAnalyzer(
                            ContextCompat.getMainExecutor(context),
                            ZXingQRCode(
                                scanned = { result ->
                                    code = result
                                    onScanSuccess(result)
                                },
                                status = { message ->
                                    status = message
                                },
                            )
                        )
                        try {
                            cameraProviderFeature.get().bindToLifecycle(
                                lifecycleOwner, selector, preview, imageAnalysis
                            )
                        } catch (e: Exception) {
                            Log.e("qrcode", "failed in qrcode scanning")
                            e.printStackTrace()
                        }
                        previewView
                    },
                    modifier = Modifier.fillMaxHeight()
                )

            } else {
                Text("no camera permission")
            }

            CameraOverlay(
                modifier = Modifier.fillMaxSize(),
                width = 300.dp,
                height = 300.dp,
                offsetY = 200.dp,
                color = if (code != null) {
                    ThemeColor.Ok
                } else {
                    ThemeColor.Error
                }
            )
        }
    }
}