package de.stustanet.stustapay.nfc

import android.nfc.Tag
import android.nfc.tech.NfcA
import android.nfc.tech.TagTechnology
import de.stustanet.stustapay.util.*
import java.io.IOException
import java.security.SecureRandom

// https://www.nxp.com/docs/en/application-note/AN13452.pdf
// https://www.nxp.com/docs/en/data-sheet/MF0AES(H)20.pdf
// https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-38B.pdf
// https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-108r1.pdf
// https://www.cs.ru.nl/~rverdult/Ciphertext-only_Cryptanalysis_on_Hardened_Mifare_Classic_Cards-CCS_2015.pdf

class MifareUltralightAES(private val rawTag: Tag) : TagTechnology {
    val nfcaTag: NfcA = NfcA.get(rawTag)

    private var chipState = ChipState.IDLE
    private var auth0State: UByte? = null
    var sessionKey: BitVector? = null
    var sessionCounter: UShort? = null

    fun fastRead(key: BitVector): ULong {
        if (key.len != 16uL * 8uL) { throw IllegalArgumentException() }
        if (chipState != ChipState.ACTIVE) { throw Exception("Already authenticated") }

        val nonce = ByteArray(16)
        SecureRandom().nextBytes(nonce)

        val rndA = nonce.asBitVector()
        val rndB: BitVector

        try {
            val ekRndB = cmdAuthenticate1(KeyType.DATA_PROT_KEY.code, nfcaTag)
            rndB = ekRndB.aesDecrypt(key)

            val rndAB = rndA + rndB.rotl(8uL)
            val ekRndAB = rndAB.aesEncrypt(key)

            val ekRndA = cmdAuthenticate2(ekRndAB, nfcaTag)
            val rndAResp = ekRndA.aesDecrypt(key)

            if (!rndAResp.equals(rndA.rotl(8uL))) {
                throw TagAuthException("Key mismatch")
            }
        } catch (e: IOException) {
            throw TagAuthException("Auth failed")
        }

        sessionKey = genSessionKey(key, rndA, rndB)
        sessionCounter = 0u

        val readBuffer = cmdRead(0x00u, sessionKey!!, sessionCounter!!, nfcaTag)
        sessionCounter = (sessionCounter!! + 2u).toUShort()

        var ser = 0uL
        for (i in 0uL until 3uL) {
            ser = ser or (readBuffer.gbe(i).toULong() shl (i * 8u).toInt())
        }
        for (i in 3uL until 7uL) {
            ser = ser or (readBuffer.gbe(i + 1u).toULong() shl (i * 8u).toInt())
        }

        return ser
    }

    fun setAuth0(page: UByte) {
        if (!isAuthenticated() && (auth0State == null || auth0State!! <= 0x29u)) { throw TagAuthException("Authentication required") }

        val buf = if (sessionKey != null) {
            val ret = cmdRead(0x29u, sessionKey!!, sessionCounter!!, nfcaTag)
            sessionCounter = (sessionCounter!! + 2u).toUShort()
            ret
        } else {
            cmdRead(0x29u, nfcaTag)
        }

        if (sessionKey != null) {
            cmdWrite(0x29u, buf.gbe(0uL), buf.gbe(1uL), buf.gbe(2uL), page, sessionKey!!, sessionCounter!!, nfcaTag)
            sessionCounter = (sessionCounter!! + 2u).toUShort()
        } else {
            cmdWrite(0x29u, buf.gbe(0uL), buf.gbe(1uL), buf.gbe(2uL), page, nfcaTag)
        }

        auth0State = page
    }

    fun setCMAC(enable: Boolean) {
        if (!isAuthenticated() && (auth0State == null || auth0State!! <= 0x29u)) { throw TagAuthException("Authentication required") }

        val buf = if (sessionKey != null) {
            val ret = cmdRead(0x29u, sessionKey!!, sessionCounter!!, nfcaTag)
            sessionCounter = (sessionCounter!! + 2u).toUShort()
            ret
        } else {
            cmdRead(0x29u, nfcaTag)
        }

        val a: UByte = if (enable) { 0x02u } else { 0x00u }

        if (sessionKey != null) {
            cmdWrite(0x29u, a, buf.gbe(1uL), buf.gbe(2uL), buf.gbe(3uL), sessionKey!!, sessionCounter!!, nfcaTag)
            sessionCounter = (sessionCounter!! + 2u).toUShort()
        } else {
            cmdWrite(0x29u, a, buf.gbe(1uL), buf.gbe(2uL), buf.gbe(3uL), nfcaTag)
        }
    }

