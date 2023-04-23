package de.stustanet.stustapay.netsource


import de.stustanet.stustapay.model.*
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.net.TerminalAPI
import javax.inject.Inject

class UserRemoteDataSource @Inject constructor(
    private val terminalAPI: TerminalAPI
) {
    suspend fun currentUser(): UserState {
        return when (val userResponse = terminalAPI.currentUser()) {
            is Response.OK -> {
                val user = userResponse.data
                if (user != null) {
                    UserState.LoggedIn(
                        user = user,
                    )
                } else {
                    UserState.NoLogin
                }
            }
            is Response.Error -> {
                UserState.Error(
                    msg = userResponse.msg(),
                )
            }
        }
    }

    /**
     * Login a user by token.
     */
    suspend fun userLogin(userTag: UserTag): UserState {
        return when (val userLoginResponse = terminalAPI.userLogin(userTag)) {
            is Response.OK -> {
                UserState.LoggedIn(
                    user = userLoginResponse.data,
                )
            }
            is Response.Error -> {
                UserState.Error(
                    msg = userLoginResponse.msg(),
                )
            }
        }
    }

    /**
     * Logout the current user.
     */
    suspend fun userLogout(): String? {
        return when (val userLogoutResponse = terminalAPI.userLogout()) {
            is Response.OK -> {
                null
            }
            is Response.Error -> {
                userLogoutResponse.msg()
            }
        }
    }

    /**
     * Create a new user of any type.
     */
    suspend fun userCreate(newUser: NewUser, userKind: UserKind): UserCreateState {
        val res = when (userKind) {
            UserKind.Cashier -> {
                terminalAPI.userCreateCashier(newUser)
            }
            UserKind.Finanzorga -> {
                terminalAPI.userCreateFinanzorga(newUser)
            }
        }

        return when (res) {
            is Response.OK -> {
                UserCreateState.Created
            }
            is Response.Error -> {
                UserCreateState.Error(res.msg())
            }
        }
    }
}