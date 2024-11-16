package de.stustapay.libssp.nfc

import android.app.Activity
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.TagLostException
import android.os.Bundle
import android.util.Log
import de.stustapay.libssp.model.NfcScanFailure
import de.stustapay.libssp.model.NfcScanRequest
import de.stustapay.libssp.model.NfcScanResult
import de.stustapay.libssp.util.BitVector
import de.stustapay.libssp.util.asBitVector
import de.stustapay.libssp.util.bv
import java.io.IOException
import java.nio.charset.Charset
import javax.inject.Inject
import javax.inject.Singleton


@Singleton
class NfcHandler @Inject constructor(
    private val dataSource: NfcDataSource
) {
    private lateinit var device: NfcAdapter
    private lateinit var uid_map: Map<ULong, String>

    fun onCreate(activity: Activity, uid_map: Map<ULong, String>) {
        device = NfcAdapter.getDefaultAdapter(activity)
        this.uid_map = uid_map
    }

    fun onPause(activity: Activity) {
        device.disableReaderMode(activity)
    }

    fun onResume(activity: Activity) {
        device.enableReaderMode(
            activity,
            { tag -> handleTag(tag) },
            NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS,
            // some devices send presence heartbeats to the nfc tag.
            // this heartbeat may be sent in non-cmac-mode - and then a cmac-enabled
            // chip refuses any further communication.
            // -> adjust the check delay so we don't usually check for presence during
            //    a nfc transaction.
            Bundle().apply {
                putInt(NfcAdapter.EXTRA_READER_PRESENCE_CHECK_DELAY, 500)
            }
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
            dataSource.setScanResult(
                NfcScanResult.Fail(
                    NfcScanFailure.Other(
                        e.localizedMessage ?: "unknown exception"
                    )
                )
            )
        }
    }

    private fun handleMfUlAesTag(tag: MifareUltralightAES) {
        val req = dataSource.getScanRequest()
        if (req != null) {
            when (req) {
                is NfcScanRequest.Read -> {
                    tag.connect()
                    dataSource.setScanResult(NfcScanResult.Read(tag.fastRead(req.uidRetrKey, req.dataProtKey)))
                }
                is NfcScanRequest.Write -> {
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

                    authenticate(tag, true, true, req.dataProtKey!!)

                    tag.setCMAC(true)
                    tag.setAuth0(0x10u)
                    tag.writeUserMemory("StuStaPay at StuStaCulum 2024\n".toByteArray(Charset.forName("UTF-8")).asBitVector())
                    tag.writePin("WWWWWWWWWWWW")
                    tag.writeDataProtKey(req.dataProtKey)
                    tag.writeUidRetrKey(req.uidRetrKey)
                    dataSource.setScanResult(NfcScanResult.Write)
                }
                is NfcScanRequest.Rewrite -> {
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

                    try {
                        tag.authenticate(req.dataProtKey, MifareUltralightAES.KeyType.DATA_PROT_KEY, true)
                    } catch (e: Exception) {
                        dataSource.setScanResult(
                            NfcScanResult.Fail(
                                NfcScanFailure.Auth(
                                    e.message ?: "unknown auth error"
                                )
                            )
                        )
                        return
                    }

                    val ser = tag.readSerialNumber()
                    if (uid_map[ser] == null) {
                        dataSource.setScanResult(
                            NfcScanResult.Fail(
                                NfcScanFailure.Other(
                                    "uid not found"
                                )
                            )
                        )
                        return
                    }

                    tag.setCMAC(true)
                    tag.writeDataProtKey(req.dataProtKey)
                    tag.writeUidRetrKey(req.uidRetrKey)
                    tag.writePin(uid_map[ser] + "\u0000\u0000\u0000\u0000")
                    dataSource.setScanResult(NfcScanResult.Write)
                }
                is NfcScanRequest.Test -> {
                    val log = tag.test(req.dataProtKey, req.uidRetrKey)
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