    fun isProtected(): Boolean {
        return auth0State == null || auth0State!! <= 0x29u
    }

    fun isAuthenticated(): Boolean {
        return chipState == ChipState.AUTHENTICATED || chipState == ChipState.TRACEABLE
    }

    fun authenticate(key: BitVector, type: KeyType, cmacEnabled: Boolean) {
        if (!isConnected) { throw TagConnectionException() }
        if (key.len != 16uL * 8uL) { throw IllegalArgumentException() }
        if (chipState == type.state) { throw Exception("Already authenticated") }

        val nonce = ByteArray(16)
        SecureRandom().nextBytes(nonce)

        val rndA = nonce.asBitVector()
        val rndB: BitVector

        try {
            val ekRndB = cmdAuthenticate1(type.code, nfcaTag)
            rndB = ekRndB.aesDecrypt(key)

            val rndAB = rndA + rndB.rotl(8uL)
            val ekRndAB = rndAB.aesEncrypt(key)

            val ekRndA = cmdAuthenticate2(ekRndAB, nfcaTag)
            val rndAResp = ekRndA.aesDecrypt(key)

            if (!rndAResp.equals(rndA.rotl(8uL))) {
                throw TagAuthException("Key mismatch")
            }
        } catch (e: IOException) {
            throw TagAuthException("Auth failed")
        }

        chipState = type.state
        if (cmacEnabled) {
            sessionKey = genSessionKey(key, rndA, rndB)
            sessionCounter = 0u
        } else {
            sessionKey = null
            sessionCounter = null
        }

        if (type == KeyType.DATA_PROT_KEY) {
            val cfg0 = if (cmacEnabled) {
                val ret = cmdRead(0x29u, sessionKey!!, sessionCounter!!, nfcaTag)
                sessionCounter = (sessionCounter!! + 2u).toUShort()
                ret
            } else {
                cmdRead(0x29u, nfcaTag)
            }

            auth0State = cfg0.gbe(3uL)
        }
    }

    fun writeDataProtKey(key: BitVector) {
        if (!isConnected) { throw TagConnectionException() }
        if (key.len != 16uL * 8uL) { throw IllegalArgumentException() }
        if (!isAuthenticated() && (auth0State == null || auth0State!! <= 0x29u)) { throw TagAuthException("Authentication required") }

        for (i in 0uL until 4uL) {
            if (sessionKey != null) {
                cmdWrite(
                    (i + 0x30u).toUByte(),
                    key.gle(i * 4uL),
                    key.gle(i * 4uL + 1uL),
                    key.gle(i * 4uL + 2uL),
                    key.gle(i * 4uL + 3uL),
                    sessionKey!!,
                    sessionCounter!!,
                    nfcaTag
                )
                sessionCounter = (sessionCounter!! + 2u).toUShort()
            } else {
                cmdWrite(
                    (i + 0x30u).toUByte(),
                    key.gle(i * 4uL),
                    key.gle(i * 4uL + 1uL),
                    key.gle(i * 4uL + 2uL),
                    key.gle(i * 4uL + 3uL),
                    nfcaTag
                )
            }
        }
    }

    fun writeUidRetrKey(key: BitVector) {
        if (!isConnected) { throw TagConnectionException() }
        if (key.len != 16uL * 8uL) { throw IllegalArgumentException() }
        if (!isAuthenticated() && (auth0State == null || auth0State!! <= 0x29u)) { throw TagAuthException("writing uid retrieval key needs authentication") }

        for (i in 0uL until 4uL) {
            if (sessionKey != null) {
                cmdWrite(
                    (i + 0x34u).toUByte(),
                    key.gle(i * 4uL),
                    key.gle(i * 4uL + 1uL),
                    key.gle(i * 4uL + 2uL),
                    key.gle(i * 4uL + 3uL),
                    sessionKey!!,
                    sessionCounter!!,
                    nfcaTag
                )
                sessionCounter = (sessionCounter!! + 2u).toUShort()
            } else {
                cmdWrite(
                    (i + 0x34u).toUByte(),
                    key.gle(i * 4uL),
                    key.gle(i * 4uL + 1uL),
                    key.gle(i * 4uL + 2uL),
                    key.gle(i * 4uL + 3uL),
                    nfcaTag
                )
            }
        }
    }

