package de.stustanet.stustapay.barcode


import android.graphics.ImageFormat
import android.util.Log
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.zxing.*
import com.google.zxing.common.HybridBinarizer
import com.google.zxing.qrcode.QRCodeReader
import java.nio.ByteBuffer

class ZXingQRCode(
    private val scanned: (String) -> Unit,
    private val status: (String) -> Unit,
) : ImageAnalysis.Analyzer {

    private val supportedImageFormats = listOf(
        ImageFormat.YUV_420_888,
        ImageFormat.YUV_422_888,
        ImageFormat.YUV_444_888
    )

    override fun analyze(image: ImageProxy) {
        if (image.format !in supportedImageFormats) {
            status("image format unsupported")
            Log.e("qrcode", "unsupported analysis image format: ${image.format}")
            return
        }

        val bytes = image.planes.first().buffer.toByteArray()
        val source = PlanarYUVLuminanceSource(
            bytes, image.planes.first().rowStride, image.height,
            0, 0,
            image.width, image.height,
            false
        )
        val binaryBmp = BinaryBitmap(HybridBinarizer(source))

        try {
            val result = QRCodeReader().decode(binaryBmp)
            status("found")
            scanned(result.text)
        } catch (e: ReaderException) {
            when (e) {
                is NotFoundException -> {
                    status("no qrcode detected")
                }
                is ChecksumException -> {
                    status("checksum error")
                }
                else -> {
                    status("error: $e")
                    Log.e("qrscan", "failed to scan: $e")
                }
            }
        } finally {
            image.close()
        }
    }

    private fun ByteBuffer.toByteArray(): ByteArray {
        rewind()
        return ByteArray(remaining()).also {
            get(it)
        }
    }
}
