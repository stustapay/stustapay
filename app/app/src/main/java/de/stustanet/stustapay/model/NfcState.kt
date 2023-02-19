package de.stustanet.stustapay.model

import kotlinx.coroutines.flow.MutableStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NfcState @Inject constructor() {
    val scanRequest = MutableStateFlow(false)
    val writeRequest = MutableStateFlow(false)
    val protectRequest = MutableStateFlow(false)

    val key = MutableStateFlow(ByteArray(16) { i -> i.toByte() })

    val chipDataReady = MutableStateFlow(false)
    val chipCompatible = MutableStateFlow(false)
    val chipAuthenticated = MutableStateFlow(false)
    val chipProtected = MutableStateFlow(false)
    val chipUid = MutableStateFlow(0uL)
}