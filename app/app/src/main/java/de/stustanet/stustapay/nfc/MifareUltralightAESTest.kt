package de.stustanet.stustapay.nfc

import de.stustanet.stustapay.util.*
import java.nio.charset.Charset
import java.security.SecureRandom

fun MifareUltralightAES.test(constKey0: BitVector, constKey1: BitVector): MutableList<Pair<String, Boolean>> {
    val log: MutableList<Pair<String, Boolean>> = MutableList(0) { Pair("", true) }
    var key0 = constKey0
    var key1 = constKey1

    log.add(Pair("main: started", true))

    nfcaTag.connect()
    while (!nfcaTag.isConnected) {}

    var verCheckSucceeded = false
    try {
        val ver = cmdGetVersion(nfcaTag)
        if (ver.equals(0x00.bv + 0x04.bv + 0x03.bv + 0x01.bv + 0x04.bv + 0x00.bv + 0x0f.bv + 0x03.bv) ||
            ver.equals(0x00.bv + 0x04.bv + 0x03.bv + 0x02.bv + 0x04.bv + 0x00.bv + 0x0f.bv + 0x03.bv)) {
            log.add(Pair("tag_type: mifare ultralight aes tag detected", true))
            verCheckSucceeded = true
        } else {
            log.add(Pair("tag_type: other nfc tag detected", false))
        }
    } catch (e: Exception) {
        log.add(Pair("tag_type: checking tag type failed (retry scan)", false))
    }

    nfcaTag.close()
    nfcaTag.connect()
    while (!nfcaTag.isConnected) {}

    var key0AuthSucceeded = testKey(key0, log)

    if (!key0AuthSucceeded) {
        nfcaTag.close()
        nfcaTag.connect()
        while (!nfcaTag.isConnected) {}

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

        key0AuthSucceeded = testKey(key0, log)
    }

    if (!key0AuthSucceeded) {
        nfcaTag.close()
        nfcaTag.connect()
        while (!nfcaTag.isConnected) {}

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

        key0AuthSucceeded = testKey(key0, log)
    }

    if (!key0AuthSucceeded) {
        nfcaTag.close()
        nfcaTag.connect()
        while (!nfcaTag.isConnected) {}

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

        key0AuthSucceeded = testKey(key0, log)
    }

    if (verCheckSucceeded && key0AuthSucceeded) {
        nfcaTag.close()
        connect()
        while (!isConnected) {}

        var cmacCheckSucceeded = false
        try {
            authenticate(key0, MifareUltralightAES.KeyType.DATA_PROT_KEY, true)
            cmacCheckSucceeded = true
            log.add(Pair("cmac: auth with cmac succeeded", true))
        } catch (e: Exception) {
            try {
                close()
                connect()
                while (!isConnected) {}

                authenticate(key0, MifareUltralightAES.KeyType.DATA_PROT_KEY, false)
                log.add(Pair("cmac: auth without cmac succeeded", false))
            } catch (e: Exception) {
                log.add(Pair("cmac: auth with and without cmac failed (retry scan)", false))
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

            val keyLock = if (cmacCheckSucceeded) {
                val keyLock = cmdRead(0x2du, sessionKey!!, sessionCounter!!, nfcaTag)
                sessionCounter = (sessionCounter!! + 2u).toUShort()
                keyLock
            } else {
                authenticate(key0, MifareUltralightAES.KeyType.DATA_PROT_KEY, false)
                cmdRead(0x2du, nfcaTag)
            }

            var confCheckSuccessful = true

            if (conf.gbe(0uL) == 0x01u.toUByte()) {
                log.add(Pair("cfg: pages 0x10 and 0x11 locked", true))
            } else {
                confCheckSuccessful = false
                log.add(Pair("cfg: pages 0x10 and 0x11 not locked", false))
            }

            if (conf.gbe(4uL) == 0x02u.toUByte()) {
                log.add(Pair("cfg: cmac enabled", true))
            } else {
                confCheckSuccessful = false
                log.add(Pair("cfg: cmac disabled", false))
            }

            if (conf.gbe(7uL) == 0x10u.toUByte()) {
                log.add(Pair("cfg: pages after 0x10 protected", true))
            } else {
                confCheckSuccessful = false
                log.add(Pair("cfg: pages after 0x10 not protected", false))
            }

            if (keyLock.gbe(0uL) == 0xe0u.toUByte()) {
                log.add(Pair("cfg: keys locked", true))
            } else {
                confCheckSuccessful = false
                log.add(Pair("cfg: keys not locked", false))
            }

            if (conf.gbe(8uL) == 0xc0u.toUByte()) {
                log.add(Pair("cfg: config locked", true))
            } else {
                confCheckSuccessful = false
                log.add(Pair("cfg: config not locked", false))
            }

            if (!confCheckSuccessful) {
                log.add(Pair("cfg: config page content:", false))
                log.add(Pair("cfg: 28: " + conf.slice(8uL * 12uL, 8uL * 16uL).asByteString(), false))
                log.add(Pair("cfg: 29: " + conf.slice(8uL * 8uL, 8uL * 12uL).asByteString(), false))
                log.add(Pair("cfg: 2a: " + conf.slice(8uL * 4uL, 8uL * 8uL).asByteString(), false))
                log.add(Pair("cfg: 2d: " + keyLock.slice(8uL * 12uL, 8uL * 16uL).asByteString(), false))
            }
        } catch (e: Exception) {
            log.add(Pair("cfg: failed to read config (retry scan)", false))
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
                log.add(Pair("sig: found valid signature", true))
            } else {
                log.add(Pair("sig: wrong signature ", false))
                log.add(Pair("sig: signature is " + sig.asByteString(), false))
            }

            val secret = mem.slice(mem.len - 56uL * 8uL, mem.len - 48uL * 8uL)
            val check = secret.gle(0uL) or secret.gle(1uL) or secret.gle(2uL) or secret.gle(3uL) or secret.gle(4uL) or secret.gle(5uL) or secret.gle(6uL) or secret.gle(7uL)
            if (check != 0x00u.toUByte()) {
                log.add(Pair("secret: random id found", true))
                log.add(Pair("secret: id is " + secret.asByteString(), true))
            } else {
                log.add(Pair("secret: no random id", false))
                log.add(Pair("secret: id is " + secret.asByteString(), false))
            }
        } catch (e: Exception) {
            log.add(Pair("main: failed to read user memory (retry scan)", false))
        }

        close()
        connect()
        while (!isConnected) {}

        try {
            authenticate(key1, MifareUltralightAES.KeyType.UID_RETR_KEY, cmacCheckSucceeded)
            log.add(Pair("key1_auth: succeeded", true))
        } catch (e: Exception) {
            log.add(Pair("key1_auth: failed", false))
            e.printStackTrace()
        }
    } else {
        log.add(Pair("main: skipping remaining tests due to auth or tag type check failure", false))
    }

    log.add(Pair("main: completed", true))

    return log
}

