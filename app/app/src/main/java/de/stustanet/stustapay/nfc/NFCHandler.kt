package de.stustanet.stustapay.nfc

import android.app.Activity
import android.app.PendingIntent
import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.Ndef
import android.nfc.tech.NfcA
import android.widget.Toast
import java.nio.charset.Charset

class NFCHandler(activity: Activity) {
    var intent: PendingIntent? = null
    var device: NfcAdapter? = null
    var activity: Activity = activity

    fun onCreate() {
        // prepare nfc intent delivery
        device = NfcAdapter.getDefaultAdapter(activity)
        if (device != null) {
            Toast.makeText(activity, "device has nfc chip!", Toast.LENGTH_LONG).show()

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
        when (action) {
            NfcAdapter.ACTION_TECH_DISCOVERED -> {
                Toast.makeText(
                    activity,
                    "nfc tech discovered: id=${tag.id} info=${tag.toString()} techs=${tag.techList}",
                    Toast.LENGTH_LONG
                ).show()

                if (!tag.techList.contains("android.nfc.tech.NfcA")) {
                    return
                }

                val nfcatag = NfcA.get(tag)
                Toast.makeText(
                    activity,
                    "nfca tech detected: nfca=${nfcatag.toString()}",
                    Toast.LENGTH_LONG
                ).show()
            }
            NfcAdapter.ACTION_TAG_DISCOVERED -> {
                // unhandled tag tech
                Toast.makeText(activity, "unhandled tag discovered", Toast.LENGTH_LONG).show()
            }
            NfcAdapter.ACTION_NDEF_DISCOVERED -> {
                val ndeftag = Ndef.get(tag)

                ndeftag?.use { ndef ->
                    ndef.connect()
                    val text = String(ndef.ndefMessage.toByteArray(), Charset.forName("UTF-8"))
                    Toast.makeText(
                        activity,
                        "ndef text: ${text}",
                        Toast.LENGTH_LONG
                    ).show()
                }

            }
        }
    }

}
