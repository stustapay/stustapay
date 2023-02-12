package de.stustanet.stustapay.nfc

import android.app.Activity
import android.app.PendingIntent
import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.widget.Toast
import de.stustanet.stustapay.nfc.get
import java.io.IOException

class NFCHandler(activity: Activity) {
    var intent: PendingIntent? = null
    var device: NfcAdapter? = null
    private var activity: Activity = activity
    var context: NFCContext = NFCContext()

    fun onCreate() {
        // prepare nfc intent delivery
        device = NfcAdapter.getDefaultAdapter(activity)
        if (device != null) {
            val topIntent = Intent(activity, activity.javaClass).apply {
                addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            intent = PendingIntent.getActivity(
                activity, 0, topIntent, PendingIntent.FLAG_MUTABLE
            )
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

        if (context.scanRequest != null && context.scanRequest!!.value) {
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

                context.uid?.value = mftag.readSerialNumber()

                mftag.close()
            } catch (e: Exception) {
                println(e)
                Toast.makeText(activity, "Communication failed", Toast.LENGTH_LONG).show()
            }
        }
    }
}
