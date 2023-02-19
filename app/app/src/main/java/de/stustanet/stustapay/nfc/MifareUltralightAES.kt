package de.stustanet.stustapay.nfc

import android.nfc.Tag
import android.nfc.tech.NfcA
import android.nfc.tech.TagTechnology
import java.io.IOException
import java.lang.reflect.Executable
import java.nio.charset.Charset
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

const val PAGE_COUNT = 60
const val USER_BYTES = 144

class MifareUltralightAES(rawTag: Tag) : TagTechnology {
    var rawTag = rawTag
    var nfcaTag = NfcA.get(rawTag)

    fun protect(prot: Boolean) {
        if (prot) {
            val buf = cmdRead(0x29.toByte())
            cmdWrite(0x29, buf[0], buf[1], buf[2], 0x00)
        } else {
            val buf = cmdRead(0x29.toByte())
            cmdWrite(0x29, buf[0], buf[1], buf[2], 0x3c)
        }
    }

    fun isProtected(): Boolean {
        val buf = cmdRead(0x29.toByte())
        return buf[3] == 0x00.toByte()
    }

    fun authenticate(key: ByteArray) {
        if (!isConnected) { throw Exception("Not connected") }
        if (key.size != 16) { throw Exception("Wrong key size") }

        val cipherKey = SecretKeySpec(key, "AES")
        val cipher = Cipher.getInstance("AES/CBC/NoPadding")
        val iv = ByteArray(16) { i -> 0 }

        val rndA = ByteArray(16)
        SecureRandom().nextBytes(rndA)

        try {
            val ekRndB = cmdAuthenticate1()
            cipher.init(Cipher.DECRYPT_MODE, cipherKey, IvParameterSpec(iv))
            val rndB: ByteArray = cipher.doFinal(ekRndB)

            var rndAB = rndA + rndB.clone().takeLast(15) + rndB[0]
            cipher.init(Cipher.ENCRYPT_MODE, cipherKey, IvParameterSpec(iv))
            val ekRndAB: ByteArray = cipher.doFinal(rndAB)

            val ekRndA = cmdAuthenticate2(ekRndAB)
            cipher.init(Cipher.DECRYPT_MODE, cipherKey, IvParameterSpec(iv))
            val rndAResp: ByteArray = cipher.doFinal(ekRndA)

            if (!(rndAResp.clone().takeLast(1) + rndAResp.clone().take(15)).toByteArray().contentEquals(rndA)) {
                throw Exception("Auth failed")
            }
        } catch (e: IOException) {
            throw Exception("Auth failed")
        }
    }

    fun writeKey(key: ByteArray) {
        if (!isConnected) { throw Exception("Not connected") }
        if (key.size != 16) { throw Exception("Wrong key size") }

        for (i in 0 until 4) {
            cmdWrite((i + 0x30).toByte(), key[15 - (i * 4)], key[15 - (i * 4 + 1)], key[15 - (i * 4 + 2)], key[15 - (i * 4 + 3)])
        }
    }

    fun writeUserMemory(content: String) {
        if (!isConnected) { throw Exception("Not connected") }

        val data = content.toByteArray(Charset.forName("UTF-8"))
        val writeBuffer = ByteArray(USER_BYTES)
        for (i in 0 until USER_BYTES) {
            if (i < data.size) {
                writeBuffer[i] = data[i]
            } else {
                writeBuffer[i] = 0x00
            }
        }

        for (i in 0 until (USER_BYTES / 4)) {
            cmdWrite((i + 4).toByte(), writeBuffer[i * 4], writeBuffer[i * 4 + 1], writeBuffer[i * 4 + 2], writeBuffer[i * 4 + 3])
        }
    }

    fun readUserMemory(): String {
        if (!isConnected) { throw Exception("Not connected") }

        val readBuffer = ByteArray(USER_BYTES)
        for (i in 0 until (USER_BYTES / 16)) {
            val resp = cmdRead((i * 4 + 4).toByte())
            for (j in 0 until 16) {
                readBuffer[i * 16 + j] = resp[j]
            }
        }

        readBuffer.dropLastWhile { it == 0.toByte() }

        return readBuffer.decodeToString()
    }

    fun readSerialNumber(): ULong {
        if (!isConnected) { throw Exception("Not connected") }

        val readBuffer = cmdRead(0x00.toByte())
        var ser = 0uL
        for (i in 0 until 7) {
            ser = ser or (readBuffer[i].toULong() shl (i * 8))
        }

        return ser
    }

    override fun connect() {
        nfcaTag.connect()

        var resp = cmdGetVersion()
        val vendorID = resp[1]
        val productType = resp[2]
        val productSubType = resp[3]
        val majorVer = resp[4]
        val minorVer = resp[5]
        val storageSize = resp[6]
        val protocolType = resp[7]
        if (!(vendorID == 0x04.toByte() && productType == 0x03.toByte() && (productSubType == 0x01.toByte() || productSubType == 0x02.toByte()) && majorVer == 0x04.toByte())) {
            throw Exception("Not a MF-UL-AES chip")
        }
    }

    override fun close() {
        nfcaTag.close()
    }

    override fun isConnected(): Boolean {
        return nfcaTag.isConnected
    }

    override fun getTag(): Tag {
        return tag
    }

    fun cmdGetVersion(): ByteArray {
        var cmd = ByteArray(1)
        cmd[0] = 0x60
        return nfcaTag.transceive(cmd)
    }

    fun cmdRead(page: Byte): ByteArray {
        var cmd = ByteArray(2)
        cmd[0] = 0x30
        cmd[1] = page
        return nfcaTag.transceive(cmd)
    }

    fun cmdWrite(page: Byte, a: Byte, b: Byte, c: Byte, d: Byte) {
        var cmd = ByteArray(6)
        cmd[0] = 0xa2.toByte()
        cmd[1] = page
        cmd[2] = a
        cmd[3] = b
        cmd[4] = c
        cmd[5] = d
        nfcaTag.transceive(cmd)
    }

    fun cmdAuthenticate1(): ByteArray {
        var cmd = ByteArray(2)
        cmd[0] = 0x1a
        cmd[1] = 0x00
        val resp = nfcaTag.transceive(cmd)
        return resp.drop(1).toByteArray()
    }

    fun cmdAuthenticate2(challenge: ByteArray): ByteArray {
        var cmd = ByteArray(33)
        cmd[0] = 0xaf.toByte()
        for (i in 0 until 32) {
            cmd[i + 1] = challenge[i]
        }
        val resp = nfcaTag.transceive(cmd)
        return resp.drop(1).toByteArray()
    }
}

fun get(tag: Tag): MifareUltralightAES {
    return MifareUltralightAES(tag)
}