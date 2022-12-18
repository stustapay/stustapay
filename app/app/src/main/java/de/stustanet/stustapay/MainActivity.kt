package de.stustanet.stustapay

import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import de.stustanet.stustapay.nfc.NFCHandler
import de.stustanet.stustapay.ui.SSPUI


class MainActivity : ComponentActivity() {
    /** nfc interface connection */
    var nfcHandler = NFCHandler(this)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        nfcHandler.onCreate()

        setContent {
            SSPUI()
        }
    }

    public override fun onPause() {
        super.onPause()

        nfcHandler.onPause();
    }

    public override fun onResume() {
        super.onResume()

        nfcHandler.onResume()
    }

    public override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)

        if (intent.action == NfcAdapter.ACTION_TECH_DISCOVERED ||
            intent.action == NfcAdapter.ACTION_TAG_DISCOVERED ||
            intent.action == NfcAdapter.ACTION_NDEF_DISCOVERED
        ) {
            val tag: Tag? = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
            if (tag != null) {
                nfcHandler.handleTag(intent.action!!, tag)
            }
        }
    }
}