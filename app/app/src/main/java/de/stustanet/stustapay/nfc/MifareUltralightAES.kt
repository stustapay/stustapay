package de.stustanet.stustapay.nfc

import android.nfc.Tag
import android.nfc.tech.NfcA
import android.nfc.tech.TagTechnology
import java.io.IOException
import java.lang.reflect.Executable
import java.nio.charset.Charset

const val PAGE_COUNT = 60
const val USER_BYTES = 144

class MifareUltralightAES(rawTag: Tag) : TagTechnology {
    var rawTag = rawTag
    var nfcaTag = NfcA.get(rawTag)

    fun writeUserMemory(content: String) {
        if (!isConnected) {
            throw Exception("Not connected")
        }

        val data = content.toByteArray(Charset.forName("UTF-8"))
        val write_buffer = ByteArray(USER_BYTES)
        for (i in 0 until USER_BYTES) {
            if (i < data.size) {
                write_buffer[i] = data[i]
            } else {
                write_buffer[i] = 0x00
            }
        }

        for (i in 0 until (USER_BYTES / 4)) {
            cmdWrite((i + 4).toByte(), write_buffer[i * 4], write_buffer[i * 4 + 1], write_buffer[i * 4 + 2], write_buffer[i * 4 + 3])
        }
    }

    fun readUserMemory(): String {
        if (!isConnected) {
            throw Exception("Not connected")
        }

        val readBuffer = ByteArray(USER_BYTES)
        for (i in 0 until (USER_BYTES / 16)) {
            val resp = cmdRead((i * 4 + 4).toByte())
            for (j in 0 until 16) {
                readBuffer[i * 16 + j] = resp[j]
            }
        }

        return readBuffer.decodeToString()
    }

    fun readSerialNumber(): ULong {
        if (!isConnected) {
            throw Exception("Not connected")
        }

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
}

fun get(tag: Tag): MifareUltralightAES {
    return MifareUltralightAES(tag)
}