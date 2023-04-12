package de.stustanet.stustapay.nfc

import android.nfc.Tag
import android.nfc.tech.NfcA
import android.nfc.tech.TagTechnology
import de.stustanet.stustapay.util.*
import java.io.IOException
import java.nio.charset.Charset
import java.security.SecureRandom

// https://www.nxp.com/docs/en/application-note/AN13452.pdf
// https://www.nxp.com/docs/en/data-sheet/MF0AES(H)20.pdf
// https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-38B.pdf
// https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-108r1.pdf
// https://www.cs.ru.nl/~rverdult/Ciphertext-only_Cryptanalysis_on_Hardened_Mifare_Classic_Cards-CCS_2015.pdf

class MifareUltralightAES(private val rawTag: Tag) : TagTechnology {
    private val nfcaTag = NfcA.get(rawTag)

    private var chipState = ChipState.IDLE
    private var auth0State: UByte? = null
    private var sessionKey: BitVector? = null
    private var sessionCounter: UShort? = null

    fun test(log: MutableList<Pair<String, Boolean>>) {
        var key0 = 0x00.bv + 0x01.bv + 0x02.bv + 0x03.bv + 0x04.bv + 0x05.bv + 0x06.bv + 0x07.bv +
                0x08.bv + 0x09.bv + 0x0a.bv + 0x0b.bv + 0x0c.bv + 0x0d.bv + 0x0e.bv + 0x0f.bv
        var key1 = 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv +
                0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv + 0x00.bv

        log.add(Pair("Started test", true))

        nfcaTag.connect()
        while (!nfcaTag.isConnected) {}

        var verCheckSucceeded = false
        try {
            val ver = cmdGetVersion(nfcaTag)
            if (ver.equals(0x00.bv + 0x04.bv + 0x03.bv + 0x01.bv + 0x04.bv + 0x00.bv + 0x0f.bv + 0x03.bv) ||
                ver.equals(0x00.bv + 0x04.bv + 0x03.bv + 0x02.bv + 0x04.bv + 0x00.bv + 0x0f.bv + 0x03.bv)) {
                log.add(Pair("Mifare Ultralight AES tag detected", true))
                verCheckSucceeded = true
            } else {
                log.add(Pair("Other NFC tag detected", false))
            }
        } catch (e: Exception) {
            log.add(Pair("Checking tag type failed", false))
        }

        nfcaTag.close()
        nfcaTag.connect()
        while (!nfcaTag.isConnected) {}

        var key0AuthSucceeded = false
        var keyOuterReversed = false
        var keyInnerReversed = false
        try {
            val nonce = ByteArray(16)
            SecureRandom().nextBytes(nonce)

            val rndA = nonce.asBitVector()
            val rndB: BitVector

            val ekRndB = cmdAuthenticate1(0x00u, nfcaTag)
            rndB = ekRndB.aesDecrypt(key0)

            val rndAB = rndA + rndB.rotl(8uL)
            val ekRndAB = rndAB.aesEncrypt(key0)

            val ekRndA = cmdAuthenticate2(ekRndAB, nfcaTag)
            val rndAResp = ekRndA.aesDecrypt(key0)

            if (rndAResp.equals(rndA.rotl(8uL))) {
                log.add(Pair("Authenticated using key0", true))
                key0AuthSucceeded = true
            } else {
                log.add(Pair("Authentication using key0 failed", false))
            }
        } catch (e: Exception) {
            log.add(Pair("Authentication using key0 failed", false))
        }

        if (!key0AuthSucceeded) {
            nfcaTag.close()
            nfcaTag.connect()
            while (!nfcaTag.isConnected) {}

            val testKey = BitVector(16uL * 8uL)
            for (i in 0uL until 16uL) {
                testKey.sle(i, key0.gbe(i))
            }

            try {
                val nonce = ByteArray(16)
                SecureRandom().nextBytes(nonce)

                val rndA = nonce.asBitVector()
                val rndB: BitVector

                val ekRndB = cmdAuthenticate1(0x00u, nfcaTag)
                rndB = ekRndB.aesDecrypt(testKey)

                val rndAB = rndA + rndB.rotl(8uL)
                val ekRndAB = rndAB.aesEncrypt(testKey)

                val ekRndA = cmdAuthenticate2(ekRndAB, nfcaTag)
                val rndAResp = ekRndA.aesDecrypt(testKey)

                if (rndAResp.equals(rndA.rotl(8uL))) {
                    log.add(Pair("Authenticated using outer reversed key0", true))
                    key0AuthSucceeded = true
                    keyOuterReversed = true
                } else {
                    log.add(Pair("Authentication using outer reversed key0 also failed", false))
                }
            } catch (e: Exception) {
                log.add(Pair("Authentication using outer reversed key0 also failed", false))
            }
        }

        if (!key0AuthSucceeded) {
            nfcaTag.close()
            nfcaTag.connect()
            while (!nfcaTag.isConnected) {}

            val testKey = BitVector(16uL * 8uL)
            for (i in 0uL until 4uL) {
                testKey.sle(i, key0.gbe(12uL + i))
            }
            for (i in 0uL until 4uL) {
                testKey.sle(4uL + i, key0.gbe(8uL + i))
            }
            for (i in 0uL until 4uL) {
                testKey.sle(8uL + i, key0.gbe(4uL + i))
            }
            for (i in 0uL until 4uL) {
                testKey.sle(12uL + i, key0.gbe(i))
            }

            try {
                val nonce = ByteArray(16)
                SecureRandom().nextBytes(nonce)

                val rndA = nonce.asBitVector()
                val rndB: BitVector

                val ekRndB = cmdAuthenticate1(0x00u, nfcaTag)
                rndB = ekRndB.aesDecrypt(testKey)

                val rndAB = rndA + rndB.rotl(8uL)
                val ekRndAB = rndAB.aesEncrypt(testKey)

                val ekRndA = cmdAuthenticate2(ekRndAB, nfcaTag)
                val rndAResp = ekRndA.aesDecrypt(testKey)

                if (rndAResp.equals(rndA.rotl(8uL))) {
                    log.add(Pair("Authenticated using inner reversed key0", true))
                    key0AuthSucceeded = true
                    keyInnerReversed = true
                } else {
                    log.add(Pair("Authentication using inner reversed key0 also failed", false))
                }
            } catch (e: Exception) {
                log.add(Pair("Authentication using inner reversed key0 also failed", false))
            }
        }

        if (!key0AuthSucceeded) {
            nfcaTag.close()
            nfcaTag.connect()
            while (!nfcaTag.isConnected) {}

            val tmp = BitVector(16uL * 8uL)
            for (i in 0uL until 4uL) {
                tmp.sle(i, key0.gbe(12uL + i))
            }
            for (i in 0uL until 4uL) {
                tmp.sle(4uL + i, key0.gbe(8uL + i))
            }
            for (i in 0uL until 4uL) {
                tmp.sle(8uL + i, key0.gbe(4uL + i))
            }
            for (i in 0uL until 4uL) {
                tmp.sle(12uL + i, key0.gbe(i))
            }
            val testKey = BitVector(16uL * 8uL)
            for (i in 0uL until 16uL) {
                testKey.sle(i, tmp.gbe(i))
            }

            try {
                val nonce = ByteArray(16)
                SecureRandom().nextBytes(nonce)

                val rndA = nonce.asBitVector()
                val rndB: BitVector

                val ekRndB = cmdAuthenticate1(0x00u, nfcaTag)
                rndB = ekRndB.aesDecrypt(testKey)

                val rndAB = rndA + rndB.rotl(8uL)
                val ekRndAB = rndAB.aesEncrypt(testKey)

                val ekRndA = cmdAuthenticate2(ekRndAB, nfcaTag)
                val rndAResp = ekRndA.aesDecrypt(testKey)

                if (rndAResp.equals(rndA.rotl(8uL))) {
                    log.add(Pair("Authenticated using double reversed key0", true))
                    key0AuthSucceeded = true
                    keyOuterReversed = true
                    keyInnerReversed = true
                } else {
                    log.add(Pair("Authentication using double reversed key0 also failed", false))
                }
            } catch (e: Exception) {
                log.add(Pair("Authentication using double reversed key0 also failed", false))
            }
        }

        nfcaTag.close()

        if (keyOuterReversed) {
            val tmp0 = BitVector(16uL * 8uL)
            for (i in 0uL until 16uL) {
                tmp0.sle(i, key0.gbe(i))
            }
            key0 = tmp0
            val tmp1 = BitVector(16uL * 8uL)
            for (i in 0uL until 16uL) {
                tmp1.sle(i, key1.gbe(i))
            }
            key1 = tmp1
        }

        if (keyInnerReversed) {
            val tmp0 = BitVector(16uL * 8uL)
            for (i in 0uL until 4uL) {
                tmp0.sle(i, key0.gbe(12uL + i))
            }
            for (i in 0uL until 4uL) {
                tmp0.sle(4uL + i, key0.gbe(8uL + i))
            }
            for (i in 0uL until 4uL) {
                tmp0.sle(8uL + i, key0.gbe(4uL + i))
            }
            for (i in 0uL until 4uL) {
                tmp0.sle(12uL + i, key0.gbe(i))
            }
            key0 = tmp0
            val tmp1 = BitVector(16uL * 8uL)
            for (i in 0uL until 4uL) {
                tmp1.sle(i, key1.gbe(12uL + i))
            }
            for (i in 0uL until 4uL) {
                tmp1.sle(4uL + i, key1.gbe(8uL + i))
            }
            for (i in 0uL until 4uL) {
                tmp1.sle(8uL + i, key1.gbe(4uL + i))
            }
            for (i in 0uL until 4uL) {
                tmp1.sle(12uL + i, key1.gbe(i))
            }
            key1 = tmp1
        }

        if (verCheckSucceeded && key0AuthSucceeded) {
            connect()
            while (!isConnected) {}

            var cmacCheckSucceeded = false
            try {
                authenticate(key0, KeyType.DATA_PROT_KEY, true)
                cmacCheckSucceeded = true
                log.add(Pair("CMAC enabled", true))
            } catch (e: Exception) {
                try {
                    authenticate(key0, KeyType.DATA_PROT_KEY, false)
                    log.add(Pair("CMAC disabled", false))
                } catch (e: Exception) {
                    log.add(Pair("Authentication failed (unreachable!)", false))
                }
            }

            close()
            connect()
            while (!isConnected) {}

            if (cmacCheckSucceeded) {
                authenticate(key0, KeyType.DATA_PROT_KEY, true)

                try {
                    val conf = cmdRead(0x28u, sessionKey!!, sessionCounter!!, nfcaTag)
                    sessionCounter = (sessionCounter!! + 2u).toUShort()

                    if (conf.gbe(0uL) == 0x01u.toUByte()) {
                        log.add(Pair("Pages 0x10 and 0x11 locked", true))
                    } else {
                        log.add(Pair("Pages 0x10 and 0x11 not locked", false))
                    }

                    if (conf.gbe(4uL) == 0x02u.toUByte()) {
                        log.add(Pair("CMAC enabled", true))
                    } else {
                        log.add(Pair("CMAC disabled (unreachable)", false))
                    }

                    if (conf.gbe(7uL) == 0x10u.toUByte()) {
                        log.add(Pair("Pages after 0x10 protected", true))
                    } else {
                        log.add(Pair("Pages after 0x10 not protected", false))
                    }

                    if (conf.gbe(8uL) == 0xe0u.toUByte()) {
                        log.add(Pair("Keys locked", true))
                    } else {
                        log.add(Pair("Keys not locked", false))
                    }

                    if (conf.gbe(12uL) == 0xc0u.toUByte()) {
                        log.add(Pair("Config locked", true))
                    } else {
                        log.add(Pair("Config not locked", false))
                    }
                } catch (e: Exception) {
                    log.add(Pair("Failed to read config", false))
                }
            } else {
                authenticate(key0, KeyType.DATA_PROT_KEY, false)

                try {
                    val conf = cmdRead(0x28u, nfcaTag)

                    if (conf.gbe(0uL) == 0x01u.toUByte()) {
                        log.add(Pair("Pages 0x10 and 0x11 locked", true))
                    } else {
                        log.add(Pair("Pages 0x10 and 0x11 not locked", false))
                    }

                    if (conf.gbe(4uL) == 0x02u.toUByte()) {
                        log.add(Pair("CMAC enabled", true))
                    } else {
                        log.add(Pair("CMAC disabled (unreachable)", false))
                    }

                    if (conf.gbe(7uL) == 0x10u.toUByte()) {
                        log.add(Pair("Pages after 0x10 protected", true))
                    } else {
                        log.add(Pair("Pages after 0x10 not protected", false))
                    }

                    if (conf.gbe(8uL) == 0xe0u.toUByte()) {
                        log.add(Pair("Keys locked", true))
                    } else {
                        log.add(Pair("Keys not locked", false))
                    }

                    if (conf.gbe(12uL) == 0xc0u.toUByte()) {
                        log.add(Pair("Config locked", true))
                    } else {
                        log.add(Pair("Config not locked", false))
                    }
                } catch (e: Exception) {
                    log.add(Pair("Failed to read config", false))
                }
            }

            close()
            connect()
            while (!isConnected) {}

            try {
                authenticate(key0, KeyType.DATA_PROT_KEY, cmacCheckSucceeded)
                val expected = "StuStaPay - built by SSN & friends!\nglhf ;)\n".toByteArray(Charset.forName("UTF-8")).asBitVector()
                val mem = readUserMemory()
                val sig = mem.slice(mem.len - 44uL * 8uL, mem.len)
                if (sig.equals(expected)) {
                    log.add(Pair("Signature found", true))
                } else {
                    log.add(Pair("Signature invalid", false))
                }

                val secret = mem.slice(mem.len - 56uL * 8uL, mem.len - 48uL * 8uL)
                val check = secret.gle(0uL) or secret.gle(1uL) or secret.gle(2uL) or secret.gle(3uL)
                if (check != 0x00u.toUByte()) {
                    log.add(Pair("Secret ID found", true))
                } else {
                    log.add(Pair("Secret ID not found", false))
                }
            } catch (e: Exception) {
                log.add(Pair("Failed to read user memory", false))
            }

            close()
            connect()
            while (!isConnected) {}

            try {
                authenticate(key1, KeyType.UID_RETR_KEY, cmacCheckSucceeded)
                log.add(Pair("Authenticated using key1", true))
            } catch (e: Exception) {
                log.add(Pair("Authentication using key1 failed", false))
            }
        } else {
            log.add(Pair("Skipping remaining tests due to auth or version check failure", false))
        }

        log.add(Pair("Test completed", true))
    }

