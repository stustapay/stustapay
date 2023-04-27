package de.stustanet.stustapay.model

sealed interface UserState {
    data class LoggedIn(
        var user: User
    ) : UserState

    object NoLogin : UserState

    data class Error(
        var msg: String,
    ) : UserState
}

sealed interface UserCreateState {
    object Created : UserCreateState

    data class Error(
        var msg: String,
    ) : UserCreateState
}