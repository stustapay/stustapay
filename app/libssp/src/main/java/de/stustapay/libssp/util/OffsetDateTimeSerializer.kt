package de.stustapay.libssp.util

import kotlinx.serialization.KSerializer
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.modules.SerializersModule
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

val offsetDateTimeSerializerModule = SerializersModule {
    contextual(OffsetDateTime::class, OffsetDateTimeSerializer)
}

object OffsetDateTimeSerializer : KSerializer<OffsetDateTime> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("OffsetDateTime", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: OffsetDateTime) {
        encoder.encodeString(value.format(DateTimeFormatter.ISO_OFFSET_DATE))
    }

    override fun deserialize(decoder: Decoder): OffsetDateTime {
        return OffsetDateTime.parse(decoder.decodeString())
    }
}