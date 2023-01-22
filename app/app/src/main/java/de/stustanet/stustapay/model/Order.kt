package de.stustanet.stustapay.model

import kotlinx.serialization.Serializable

@Serializable
data class Position(val id: Int, val name: String)

@Serializable
data class Order(val name: String, val positions: ArrayList<Position>)
