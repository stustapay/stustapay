package de.stustanet.stustapay.net

import io.ktor.client.call.*
import io.ktor.client.request.*
import kotlinx.serialization.Serializable

@Serializable
data class HealthStatus(val status: String)

object Network {
    suspend fun getHealthStatus(): String {
        val health: HealthStatus = ktorClient.get("http://10.0.2.2:8080/api/health").body()
        return "Status: ${health.status}"
    }
}