    fun writeUserMemory(content: BitVector) {
        if (!isConnected) { throw TagConnectionException() }
        if (!isAuthenticated() && (auth0State == null || auth0State!! <= (4u + USER_BYTES / 4u))) { throw TagAuthException("Authentication required") }

        val writeBuffer = BitVector(USER_BYTES * 8uL)
        for (i in 0uL until USER_BYTES) {
            if (i * 8uL < content.len) {
                writeBuffer.sbe(i, content.gbe(i))
            } else {
                writeBuffer.sbe(i, 0x00u)
            }
        }

        for (i in 0uL until USER_BYTES / 4uL) {
            if (sessionKey != null) {
                cmdWrite(
                    (i + 4u).toUByte(),
                    writeBuffer.gbe(i * 4uL),
                    writeBuffer.gbe(i * 4uL + 1uL),
                    writeBuffer.gbe(i * 4uL + 2uL),
                    writeBuffer.gbe(i * 4uL + 3uL),
                    sessionKey!!,
                    sessionCounter!!,
                    nfcaTag
                )
                sessionCounter = (sessionCounter!! + 2u).toUShort()
            } else {
                cmdWrite(
                    (i + 4u).toUByte(),
                    writeBuffer.gbe(i * 4uL),
                    writeBuffer.gbe(i * 4uL + 1uL),
                    writeBuffer.gbe(i * 4uL + 2uL),
                    writeBuffer.gbe(i * 4uL + 3uL),
                    nfcaTag
                )
            }
        }
    }

    fun readUserMemory(): BitVector {
        if (!isConnected) { throw TagConnectionException() }
        if (!isAuthenticated() && (auth0State == null || auth0State!! <= (4u + USER_BYTES / 4u))) { throw TagAuthException("read authentication required") }

        val readBuffer = BitVector(USER_BYTES * 8uL)
        for (i in 0uL until USER_BYTES / 16uL) {
            val resp = if (sessionKey != null) {
                val ret = cmdRead((i * 4u + 4u).toUByte(), sessionKey!!, sessionCounter!!, nfcaTag)
                sessionCounter = (sessionCounter!! + 2u).toUShort()
                ret
            } else {
                cmdRead((i * 4u + 4u).toUByte(), nfcaTag)
            }
            for (j in 0uL until 16uL) {
                readBuffer.sbe(i * 16uL + j, resp.gbe(j))
            }
        }

        return readBuffer
    }

    fun readSerialNumber(): ULong {
        if (!isConnected) { throw TagConnectionException() }

        val readBuffer = if (sessionKey != null) {
            val ret = cmdRead(0x00u, sessionKey!!, sessionCounter!!, nfcaTag)
            sessionCounter = (sessionCounter!! + 2u).toUShort()
            ret
        } else {
            cmdRead(0x00u, nfcaTag)
        }

        var ser = 0uL
        for (i in 0uL until 3uL) {
            ser = ser or (readBuffer.gbe(i).toULong() shl (i * 8u).toInt())
        }
        for (i in 3uL until 7uL) {
            ser = ser or (readBuffer.gbe(i + 1u).toULong() shl (i * 8u).toInt())
        }

        return ser
    }

    override fun connect() {
        nfcaTag.connect()

        val resp = cmdGetVersion(nfcaTag)
        if (!(resp.equals(0x00.bv + 0x04.bv + 0x03.bv + 0x01.bv + 0x04.bv + 0x00.bv + 0x0f.bv + 0x03.bv) ||
                    resp.equals(0x00.bv + 0x04.bv + 0x03.bv + 0x02.bv + 0x04.bv + 0x00.bv + 0x0f.bv + 0x03.bv))) {
            throw TagIncompatibleException("Not a Mifare Ultralight AES chip")
        }

        chipState = ChipState.ACTIVE

        auth0State = try {
            cmdRead(0x29u, nfcaTag).gbe(3uL)
        } catch (e: IOException) {
            null
        } catch (e: ArrayIndexOutOfBoundsException) {
            null
        }
    }

    override fun close() {
        nfcaTag.close()
        sessionKey = null
        sessionCounter = null
        chipState = ChipState.IDLE
        auth0State = null
    }

    override fun isConnected(): Boolean {
        return nfcaTag.isConnected
    }

    override fun getTag(): Tag {
        return rawTag
    }

    enum class KeyType(val code: UByte, val state: ChipState) {
        DATA_PROT_KEY(0x00u, ChipState.AUTHENTICATED),
        UID_RETR_KEY(0x01u, ChipState.TRACEABLE),
        ORIGINALITY_KEY(0x02u, ChipState.ACTIVE)
    }

    enum class ChipState { IDLE, ACTIVE, TRACEABLE, AUTHENTICATED }
}