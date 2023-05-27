package de.stustanet.stustapay.nfc

import android.app.Activity
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.TagLostException
import androidx.compose.ui.platform.LocalHapticFeedback
import de.stustanet.stustapay.model.NfcScanFailure
import de.stustanet.stustapay.model.NfcScanRequest
import de.stustanet.stustapay.model.NfcScanResult
import de.stustanet.stustapay.util.BitVector
import de.stustanet.stustapay.util.asBitVector
import de.stustanet.stustapay.util.bv
import java.io.IOException
import java.nio.charset.Charset
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NfcHandler @Inject constructor(
    private val dataSource: NfcDataSource
) {
    private lateinit var device: NfcAdapter

    fun onCreate(activity: Activity) {
        device = NfcAdapter.getDefaultAdapter(activity)
    }

    fun onPause(activity: Activity) {
        device.disableReaderMode(activity)
    }

    fun onResume(activity: Activity) {
        device.enableReaderMode(
            activity,
            { tag -> handleTag(tag) },
            NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS,
            null
        )
    }

    private fun handleTag(tag: Tag) {
        if (!tag.techList.contains("android.nfc.tech.NfcA")) {
            dataSource.setScanResult(NfcScanResult.Fail(NfcScanFailure.Incompatible("device has no NfcA support")))
            return
        }

        val mfUlAesTag = MifareUltralightAES(tag)

        try {
            handleMfUlAesTag(mfUlAesTag)

            mfUlAesTag.close()
        } catch (e: TagLostException) {
            dataSource.setScanResult(
                NfcScanResult.Fail(
                    NfcScanFailure.Lost(
                        e.message ?: "unknown reason"
                    )
                )
            )
        } catch (e: TagAuthException) {
            dataSource.setScanResult(
                NfcScanResult.Fail(
                    NfcScanFailure.Auth(
                        e.message ?: "unknown reason"
                    )
                )
            )
        } catch (e: TagIncompatibleException) {
            dataSource.setScanResult(
                NfcScanResult.Fail(
                    NfcScanFailure.Incompatible(
                        e.message ?: "unknown reason"
                    )
                )
            )
        } catch (e: IOException) {
            dataSource.setScanResult(
                NfcScanResult.Fail(
                    NfcScanFailure.Lost(
                        e.message ?: "io error"
                    )
                )
            )
        } catch (e: SecurityException) {
            dataSource.setScanResult(
                NfcScanResult.Fail(
                    NfcScanFailure.Lost(
                        e.message ?: "security error"
                    )
                )
            )
        } catch (e: Exception) {
            e.printStackTrace()
            dataSource.setScanResult(NfcScanResult.Fail(NfcScanFailure.Other(e.localizedMessage ?: "unknown exception")))
        }
    }

    private fun handleMfUlAesTag(tag: MifareUltralightAES) {
        val req = dataSource.getScanRequest()
        if (req != null) {
            when (req) {
                is NfcScanRequest.FastRead -> {
                    tag.connect()
                    dataSource.setScanResult(NfcScanResult.FastRead(tag.fastRead(req.key)))
                }
                is NfcScanRequest.Read -> {
                    tag.connect()

                    if (!authenticate(tag, req.auth, req.cmac, req.key)) {
                        return
                    }
                    val chipProtected = tag.isProtected()
                    val chipUid = tag.readSerialNumber()
                    val chipContent = tag.readUserMemory().asByteArray().decodeToString()
                    dataSource.setScanResult(
                        NfcScanResult.Read(
                            chipProtected,
                            chipUid,
                            chipContent
                        )
                    )
                }
                is NfcScanRequest.ReadMultiKey -> {
                    tag.connect()

                    for (key in req.keys) {
                        try {
                            tag.authenticate(
                                key,
                                MifareUltralightAES.KeyType.DATA_PROT_KEY,
                                req.cmac
                            )
                        } catch (e: Exception) {
                            tag.close()
                            tag.connect()
                            continue
                        }
                        val chipProtected = tag.isProtected()
                        val chipUid = tag.readSerialNumber()
                        val chipContent = tag.readUserMemory().asByteArray().decodeToString()
                        dataSource.setScanResult(
                            NfcScanResult.Read(
                                chipProtected,
                                chipUid,
                                chipContent
                            )
                        )
                        return
                    }
                    dataSource.setScanResult(NfcScanResult.Fail(NfcScanFailure.Auth("none of the keys worked")))
                }
                is NfcScanRequest.WriteSig -> {
                    tag.connect()

                    if (!authenticate(tag, req.auth, req.cmac, req.key)) {
                        return
                    }
                    var data = req.signature.toByteArray(Charset.forName("UTF-8")).asBitVector()
                    for (i in 0u until 4u) {
                        data += 0.bv
                    }
                    for (i in 48u until 56u) {
                        data += i.bv
                    }
                    tag.writeUserMemory(data)
                    dataSource.setScanResult(NfcScanResult.Write)
                }
                is NfcScanRequest.WriteKey -> {
                    try {
                        tag.connect()
                    } catch (e: TagIncompatibleException) {
                        dataSource.setScanResult(
                            NfcScanResult.Fail(
                                NfcScanFailure.Incompatible(
                                    e.message ?: "unknown reason"
                                )
                            )
                        )
                        return
                    }
                    if (!authenticate(tag, req.auth, req.cmac, req.key)) {
                        return
                    }
                    tag.writeDataProtKey(req.key)
                    tag.writeUidRetrKey(req.key)
                    dataSource.setScanResult(NfcScanResult.Write)
                }
                is NfcScanRequest.WriteProtect -> {
                    try {
                        tag.connect()
                    } catch (e: TagIncompatibleException) {
                        dataSource.setScanResult(
                            NfcScanResult.Fail(
                                NfcScanFailure.Incompatible(
                                    e.message ?: "unknown reason"
                                )
                            )
                        )
                        return
                    }
                    if (!authenticate(tag, req.auth, req.cmac, req.key)) {
                        return
                    }
                    if (req.enable) {
                        tag.setAuth0(0x10u)
                    } else {
                        tag.setAuth0(0x3cu)
                    }
                    dataSource.setScanResult(NfcScanResult.Write)
                }
                is NfcScanRequest.WriteCmac -> {
                    try {
                        tag.connect()
                    } catch (e: TagIncompatibleException) {
                        dataSource.setScanResult(
                            NfcScanResult.Fail(
                                NfcScanFailure.Incompatible(
                                    e.message ?: "unknown reason"
                                )
                            )
                        )
                        return
                    }
                    if (!authenticate(tag, req.auth, req.cmac, req.key)) {
                        return
                    }
                    tag.setCMAC(req.enable)
                    dataSource.setScanResult(NfcScanResult.Write)
                }
                is NfcScanRequest.Test -> {
                    val log = tag.test(req.key0, req.key1)
                    dataSource.setScanResult(NfcScanResult.Test(log))
                }
            }
        }
    }

    private fun authenticate(
        tag: MifareUltralightAES,
        auth: Boolean,
        cmac: Boolean,
        key: BitVector
    ): Boolean {
        try {
            if (auth) {
                tag.authenticate(key, MifareUltralightAES.KeyType.DATA_PROT_KEY, cmac)
            }
        } catch (e: Exception) {
            dataSource.setScanResult(
                NfcScanResult.Fail(
                    NfcScanFailure.Auth(
                        e.message ?: "unknown auth error"
                    )
                )
            )
            return false
        }

        return true
    }
}
