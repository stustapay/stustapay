package de.stustanet.stustapay.nfc

import android.app.Activity
import android.app.PendingIntent
import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Build
import de.stustanet.stustapay.util.asBitVector
import de.stustanet.stustapay.util.bv
import kotlinx.coroutines.flow.first
import java.nio.charset.Charset
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NfcHandler @Inject constructor(
    private val dataSource: NfcDataSource
) {
    private lateinit var intent: PendingIntent
    private lateinit var device: NfcAdapter

    fun onCreate(activity: Activity) {
        device = NfcAdapter.getDefaultAdapter(activity)
        val topIntent = Intent(activity, activity.javaClass).apply {
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }

        val intentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_MUTABLE
        } else {
            0
        }

        intent = PendingIntent.getActivity(activity, 0, topIntent, intentFlags)
    }

    fun onPause(activity: Activity) {
        device.disableForegroundDispatch(activity)
    }

    fun onResume(activity: Activity) {
        device.enableForegroundDispatch(activity, intent, null, null)
    }

    fun handleTag(tag: Tag) {
        if (dataSource.isDebugCard()) {
            dataSource.emitScanRead(true, true, true, 1uL, "debug")
            return
        }

        try {
            if (!tag.techList.contains("android.nfc.tech.NfcA")) {
                dataSource.emitScanFailure()
                return
            }

            val mfulaesTag = get(tag)
            mfulaesTag.connect()
            while (!mfulaesTag.isConnected) {}

            doScan(mfulaesTag)

            mfulaesTag.close()
        } catch (e: Exception) {
            dataSource.emitScanFailure()
        }
    }

    private fun doScan(tag: MifareUltralightAES) {
        try {
            if (dataSource.isAuth()) {
                tag.authenticate(
                    dataSource.getAuthKey(),
                    MifareUltralightAES.KeyType.DATA_PROT_KEY,
                    dataSource.isCmac()
                )
            }
        } catch (e: Exception) {
            dataSource.emitScanFailure()
            return
        }

        if (dataSource.isWriteSigRequest() != null) {
            var data = "StuStaPay - built by SSN & friends!\nglhf ;)\n".toByteArray(Charset.forName("UTF-8")).asBitVector()
            for (i in 0u until 4u) { data += 0.bv }
            for (i in 48u until 56u) { data += i.bv }
            tag.writeUserMemory(data)
            dataSource.emitScanWrite()
            return
        }

        if (dataSource.isWriteKeyRequest() != null) {
            tag.writeDataProtKey(dataSource.getAuthKey())
            dataSource.emitScanWrite()
            return
        }

        val protectRequest = dataSource.isWriteProtectRequest()
        if (protectRequest != null) {
            if (protectRequest) {
                tag.setAuth0(0x10u)
            } else {
                tag.setAuth0(0x3cu)
            }
            dataSource.emitScanWrite()
            return
        }

        val cmacRequest = dataSource.isWriteCmacRequest()
        if (cmacRequest != null) {
            tag.setCMAC(cmacRequest)
            dataSource.emitScanWrite()
            return
        }

        if (dataSource.isReadRequest() != null) {
            val chipProtected = tag.isProtected()
            val chipUid = tag.readSerialNumber()
            val chipContent = tag.readUserMemory().asByteArray().decodeToString()
            dataSource.emitScanRead(true, true, chipProtected, chipUid, chipContent)
            return
        }
    }
}
