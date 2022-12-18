package de.stustanet.stustapay.nfc

import android.nfc.Tag
import android.nfc.tech.NfcA
import java.nio.charset.Charset
import android.nfc.tech.MifareUltralight as MFUL

class MifareUltralight(rawTag: Tag) {

    var rawTag = rawTag
    var tag: MFUL = MFUL.get(rawTag)!!
    var nfcatag: NfcA = NfcA.get(rawTag)!!

    fun write(tagText: String) {
        tag.use { ultralight ->
            ultralight.connect()
            var utf8 = Charset.forName("UTF-8")

            // TODO write useful stuff...
            ultralight.writePage(1337, tagText.toByteArray(utf8))
        }
    }

    fun read(offset : Int): String? {
        return tag.use { mifare ->
            mifare.connect()

            // TODO read useful Stuff
            val payload = mifare.readPages(offset)
            String(payload, Charset.forName("UTF-8"))
        }
    }
}