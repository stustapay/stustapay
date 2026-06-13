package de.stustapay.libssp.nfc

import android.app.Activity
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.TagLostException
import android.nfc.tech.TagTechnology
import android.os.Bundle
import android.util.Log
import com.ionspin.kotlin.bignum.integer.toBigInteger
import de.stustapay.libssp.model.NfcScanFailure
import de.stustapay.libssp.model.NfcScanRequest
import de.stustapay.libssp.model.NfcScanResult
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.util.asBitVector
import java.io.IOException
import java.nio.charset.Charset
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NfcHandler @Inject constructor(
    private val dataSource: NfcDataSource
) {
    private data class ReaderConfig(
        val presenceCheckDelayMs: Int = 750,
        val maxReadAttempts: Int = 4
    )

    private val readerConfig = ReaderConfig()
    private lateinit var device: NfcAdapter
    private lateinit var uidMap: Map<ULong, String>

    fun onCreate(activity: Activity, uid_map: Map<ULong, String>) {
        device = NfcAdapter.getDefaultAdapter(activity)
        uidMap = uid_map
    }

    fun onPause(activity: Activity) {
        device.disableReaderMode(activity)
    }

    fun onResume(activity: Activity) {
        device.enableReaderMode(
            activity,
            { tag -> handleTag(tag) },
            NfcAdapter.FLAG_READER_NFC_A or
                NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS or
                NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
            Bundle().apply {
                putInt(NfcAdapter.EXTRA_READER_PRESENCE_CHECK_DELAY, readerConfig.presenceCheckDelayMs)
            }
        )
    }

    private fun handleTag(tag: Tag) {
        Log.d("NfcHandler", "Tag technologies: ${tag.techList.joinToString()}")
        val req = dataSource.getScanRequest() ?: return

        if (!tag.techList.contains(NFC_A_TECH)) {
            dataSource.setScanResult(
                NfcScanResult.Fail(NfcScanFailure.Incompatible("Device has no NfcA support"))
            )
            return
        }

        val result = when (req) {
            is NfcScanRequest.FastRead -> fastReadResultForTechList(tag.techList, tag.id)
            else -> handleMfUlAesTag(tag, req)
        }

        dataSource.setScanResult(result)
    }

    private fun handleMfUlAesTag(rawTag: Tag, req: NfcScanRequest): NfcScanResult {
        val retryable = req is NfcScanRequest.FastRead || req is NfcScanRequest.Read || req is NfcScanRequest.Test
        val maxAttempts = if (retryable) readerConfig.maxReadAttempts else 1

        repeat(maxAttempts) { attempt ->
            val tag = MifareUltralightAES(rawTag)
            try {
                return when (req) {
                    is NfcScanRequest.FastRead -> {
                        fastReadResultForTechList(rawTag.techList, rawTag.id)
                    }

                    is NfcScanRequest.Read -> {
                        tag.connect()
                        NfcScanResult.Read(tag.fastRead(req.uidRetrKey, req.dataProtKey))
                    }

                    is NfcScanRequest.Write -> {
                        val dataProtKey = req.dataProtKey ?: return NfcScanResult.Fail(NfcScanFailure.NoKey)
                        tag.connect()
                        tag.authenticate(dataProtKey, MifareUltralightAES.KeyType.DATA_PROT_KEY, true)
                        tag.setCMAC(true)
                        tag.setAuth0(0x10u)
                        tag.writeUserMemory("StuStaPay at StuStaCulum 2024\n".toByteArray(Charset.forName("UTF-8")).asBitVector())
                        tag.writePin("WWWWWWWWWWWW")
                        tag.writeDataProtKey(dataProtKey)
                        tag.writeUidRetrKey(req.uidRetrKey)
                        NfcScanResult.Write
                    }

                    is NfcScanRequest.Rewrite -> {
                        tag.connect()
                        tag.authenticate(req.dataProtKey, MifareUltralightAES.KeyType.DATA_PROT_KEY, true)
                        val serial = tag.readSerialNumber()
                        val mappedUid = uidMap[serial] ?: return NfcScanResult.Fail(NfcScanFailure.Other("uid not found"))
                        tag.setCMAC(true)
                        tag.writeDataProtKey(req.dataProtKey)
                        tag.writeUidRetrKey(req.uidRetrKey)
                        tag.writePin(mappedUid + "\u0000\u0000\u0000\u0000")
                        NfcScanResult.Write
                    }

                    is NfcScanRequest.Test -> NfcScanResult.Test(tag.test(req.dataProtKey, req.uidRetrKey))
                }
            } catch (e: Throwable) {
                val failure = classifyNfcFailure(e)
                if (!retryable || failure !is NfcScanFailure.Lost || attempt == maxAttempts - 1) {
                    return NfcScanResult.Fail(failure)
                }
                Log.w("NfcHandler", "Retrying NFC read after transient failure on attempt ${attempt + 1}", e)
            } finally {
                safeClose(tag)
            }
        }

        return NfcScanResult.Fail(NfcScanFailure.Lost("Tag moved during scan"))
    }

    private fun safeClose(tag: TagTechnology?) {
        try {
            tag?.close()
        } catch (_: IOException) {
        }
    }

    private companion object {
        const val NFC_A_TECH = "android.nfc.tech.NfcA"
    }
}

internal fun fastReadResult(tagId: ByteArray?): NfcScanResult {
    val id = bytesToHex(tagId)
    if (id.isEmpty()) {
        return NfcScanResult.Fail(NfcScanFailure.Lost("Tag UID missing"))
    }

    val uidBigInt = id.toULong(16).toBigInteger()
    val nfcTag = NfcTag(uid = uidBigInt, pin = id)
    return NfcScanResult.FastRead(nfcTag)
}

internal fun fastReadResultForTechList(techList: Array<String>, tagId: ByteArray?): NfcScanResult {
    if (!techList.contains("android.nfc.tech.NfcA")) {
        return NfcScanResult.Fail(NfcScanFailure.Incompatible("Device has no NfcA support"))
    }

    return fastReadResult(tagId)
}

fun classifyNfcFailure(error: Throwable): NfcScanFailure {
    error.findCause<TagIncompatibleException>()?.let {
        return NfcScanFailure.Incompatible(it.message ?: "Tag not supported")
    }
    error.findCause<TagAuthException>()?.let {
        return NfcScanFailure.Auth(it.message ?: "Authentication failed")
    }
    error.findCause<SecurityException>()?.let {
        return NfcScanFailure.Auth(it.message ?: "Authentication failed")
    }
    error.findCause<TagLostException>()?.let {
        return NfcScanFailure.Lost(it.message ?: "Tag moved during scan")
    }
    error.findCause<TagTransientException>()?.let {
        return NfcScanFailure.Lost(it.message ?: "Tag moved during scan")
    }
    error.findCause<TagConnectionException>()?.let {
        return NfcScanFailure.Lost(it.message ?: "Tag connection lost")
    }
    error.findCause<IOException>()?.let {
        return NfcScanFailure.Lost(it.message ?: "Tag connection interrupted")
    }
    return NfcScanFailure.Other(error.message ?: "Unknown NFC error")
}

private inline fun <reified T : Throwable> Throwable.findCause(): T? {
    var current: Throwable? = this
    while (current != null) {
        if (current is T) {
            return current
        }
        current = current.cause
    }
    return null
}

private fun bytesToHex(bytes: ByteArray?): String {
    if (bytes == null) return ""
    val result = StringBuffer()
    for (b in bytes) {
        result.append(((b.toInt() and 0xff) + 0x100).toString(16).substring(1))
    }
    return result.toString()
}
