package de.stustanet.stustapay.model

import dagger.hilt.android.scopes.ActivityRetainedScoped
import dagger.hilt.android.scopes.ActivityScoped
import kotlinx.coroutines.flow.MutableStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@ActivityRetainedScoped
class NfcState @Inject constructor() {
    val scanRequest = MutableStateFlow(false)
    val writeRequest = MutableStateFlow(false)
    val protectRequest = MutableStateFlow(false)

    val key = MutableStateFlow(ByteArray(16) { i -> i.toByte() })
    val enableDebugCard = MutableStateFlow(false)

    val chipDataReady = MutableStateFlow(false)
    val chipCompatible = MutableStateFlow(false)
    val chipAuthenticated = MutableStateFlow(false)
    val chipProtected = MutableStateFlow(false)
    val chipUid = MutableStateFlow(0uL)
    val chipContent = MutableStateFlow("")
}