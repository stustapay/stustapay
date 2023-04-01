package de.stustanet.stustapay.nfc

import android.nfc.Tag
import android.nfc.tech.NfcA
import android.nfc.tech.TagTechnology
import java.io.IOException
import java.nio.charset.Charset
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec
import kotlin.experimental.or
import kotlin.experimental.xor

// https://www.nxp.com/docs/en/application-note/AN13452.pdf
// https://www.nxp.com/docs/en/data-sheet/MF0AES(H)20.pdf
// https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-38B.pdf
// https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-108r1.pdf

class MifareUltralightAES(private val rawTag: Tag) : TagTechnology {
    private val nfcaTag = NfcA.get(rawTag)

    private var chipState = ChipState.IDLE
    private var auth0State: Byte? = null
    private var sessionKey: ByteArray? = null
    private var sessionCounter: UShort? = null

    fun setAuth0(page: Byte) {
        if (!isAuthenticated() && (auth0State == null || auth0State!! <= 0x29)) { throw Exception("Authentication required") }

        val buf = if (sessionKey != null) {
            val ret = cmdRead(0x29, sessionKey!!, sessionCounter!!, nfcaTag)
            sessionCounter = (sessionCounter!! + 2u).toUShort()
            ret
        } else {
            cmdRead(0x29, nfcaTag)
        }

        if (sessionKey != null) {
            cmdWrite(0x29, buf[0], buf[1], buf[2], page, sessionKey!!, sessionCounter!!, nfcaTag)
            sessionCounter = (sessionCounter!! + 2u).toUShort()
        } else {
            cmdWrite(0x29, buf[0], buf[1], buf[2], page, nfcaTag)
        }

        auth0State = page
    }

    fun setCMAC(enable: Boolean) {
        if (!isAuthenticated() && (auth0State == null || auth0State!! <= 0x29)) { throw Exception("Authentication required") }

        val buf = if (sessionKey != null) {
            val ret = cmdRead(0x29, sessionKey!!, sessionCounter!!, nfcaTag)
            sessionCounter = (sessionCounter!! + 2u).toUShort()
            ret
        } else {
            cmdRead(0x29, nfcaTag)
        }

        val a: Byte = if (enable) { 0x02 } else { 0x00 }

        if (sessionKey != null) {
            cmdWrite(0x29, a, buf[1], buf[2], buf[3], sessionKey!!, sessionCounter!!, nfcaTag)
            sessionCounter = (sessionCounter!! + 2u).toUShort()
        } else {
            cmdWrite(0x29, a, buf[1], buf[2], buf[3], nfcaTag)
        }
    }

    fun isProtected(): Boolean {
        return auth0State == null || auth0State!! <= 0x29
    }

    fun isAuthenticated(): Boolean {
        return chipState == ChipState.AUTHENTICATED || chipState == ChipState.TRACEABLE
    }

    fun authenticate(key: ByteArray, type: KeyType, cmacEnabled: Boolean) {
        if (!isConnected) { throw Exception("Not connected") }
        if (key.size != 16) { throw Exception("Wrong key size") }
        if (chipState == type.state) { throw Exception("Already authenticated") }

        val cipherKey = SecretKeySpec(key, "AES")
        val cipher = Cipher.getInstance("AES/CBC/NoPadding")
        val iv = ByteArray(16) { 0 }

        val rndA = ByteArray(16)
        SecureRandom().nextBytes(rndA)
        val rndB: ByteArray

        try {
            val ekRndB = cmdAuthenticate1(type.code, nfcaTag)
            cipher.init(Cipher.DECRYPT_MODE, cipherKey, IvParameterSpec(iv))
            rndB = cipher.doFinal(ekRndB)

            val rndAB = rndA + rndB.clone().takeLast(15) + rndB[0]
            cipher.init(Cipher.ENCRYPT_MODE, cipherKey, IvParameterSpec(iv))
            val ekRndAB = cipher.doFinal(rndAB)

            val ekRndA = cmdAuthenticate2(ekRndAB, nfcaTag)
            cipher.init(Cipher.DECRYPT_MODE, cipherKey, IvParameterSpec(iv))
            val rndAResp = cipher.doFinal(ekRndA)

            if (!(rndAResp.clone().takeLast(1) + rndAResp.clone().take(15)).toByteArray().contentEquals(rndA)) {
                throw Exception("Auth failed")
            }
        } catch (e: IOException) {
            throw Exception("Auth failed")
        }

        chipState = type.state

        val cfg0 = if (cmacEnabled) {
            sessionKey = genSessionKey(key, rndA, rndB)
            sessionCounter = 0u
            val ret = cmdRead(0x29, sessionKey!!, sessionCounter!!, nfcaTag)
            sessionCounter = (sessionCounter!! + 2u).toUShort()
            ret
        } else {
            cmdRead(0x29, nfcaTag)
        }

        auth0State = cfg0[3]
    }

