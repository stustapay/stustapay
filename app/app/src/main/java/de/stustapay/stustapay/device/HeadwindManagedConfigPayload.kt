package de.stustapay.stustapay.device

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

data class ManagedWifiConfig(
    val ssid: String,
    val passphrase: String,
)

data class ParsedHeadwindCustom3(
    val terminalName: String?,
    val wifiConfig: ManagedWifiConfig? = null,
)

@Serializable
private data class HeadwindManagedConfigPayload(
    val terminal_name: String? = null,
    val wifi_ssid: String? = null,
    val wifi_passphrase: String? = null,
)

private val headwindJson = Json {
    ignoreUnknownKeys = true
}

fun parseHeadwindCustom3(rawValue: String?): ParsedHeadwindCustom3 {
    if (rawValue.isNullOrBlank()) {
        return ParsedHeadwindCustom3(terminalName = null, wifiConfig = null)
    }

    val parsed = runCatching {
        headwindJson.decodeFromString<HeadwindManagedConfigPayload>(rawValue)
    }.getOrNull()

    if (parsed == null) {
        return ParsedHeadwindCustom3(terminalName = rawValue, wifiConfig = null)
    }

    val wifiConfig = if (!parsed.wifi_ssid.isNullOrBlank() && !parsed.wifi_passphrase.isNullOrBlank()) {
        ManagedWifiConfig(
            ssid = parsed.wifi_ssid,
            passphrase = parsed.wifi_passphrase,
        )
    } else {
        null
    }

    return ParsedHeadwindCustom3(
        terminalName = parsed.terminal_name ?: rawValue,
        wifiConfig = wifiConfig,
    )
}
