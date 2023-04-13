package de.stustanet.stustapay.util

import kotlin.experimental.or
import kotlin.experimental.xor

// Everything is big-endian (v[0] is msb), unless otherwise specified
// Non-byte-aligned data is padded with 0

@OptIn(ExperimentalUnsignedTypes::class)
class BitVector constructor(
    private val v: UByteArray,
    private val l: ULong
) {
    val len: ULong get() { return l }

    constructor(l: ULong): this(
        if (l > 0uL) { UByteArray((((l - 1uL) / 8uL) + 1uL).toInt()) { 0u } } else { UByteArray(0) },
        l
    )

    private fun getBit(i: ULong): Boolean {
        if (i >= l) { throw(ArrayIndexOutOfBoundsException()) }
        val byte = i / 8uL
        val bit = i - byte * 8uL
        return (gle(byte).toInt() shr bit.toInt()) and 1 > 0
    }

    private fun setBit(i: ULong, b: Boolean) {
        if (i >= l) { throw(ArrayIndexOutOfBoundsException()) }
        val byte = i / 8uL
        val bit = i - byte * 8uL
        if (b) {
            sle(byte, (gle(byte).toInt() or (1 shl bit.toInt())).toUByte())
        } else {
            sle(byte, (gle(byte).toInt() and (1 shl bit.toInt()).inv()).toUByte())
        }
    }

    fun gbe(i: ULong): UByte {
        if (i >= ((l - 1u) / 8u) + 1u) { throw(ArrayIndexOutOfBoundsException()) }
        return v[i.toInt()]
    }

    fun sbe(i: ULong, b: UByte) {
        if (i >= ((l - 1u) / 8u) + 1u) { throw(ArrayIndexOutOfBoundsException()) }
        v[i.toInt()] = b
    }

    fun gle(i: ULong): UByte {
        return gbe((((l - 1u) / 8u) + 1u) - 1uL - i)
    }

    fun sle(i: ULong, b: UByte) {
        sbe((((l - 1u) / 8u) + 1u) - 1uL - i, b)
    }

    fun lsb(): Boolean {
        return this[0u]
    }

    fun msb(): Boolean {
        return this[l - 1u]
    }

    fun asByteArray(): ByteArray {
        return v.asByteArray()
    }

    fun equals(o: BitVector): Boolean {
        return v.contentEquals(o.v)
    }

    fun cat(o: BitVector): BitVector {
        val ret = BitVector(l + o.l)

        for (i in 0uL until o.l) {
            ret[i] = o[i]
        }
        for (i in 0uL until l) {
            ret[i + o.l] = this[i]
        }

        return ret
    }

    fun slice(a: ULong, b: ULong): BitVector {
        if (a > l) { throw(ArrayIndexOutOfBoundsException()) }
        if (b > l) { throw(ArrayIndexOutOfBoundsException()) }
        if (b.toLong() - a.toLong() < 0) { throw(IllegalArgumentException()) }

        return if (a == b) {
            BitVector(0uL)
        } else {
            val ret = BitVector(b - a)
            for (i in 0uL until b - a) {
                ret[i] = this[a + i]
            }
            ret
        }
    }

    fun rotl(n: ULong): BitVector {
        val ret = BitVector(l)

        for (i in 0uL until l) {
            ret[(i + n) % l] = this[i]
        }

        return ret
    }

    fun shl(n: ULong): BitVector {
        val ret = BitVector(l)

        for (i in 0uL until l - n) {
            ret[i + n] = this[i]
        }

        return ret
    }

    fun xor(o: BitVector): BitVector {
        if (l != o.l) { throw IllegalArgumentException() }

        val ret = BitVector(l)

        for (i in 0uL until ((l - 1u) / 8u) + 1u) {
            ret.sbe(i, this.gbe(i) xor o.gbe(i))
        }

        return ret
    }

    fun print() {
        for (i in 0uL until len) {
            if (this[len - 1uL - i]) {
                print("1")
            } else {
                print("0")
            }
        }
        println()
    }

    fun asByteString(): String {
        var ret = ""
        val hexChar = "0123456789abcdef"
        for (i in 0uL until len / 8uL) {
            val b = this.gbe(i)
            val l = b.toInt() and 0x0f
            val h = (b.toInt() shr 4) and 0x0f
            ret += hexChar[h]
            ret += hexChar[l]
        }
        return ret
    }

    fun printBytes() {
        println(this.asByteString())
    }

    operator fun get(i: ULong): Boolean {
        return getBit(i)
    }

    operator fun set(i: ULong, b: Boolean) {
        setBit(i, b)
    }

    operator fun plus(o: BitVector): BitVector {
        return cat(o)
    }

    operator fun plus(o: ByteArray): BitVector {
        return cat(o.asBitVector())
    }
}

fun ByteArray.asBitVector(): BitVector {
    val ret = BitVector(this.size.toULong() * 8uL)
    for (i in indices) {
        ret.sle(i.toULong(), this[this.size - 1 - i].toUByte())
    }
    return ret
}

val UByte.bv: BitVector
    get() {
        val ret = BitVector(8uL)
        ret.sle(0uL, this)
        return ret
    }

val Byte.bv: BitVector
    get() {
        return this.toUByte().bv
    }

val UShort.bv: BitVector
    get() {
        return this.toUByte().bv
    }

val Short.bv: BitVector
    get() {
        return this.toUByte().bv
    }

val Int.bv: BitVector
    get() {
        return this.toUByte().bv
    }

val UInt.bv: BitVector
    get() {
        return this.toUByte().bv
    }

val Long.bv: BitVector
    get() {
        return this.toUByte().bv
    }

val ULong.bv: BitVector
    get() {
        return this.toUByte().bv
    }