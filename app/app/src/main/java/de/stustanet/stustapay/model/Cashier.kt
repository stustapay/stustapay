package de.stustanet.stustapay.model

import kotlinx.serialization.Serializable
import java.util.zip.DeflaterOutputStream

@Serializable
data class CashierEquip(
    val cashier_tag_uid: ULong,
    val register_stocking_id: ULong
)

@Serializable
data class CashierStocking(
    val name: String = "",
    val euro200: Int = 0,
    val euro100: Int = 0,
    val euro50: Int = 0,
    val euro20: Int = 0,
    val euro10: Int = 0,
    val euro5: Int = 0,
    val euro2: Int = 0,
    val euro1: Int = 0,
    val cent50: Int = 0,
    val cent20: Int = 0,
    val cent10: Int = 0,
    val cent5: Int = 0,
    val cent2: Int = 0,
    val cent1: Int = 0,
    val variable_in_euro: Double = 0.0,
    val id: ULong = 0uL,
    val total: Double = 0.0
)

@Serializable
data class AccountChange(
    val cashier_tag_uid: ULong,
    val amount: Double
)

@Serializable
data class TransportAccountChange(
    val orga_tag_uid: ULong,
    val amount: Double
)