private fun MifareUltralightAES.testKey(key: BitVector, log: MutableList<Pair<String, Boolean>>): Boolean {
    val nonce = ByteArray(16)
    SecureRandom().nextBytes(nonce)

    val rndA = nonce.asBitVector()
    val rndB: BitVector
    val ekRndB: BitVector

    try {
        ekRndB = cmdAuthenticate1(0x00u, nfcaTag)
        rndB = ekRndB.aesDecrypt(key)
    } catch (e: Exception) {
        log.add(Pair("key0_auth: failed at step 1 (retry scan)", false))
        log.add(Pair("key0_auth: tried key " + key.asByteString(), false))
        log.add(Pair("key0_auth: rndA was " + rndA.asByteString(), true))
        return false
    }

    val rndAB: BitVector = rndA + rndB.rotl(8uL)
    val ekRndAB: BitVector = rndAB.aesEncrypt(key)
    val ekRndA: BitVector
    val rndAResp: BitVector

    try {
        ekRndA = cmdAuthenticate2(ekRndAB, nfcaTag)
        rndAResp = ekRndA.aesDecrypt(key)
    } catch (e: Exception) {
        log.add(Pair("key0_auth: failed at step 2", false))
        log.add(Pair("key0_auth: tried key " + key.asByteString(), false))
        log.add(Pair("key0_auth: rndA was " + rndA.asByteString(), true))
        log.add(Pair("key0_auth: ekRndB was " + ekRndB.asByteString(), true))
        log.add(Pair("key0_auth: rndB was " + rndB.asByteString(), true))
        log.add(Pair("key0_auth: rndAB was " + rndAB.asByteString(), true))
        log.add(Pair("key0_auth: ekRndAB was " + ekRndAB.asByteString(), true))
        return false
    }

    return if (rndAResp.equals(rndA.rotl(8uL))) {
        log.add(Pair("key0_auth: succeeded", true))
        log.add(Pair("key0_auth: used key " + key.asByteString(), true))
        true
    } else {
        log.add(Pair("key0_auth: failed at final check", false))
        log.add(Pair("key0_auth: tried key " + key.asByteString(), false))
        log.add(Pair("key0_auth: rndA was " + rndA.asByteString(), true))
        log.add(Pair("key0_auth: ekRndB was " + ekRndB.asByteString(), true))
        log.add(Pair("key0_auth: rndB was " + rndB.asByteString(), true))
        log.add(Pair("key0_auth: rndAB was " + rndAB.asByteString(), true))
        log.add(Pair("key0_auth: ekRndAB was " + ekRndAB.asByteString(), true))
        log.add(Pair("key0_auth: ekRndA was " + ekRndA.asByteString(), true))
        log.add(Pair("key0_auth: rndAResp was " + rndAResp.asByteString(), true))
        false
    }
}