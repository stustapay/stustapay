package de.stustanet.stustapay.model

import kotlinx.serialization.Serializable

@Serializable
data class UserRole(
    // NewUserRole
    val name: String,
    val privileges: List<Privilege>,

    // UserRole
    val id: Int,
)


@Serializable
data class CurrentUser(
    val id: Int,
    val login: String,
    val display_name: String,
    val active_role_id: Int,
    val active_role_name: String,
    val privileges: List<Privilege>,
    val description: String?,
    val user_tag_uid: ULong? = null,
    val transport_account_id: Int? = null,
    val cashier_account_id: Int? = null,
)

@Serializable
data class UserTag(
    val uid: ULong,
)

@Serializable
data class NewUser(
    val login: String,
    val user_tag_uid: ULong
)

@Serializable
enum class UserKind(val label: String) {
    Cashier("Cashier"),
    Finanzorga("Finanzorga")
}

@Serializable
data class LoginPayload(
    val user_tag: UserTag,
    val user_role_id: Int,
)

@Serializable
data class CheckLoginResult(
    val user_tag: UserTag,
    val roles: List<UserRole>,
)