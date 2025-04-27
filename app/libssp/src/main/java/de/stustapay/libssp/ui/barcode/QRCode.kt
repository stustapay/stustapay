package de.stustapay.libssp.ui.barcode

import android.graphics.Bitmap
import android.graphics.Color
import androidx.compose.foundation.Image
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.asImageBitmap
import androidx.core.graphics.createBitmap
import androidx.core.graphics.set
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter

@Composable
fun QRCode(data: String = "https://www.youtube.com/watch?v=XfELJU1mRMg") {
    val hints = hashMapOf<EncodeHintType, Int>().also { it[EncodeHintType.MARGIN] = 1 }
    val qrCodeRaw = QRCodeWriter().encode(
        data, BarcodeFormat.QR_CODE, 512, 512, hints
    )
    val qrCodeBitmap = createBitmap(512, 512, Bitmap.Config.RGB_565).also {
        for (x in 0 until 512) {
            for (y in 0 until 512) {
                it[x, y] = if (qrCodeRaw[x, y]) Color.BLACK else Color.WHITE
            }
        }
    }
    Image(qrCodeBitmap.asImageBitmap(), "Bon QR Code")
}