    fun setAuth0(page: UByte) {
        if (!isAuthenticated() && (auth0State == null || auth0State!! <= 0x29u)) { throw Exception("Authentication required") }

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
        if (!isAuthenticated() && (auth0State == null || auth0State!! <= 0x29u)) { throw Exception("Authentication required") }

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
        if (!isConnected) { throw Exception("Not connected") }
        if (key.len != 16uL * 8uL) { throw Exception("Wrong key size") }
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
                throw Exception("Key mismatch")
            }
        } catch (e: IOException) {
            throw Exception("Auth failed")
        }

        chipState = type.state

        val cfg0 = if (cmacEnabled) {
            sessionKey = genSessionKey(key, rndA, rndB)
            sessionCounter = 0u
            val ret = cmdRead(0x29u, sessionKey!!, sessionCounter!!, nfcaTag)
            sessionCounter = (sessionCounter!! + 2u).toUShort()
            ret
        } else {
            cmdRead(0x29u, nfcaTag)
        }

        auth0State = cfg0.gbe(3uL)
    }

    fun writeDataProtKey(key: BitVector) {
        if (!isConnected) { throw Exception("Not connected") }
        if (key.len != 16uL * 8uL) { throw Exception("Wrong key size") }
        if (!isAuthenticated() && (auth0State == null || auth0State!! <= 0x29u)) { throw Exception("Authentication required") }

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

    fun writeUserMemory(content: BitVector) {
        if (!isConnected) { throw Exception("Not connected") }
        if (!isAuthenticated() && (auth0State == null || auth0State!! <= (4u + USER_BYTES / 4u))) { throw Exception("Authentication required") }

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
        if (!isConnected) { throw Exception("Not connected") }
        if (!isAuthenticated() && (auth0State == null || auth0State!! <= (4u + USER_BYTES / 4u))) { throw Exception("Authentication required") }

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
        if (!isConnected) { throw Exception("Not connected") }

        val readBuffer = if (sessionKey != null) {
            val ret = cmdRead(0x00u, sessionKey!!, sessionCounter!!, nfcaTag)
            sessionCounter = (sessionCounter!! + 2u).toUShort()
            ret
        } else {
            cmdRead(0x00u, nfcaTag)
        }

        var ser = 0uL
        for (i in 0uL until 7uL) {
            ser = ser or (readBuffer.gbe(i).toULong() shl (i * 8u).toInt())
        }

        return ser
    }

    override fun connect() {
        nfcaTag.connect()

        val resp = cmdGetVersion(nfcaTag)
        if (!(resp.equals(0x00.bv + 0x04.bv + 0x03.bv + 0x01.bv + 0x04.bv + 0x00.bv + 0x0f.bv + 0x03.bv) ||
                    resp.equals(0x00.bv + 0x04.bv + 0x03.bv + 0x02.bv + 0x04.bv + 0x00.bv + 0x0f.bv + 0x03.bv))) {
            throw Exception("Not a Mifare Ultralight AES chip")
        }

        chipState = ChipState.ACTIVE

        auth0State = try {
            cmdRead(0x29u, nfcaTag).gbe(3uL)
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

    enum class KeyType(val code: UByte, val state: ChipState) {
        DATA_PROT_KEY(0x00u, ChipState.AUTHENTICATED),
        UID_RETR_KEY(0x01u, ChipState.TRACEABLE),
        ORIGINALITY_KEY(0x02u, ChipState.ACTIVE)
    }

    enum class ChipState { IDLE, ACTIVE, TRACEABLE, AUTHENTICATED }
}

fun get(tag: Tag): MifareUltralightAES {
    return MifareUltralightAES(tag)
}