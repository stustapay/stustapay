package de.stustanet.stustapay.ui

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
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.material.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import de.stustanet.stustapay.barcode.ZXingQRCode
import androidx.camera.core.Preview as CameraPreview


@Preview
@Composable
fun QRScanView() {
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
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (code != null) {
            Text(
                code!!,
                fontSize = 14.sp,
            )
        }

        Row(
            horizontalArrangement = Arrangement.Start,
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

        if (hasCamPermission) {
            AndroidView(
                factory = { context ->
                    val previewView = PreviewView(context)
                    val preview = CameraPreview.Builder().build()
                    val selector = CameraSelector.Builder()
                        .requireLensFacing(CameraSelector.LENS_FACING_BACK).build()
                    preview.setSurfaceProvider(previewView.surfaceProvider)
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
                modifier = Modifier.border(
                    10.dp,
                    color = if (code != null) {
                        Color(0xFF4CAF50)
                    } else {
                        Color(0xFFF44336)
                    }
                )
            )

        } else {
            Text("no camera permission")
        }
    }
}
