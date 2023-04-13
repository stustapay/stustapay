package de.stustanet.stustapay.nfc

import de.stustanet.stustapay.util.*
import java.nio.charset.Charset
import java.security.SecureRandom

fun MifareUltralightAES.test(log: MutableList<Pair<String, Boolean>>) {
    var key0 = 0x00.bv + 0x01.bv + 0x02.bv + 0x03.bv + 0x04.bv + 0x05.bv + 0x06.bv + 0x07.bv +
            0x08.bv + 0x09.bv + 0x0a.bv + 0x0b.bv + 0x0c.bv + 0x0d.bv + 0x0e.bv + 0x0f.bv
    var key1 = 0x00.bv + 0x01.bv + 0x02.bv + 0x03.bv + 0x04.bv + 0x05.bv + 0x06.bv + 0x07.bv +
            0x08.bv + 0x09.bv + 0x0a.bv + 0x0b.bv + 0x0c.bv + 0x0d.bv + 0x0e.bv + 0x0f.bv

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

        log.add(Pair("rndA: " + rndA.asByteString(), true))

        val ekRndB = cmdAuthenticate1(0x00u, nfcaTag)
        rndB = ekRndB.aesDecrypt(key0)

        log.add(Pair("ekRndB: " + ekRndB.asByteString(), true))
        log.add(Pair("rndB: " + rndB.asByteString(), true))

        val rndAB = rndA + rndB.rotl(8uL)
        val ekRndAB = rndAB.aesEncrypt(key0)

        log.add(Pair("rndAB: " + rndAB.asByteString(), true))
        log.add(Pair("ekRndAB: " + ekRndAB.asByteString(), true))

        val ekRndA = cmdAuthenticate2(ekRndAB, nfcaTag)
        val rndAResp = ekRndA.aesDecrypt(key0)

        log.add(Pair("ekRndA: " + ekRndA.asByteString(), true))
        log.add(Pair("rndAResp: " + rndAResp.asByteString(), true))

        if (rndAResp.equals(rndA.rotl(8uL))) {
            log.add(Pair("Authenticated using key0", true))
            key0AuthSucceeded = true
        } else {
            log.add(Pair("Authentication using key0 failed", false))
            log.add(Pair("key: " + key0.asByteString(), false))
        }
    } catch (e: Exception) {
        log.add(Pair("Authentication using key0 failed", false))
        log.add(Pair("key: " + key0.asByteString(), false))
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

            log.add(Pair("rndA: " + rndA.asByteString(), true))

            val ekRndB = cmdAuthenticate1(0x00u, nfcaTag)
            rndB = ekRndB.aesDecrypt(testKey)

            log.add(Pair("ekRndB: " + ekRndB.asByteString(), true))
            log.add(Pair("rndB: " + rndB.asByteString(), true))

            val rndAB = rndA + rndB.rotl(8uL)
            val ekRndAB = rndAB.aesEncrypt(testKey)

            log.add(Pair("rndAB: " + rndAB.asByteString(), true))
            log.add(Pair("ekRndAB: " + ekRndAB.asByteString(), true))

            val ekRndA = cmdAuthenticate2(ekRndAB, nfcaTag)
            val rndAResp = ekRndA.aesDecrypt(testKey)

            log.add(Pair("ekRndA: " + ekRndA.asByteString(), true))
            log.add(Pair("rndAResp: " + rndAResp.asByteString(), true))

            if (rndAResp.equals(rndA.rotl(8uL))) {
                log.add(Pair("Authenticated using outer reversed key0", true))
                key0AuthSucceeded = true
                keyOuterReversed = true
            } else {
                log.add(Pair("Authentication using outer reversed key0 also failed", false))
                log.add(Pair("key: " + testKey.asByteString(), false))
            }
        } catch (e: Exception) {
            log.add(Pair("Authentication using outer reversed key0 also failed", false))
            log.add(Pair("key: " + testKey.asByteString(), false))
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

            log.add(Pair("rndA: " + rndA.asByteString(), true))

            val ekRndB = cmdAuthenticate1(0x00u, nfcaTag)
            rndB = ekRndB.aesDecrypt(testKey)

            log.add(Pair("ekRndB: " + ekRndB.asByteString(), true))
            log.add(Pair("rndB: " + rndB.asByteString(), true))

            val rndAB = rndA + rndB.rotl(8uL)
            val ekRndAB = rndAB.aesEncrypt(testKey)

            log.add(Pair("rndAB: " + rndAB.asByteString(), true))
            log.add(Pair("ekRndAB: " + ekRndAB.asByteString(), true))

            val ekRndA = cmdAuthenticate2(ekRndAB, nfcaTag)
            val rndAResp = ekRndA.aesDecrypt(testKey)

            log.add(Pair("ekRndA: " + ekRndA.asByteString(), true))
            log.add(Pair("rndAResp: " + rndAResp.asByteString(), true))

            if (rndAResp.equals(rndA.rotl(8uL))) {
                log.add(Pair("Authenticated using inner reversed key0", true))
                key0AuthSucceeded = true
                keyInnerReversed = true
            } else {
                log.add(Pair("Authentication using inner reversed key0 also failed", false))
                log.add(Pair("key: " + testKey.asByteString(), false))
            }
        } catch (e: Exception) {
            log.add(Pair("Authentication using inner reversed key0 also failed", false))
            log.add(Pair("key: " + testKey.asByteString(), false))
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

            log.add(Pair("rndA: " + rndA.asByteString(), true))

            val ekRndB = cmdAuthenticate1(0x00u, nfcaTag)
            rndB = ekRndB.aesDecrypt(testKey)

            log.add(Pair("ekRndB: " + ekRndB.asByteString(), true))
            log.add(Pair("rndB: " + rndB.asByteString(), true))

            val rndAB = rndA + rndB.rotl(8uL)
            val ekRndAB = rndAB.aesEncrypt(testKey)

            log.add(Pair("rndAB: " + rndAB.asByteString(), true))
            log.add(Pair("ekRndAB: " + ekRndAB.asByteString(), true))

            val ekRndA = cmdAuthenticate2(ekRndAB, nfcaTag)
            val rndAResp = ekRndA.aesDecrypt(testKey)

            log.add(Pair("ekRndA: " + ekRndA.asByteString(), true))
            log.add(Pair("rndAResp: " + rndAResp.asByteString(), true))

            if (rndAResp.equals(rndA.rotl(8uL))) {
                log.add(Pair("Authenticated using double reversed key0", true))
                key0AuthSucceeded = true
                keyOuterReversed = true
                keyInnerReversed = true
            } else {
                log.add(Pair("Authentication using double reversed key0 also failed", false))
                log.add(Pair("key: " + testKey.asByteString(), false))
            }
        } catch (e: Exception) {
            log.add(Pair("Authentication using double reversed key0 also failed", false))
            log.add(Pair("key: " + testKey.asByteString(), false))
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
            authenticate(key0, MifareUltralightAES.KeyType.DATA_PROT_KEY, true)
            cmacCheckSucceeded = true
            log.add(Pair("CMAC enabled", true))
        } catch (e: Exception) {
            try {
                authenticate(key0, MifareUltralightAES.KeyType.DATA_PROT_KEY, false)
                log.add(Pair("CMAC disabled", false))
            } catch (e: Exception) {
                log.add(Pair("Authentication failed (unreachable!)", false))
            }
        }

        close()
        connect()
        while (!isConnected) {}

        try {
            val conf = if (cmacCheckSucceeded) {
                authenticate(key0, MifareUltralightAES.KeyType.DATA_PROT_KEY, true)
                val conf = cmdRead(0x28u, sessionKey!!, sessionCounter!!, nfcaTag)
                sessionCounter = (sessionCounter!! + 2u).toUShort()
                conf
            } else {
                authenticate(key0, MifareUltralightAES.KeyType.DATA_PROT_KEY, false)
                cmdRead(0x28u, nfcaTag)
            }

            var confCheckSuccessful = true

            if (conf.gbe(0uL) == 0x01u.toUByte()) {
                log.add(Pair("Pages 0x10 and 0x11 locked", true))
            } else {
                confCheckSuccessful = false
                log.add(Pair("Pages 0x10 and 0x11 not locked", false))
            }

            if (conf.gbe(4uL) == 0x02u.toUByte()) {
                log.add(Pair("CMAC enabled", true))
            } else {
                confCheckSuccessful = false
                log.add(Pair("CMAC disabled (unreachable)", false))
            }

            if (conf.gbe(7uL) == 0x10u.toUByte()) {
                log.add(Pair("Pages after 0x10 protected", true))
            } else {
                confCheckSuccessful = false
                log.add(Pair("Pages after 0x10 not protected", false))
            }

            if (conf.gbe(8uL) == 0xe0u.toUByte()) {
                log.add(Pair("Keys locked", true))
            } else {
                confCheckSuccessful = false
                log.add(Pair("Keys not locked", false))
            }

            if (conf.gbe(12uL) == 0xc0u.toUByte()) {
                log.add(Pair("Config locked", true))
            } else {
                confCheckSuccessful = false
                log.add(Pair("Config not locked", false))
            }

            if (!confCheckSuccessful) {
                log.add(Pair("Config pages:", false))
                log.add(Pair("28: " + conf.slice(8uL * 12uL, 8uL * 16uL).asByteString(), false))
                log.add(Pair("29: " + conf.slice(8uL * 8uL, 8uL * 12uL).asByteString(), false))
                log.add(Pair("2a: " + conf.slice(8uL * 4uL, 8uL * 8uL).asByteString(), false))
                log.add(Pair("2b: " + conf.slice(0uL, 8uL * 4uL).asByteString(), false))
            }
        } catch (e: Exception) {
            log.add(Pair("Failed to read config", false))
        }

        close()
        connect()
        while (!isConnected) {}

        try {
            authenticate(key0, MifareUltralightAES.KeyType.DATA_PROT_KEY, cmacCheckSucceeded)
            val expected = "StuStaPay - built by SSN & friends!\nglhf ;)\n".toByteArray(Charset.forName("UTF-8")).asBitVector()
            val mem = readUserMemory()
            val sig = mem.slice(mem.len - 44uL * 8uL, mem.len)
            if (sig.equals(expected)) {
                log.add(Pair("Signature found", true))
            } else {
                log.add(Pair("Signature invalid", false))
                log.add(Pair("sig: " + sig.asByteString(), false))
            }

            val secret = mem.slice(mem.len - 56uL * 8uL, mem.len - 48uL * 8uL)
            val check = secret.gle(0uL) or secret.gle(1uL) or secret.gle(2uL) or secret.gle(3uL) or secret.gle(4uL) or secret.gle(5uL) or secret.gle(6uL) or secret.gle(7uL)
            if (check != 0x00u.toUByte()) {
                log.add(Pair("Secret ID found", true))
                log.add(Pair("secret: " + secret.asByteString(), true))
            } else {
                log.add(Pair("Secret ID not found", false))
                log.add(Pair("secret: " + secret.asByteString(), false))
            }
        } catch (e: Exception) {
            log.add(Pair("Failed to read user memory", false))
        }

        close()
        connect()
        while (!isConnected) {}

        try {
            authenticate(key1, MifareUltralightAES.KeyType.UID_RETR_KEY, cmacCheckSucceeded)
            log.add(Pair("Authenticated using key1", true))
        } catch (e: Exception) {
            log.add(Pair("Authentication using key1 failed", false))
            e.printStackTrace()
        }
    } else {
        log.add(Pair("Skipping remaining tests due to auth or version check failure", false))
    }

    log.add(Pair("Test completed", true))
}