package de.stustapay.libssp.nfc

import java.io.IOException

class TagTransientException(msg: String, cause: Throwable? = null) : IOException(msg, cause)
