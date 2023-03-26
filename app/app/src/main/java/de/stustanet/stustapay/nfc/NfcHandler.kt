package de.stustanet.stustapay.nfc

import android.app.Activity
import android.app.PendingIntent
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.TagLostException
import android.os.Build
import android.widget.Toast
import dagger.hilt.android.qualifiers.ActivityContext
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.android.scopes.ActivityRetainedScoped
import de.stustanet.stustapay.model.NfcState
import io.ktor.utils.io.errors.*
import kotlinx.coroutines.flow.update
import javax.inject.Inject

@ActivityRetainedScoped
class NfcHandler @Inject constructor(
    @ApplicationContext private val context: Context,
    private val nfcState: NfcState
) {
    private lateinit var intent: PendingIntent
    private lateinit var device: NfcAdapter

    fun onCreate(activity: Activity) {
        device = NfcAdapter.getDefaultAdapter(activity)
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

    fun onPause(activity: Activity) {
        device.disableForegroundDispatch(activity)
    }

    fun onResume(activity: Activity) {
        device.enableForegroundDispatch(activity, intent, null, null)
    }

    fun handleTag(tag: Tag) {
        if (!nfcState.scanRequest.value) {
            return
        }

        try {
            nfcState.chipDataReady.update { false }
            nfcState.chipCompatible.update { false }
            nfcState.chipAuthenticated.update { false }
            nfcState.chipProtected.update { false }
            nfcState.chipUid.update { 0uL }

            if (nfcState.enableDebugCard.value) {
                nfcState.chipDataReady.update { true }
                nfcState.chipCompatible.update { true }
                nfcState.chipAuthenticated.update { true }
                nfcState.chipProtected.update { true }
                return
            }

            if (!tag.techList.contains("android.nfc.tech.NfcA")) {
                Toast.makeText(context, "Incompatible chip", Toast.LENGTH_LONG).show()
                nfcState.chipDataReady.update { true }
                return
            }

            doScan(get(tag))
        } catch (e: TagLostException) {
            Toast.makeText(context, "Chip lost", Toast.LENGTH_LONG).show()
            nfcState.chipDataReady.update { false }
        } catch (e: IOException) {
            Toast.makeText(context, "Chip lost", Toast.LENGTH_LONG).show()
            nfcState.chipDataReady.update { false }
        }
    }

    private fun doScan(tag: MifareUltralightAES) {
        try {
            tag.connect()
            while (!tag.isConnected) {}

            nfcState.chipCompatible.update { true }
        } catch (e: Exception) {
            println(e)
            Toast.makeText(context, "Incompatible chip", Toast.LENGTH_LONG).show()
            nfcState.chipDataReady.update { true }
            return
        }

        try {
            tag.authenticate(nfcState.key.value)

            nfcState.chipAuthenticated.update { true }
        } catch (e: Exception) {
            println(e)
            Toast.makeText(context, "Authentication failed", Toast.LENGTH_LONG).show()
        }

        if (nfcState.writeRequest.value && (!nfcState.chipProtected.value || (nfcState.chipProtected.value && nfcState.chipAuthenticated.value))) {
            tag.writeKey(nfcState.key.value)
            tag.protect(nfcState.protectRequest.value)
            tag.writeUserMemory(nfcState.chipContent.value)
        }

        nfcState.chipProtected.update { tag.isProtected() }
        nfcState.chipUid.update { tag.readSerialNumber() }
        nfcState.chipContent.update { tag.readUserMemory() }

        tag.close()
        nfcState.chipDataReady.update { true }
    }
}
