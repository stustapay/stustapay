package de.stustanet.stustapay.nfc

import androidx.compose.runtime.MutableState

class NFCContext {
    var scanRequest: MutableState<Boolean>? = null

    var uid: MutableState<ULong>? = null
}