package com.madrasati.app.data.model

import kotlinx.serialization.KSerializer
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonEncoder
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonPrimitive

/**
 * Decodes a JSON value that the backend may emit as either a JSON number or a
 * numeric string (PostgreSQL NUMERIC columns are returned as strings by `pg`).
 * Also accepts JSON null and coerces it to Kotlin null.
 */
object FlexDoubleSerializer : KSerializer<Double?> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("FlexDouble", PrimitiveKind.DOUBLE)

    override fun deserialize(decoder: Decoder): Double? {
        val element = (decoder as JsonDecoder).decodeJsonElement()
        if (element is JsonNull) return null
        val primitive = element as? JsonPrimitive ?: return null
        val raw = primitive.jsonPrimitive.content.trim()
        return raw.toDoubleOrNull()
    }

    override fun serialize(encoder: Encoder, value: Double?) {
        if (value == null) {
            (encoder as JsonEncoder).encodeJsonElement(JsonNull)
        } else {
            encoder.encodeDouble(value)
        }
    }
}

/**
 * Decodes a JSON value that may arrive as a number or a numeric string into an
 * [Int]. Useful for INTEGER/BIGINT columns (bigint count(*) is a string).
 */
object FlexIntSerializer : KSerializer<Int?> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("FlexInt", PrimitiveKind.INT)

    override fun deserialize(decoder: Decoder): Int? {
        val element = (decoder as JsonDecoder).decodeJsonElement()
        if (element is JsonNull) return null
        val primitive = element as? JsonPrimitive ?: return null
        val raw = primitive.jsonPrimitive.content.trim()
        return raw.toDoubleOrNull()?.toInt()
    }

    override fun serialize(encoder: Encoder, value: Int?) {
        if (value == null) {
            (encoder as JsonEncoder).encodeJsonElement(JsonNull)
        } else {
            encoder.encodeInt(value)
        }
    }
}
