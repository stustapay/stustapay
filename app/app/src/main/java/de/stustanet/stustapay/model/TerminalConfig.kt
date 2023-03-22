package de.stustanet.stustapay.model


import kotlinx.serialization.Serializable

@Serializable
data class TerminalConfig(
    val id: Int,
    val name: String,
    var configDescription: String,
    var userName: String,
)