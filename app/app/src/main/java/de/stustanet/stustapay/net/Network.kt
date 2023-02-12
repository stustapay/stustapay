package de.stustanet.stustapay.net

import io.ktor.client.call.*
import io.ktor.client.network.sockets.*
import io.ktor.client.request.*
import kotlinx.serialization.Serializable

@Serializable
data class HealthStatus(val status: String)

object Network {
    suspend fun getHealthStatus(): String {
        return try {
            val health: HealthStatus = ktorClient.get("http://10.0.2.2:8080/api/health").body()
            "Status: ${health.status}"
        } catch (_: ConnectTimeoutException) {
            "Connection timeout"
        }
    }
}