    fun writeDataProtKey(key: ByteArray) {
        if (!isConnected) { throw Exception("Not connected") }
        if (key.size != 16) { throw Exception("Wrong key size") }
        if (!isAuthenticated() && (auth0State == null || auth0State!! <= 0x29)) { throw Exception("Authentication required") }

        for (i in 0 until 4) {
            if (sessionKey != null) {
                cmdWrite(
                    (i + 0x30).toByte(),
                    key[15 - (i * 4)],
                    key[15 - (i * 4 + 1)],
                    key[15 - (i * 4 + 2)],
                    key[15 - (i * 4 + 3)],
                    sessionKey!!,
                    sessionCounter!!,
                    nfcaTag
                )
                sessionCounter = (sessionCounter!! + 2u).toUShort()
            } else {
                cmdWrite(
                    (i + 0x30).toByte(),
                    key[15 - (i * 4)],
                    key[15 - (i * 4 + 1)],
                    key[15 - (i * 4 + 2)],
                    key[15 - (i * 4 + 3)],
                    nfcaTag
                )
            }
        }
    }

    fun writeUserMemory(content: ByteArray) {
        if (!isConnected) { throw Exception("Not connected") }
        if (!isAuthenticated() && (auth0State == null || auth0State!! <= (4 + USER_BYTES / 4))) { throw Exception("Authentication required") }

        val writeBuffer = ByteArray(USER_BYTES)
        for (i in 0 until USER_BYTES) {
            if (i < content.size) {
                writeBuffer[i] = content[i]
            } else {
                writeBuffer[i] = 0x00
            }
        }

        for (i in 0 until (USER_BYTES / 4)) {
            if (sessionKey != null) {
                cmdWrite((i + 4).toByte(), writeBuffer[i * 4], writeBuffer[i * 4 + 1], writeBuffer[i * 4 + 2], writeBuffer[i * 4 + 3], sessionKey!!, sessionCounter!!, nfcaTag)
                sessionCounter = (sessionCounter!! + 2u).toUShort()
            } else {
                cmdWrite((i + 4).toByte(), writeBuffer[i * 4], writeBuffer[i * 4 + 1], writeBuffer[i * 4 + 2], writeBuffer[i * 4 + 3], nfcaTag)
            }
        }
    }

    fun readUserMemory(): ByteArray {
        if (!isConnected) { throw Exception("Not connected") }
        if (!isAuthenticated() && (auth0State == null || auth0State!! <= (4 + USER_BYTES / 4))) { throw Exception("Authentication required") }

        val readBuffer = ByteArray(USER_BYTES)
        for (i in 0 until (USER_BYTES / 16)) {
            val resp = if (sessionKey != null) {
                val ret = cmdRead((i * 4 + 4).toByte(), sessionKey!!, sessionCounter!!, nfcaTag)
                sessionCounter = (sessionCounter!! + 2u).toUShort()
                ret
            } else {
                cmdRead((i * 4 + 4).toByte(), nfcaTag)
            }
            for (j in 0 until 16) {
                readBuffer[i * 16 + j] = resp[j]
            }
        }

        return readBuffer
    }

    fun readSerialNumber(): ULong {
        if (!isConnected) { throw Exception("Not connected") }

        val readBuffer = if (sessionKey != null) {
            val ret = cmdRead(0x00, sessionKey!!, sessionCounter!!, nfcaTag)
            sessionCounter = (sessionCounter!! + 2u).toUShort()
            ret
        } else {
            cmdRead(0x00, nfcaTag)
        }

        var ser = 0uL
        for (i in 0 until 7) {
            ser = ser or (readBuffer[i].toULong() shl (i * 8))
        }

        return ser
    }

    override fun connect() {
        nfcaTag.connect()

        val resp = cmdGetVersion(nfcaTag)
        val vendorID = resp[1]
        val productType = resp[2]
        val productSubType = resp[3]
        val majorVer = resp[4]
        val minorVer = resp[5]
        val storageSize = resp[6]
        val protocolType = resp[7]
        if (!(vendorID == 0x04.toByte() &&
                    productType == 0x03.toByte() &&
                    (productSubType == 0x01.toByte() || productSubType == 0x02.toByte()) &&
                    majorVer == 0x04.toByte() &&
                    minorVer == 0x00.toByte() &&
                    storageSize == 0x0f.toByte() &&
                    protocolType == 0x03.toByte())) {
            throw Exception("Not a MF-UL-AES chip")
        }

        chipState = ChipState.ACTIVE

        auth0State = try {
            val cfg0 = cmdRead(0x29.toByte(), nfcaTag)
            cfg0[3]
        } catch (e: IOException) {
            null
        }
    }

    override fun close() {
        nfcaTag.close()
    }

    override fun isConnected(): Boolean {
        return nfcaTag.isConnected
    }

    override fun getTag(): Tag {
        return rawTag
    }

    enum class KeyType(val code: Byte, val state: ChipState) {
        DATA_PROT_KEY(0x00, ChipState.AUTHENTICATED),
        UID_RETR_KEY(0x01, ChipState.TRACEABLE),
        ORIGINALITY_KEY(0x02, ChipState.ACTIVE)
    }

    enum class ChipState { IDLE, ACTIVE, TRACEABLE, AUTHENTICATED }
}

fun get(tag: Tag): MifareUltralightAES {
    return MifareUltralightAES(tag)
}