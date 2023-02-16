package de.stustanet.stustapay.nfc

import android.app.Activity
import android.app.PendingIntent
import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Build
import android.widget.Toast
import de.stustanet.stustapay.data.NfcState
import kotlinx.coroutines.flow.update

class NfcHandler(private var activity: Activity, private var nfcState: NfcState) {
    private var intent: PendingIntent? = null
    private var device: NfcAdapter? = null
    fun onCreate() {
        // prepare nfc intent delivery
        device = NfcAdapter.getDefaultAdapter(activity)
        if (device != null) {
            val topIntent = Intent(activity, activity.javaClass).apply {
                addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }

            // intents are mutable by default up until SDK version R, so FLAG_MUTABLE is only
            // necessary starting with SDK version S
            val intentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                PendingIntent.FLAG_MUTABLE
            } else {
                0
            }

            intent = PendingIntent.getActivity(activity, 0, topIntent, intentFlags)
        }
    }

    fun onPause() {
        device?.disableForegroundDispatch(activity)
    }

    fun onResume() {
        // collect all nfc events through intents
        device?.enableForegroundDispatch(activity, intent, null, null)
    }

    fun handleTag(action: String, tag: Tag) {
        // https://developer.android.com/guide/topics/connectivity/nfc/advanced-nfc#tech-intent

        if (nfcState.scanRequest.value) {
            Toast.makeText(activity, "NFC tag read", Toast.LENGTH_LONG).show()

            if (!tag.techList.contains("android.nfc.tech.NfcA")) {
                Toast.makeText(activity, "Incompatible NFC tag", Toast.LENGTH_LONG).show()
                return
            }

            val mftag = get(tag)
            val key = ByteArray(16) { i -> i.toByte() }

            try {
                mftag.connect()
                while (!mftag.isConnected) {}

                mftag.authenticate(key)

                nfcState.uid.update { mftag.readSerialNumber() }

                mftag.close()
            } catch (e: Exception) {
                println(e)
                Toast.makeText(activity, "Communication failed", Toast.LENGTH_LONG).show()
            }
        }
    }
}
