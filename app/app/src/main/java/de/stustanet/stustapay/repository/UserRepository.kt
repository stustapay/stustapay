package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.UserState
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.netsource.UserRemoteDataSource
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserRepository @Inject constructor(
    private val userRemoteDataSource: UserRemoteDataSource
) {
    var userState = MutableStateFlow<UserState>(UserState.Error("Initialized"))
    var status = MutableStateFlow<String?>(null)

    suspend fun fetchLogin() {
        userState.update { userRemoteDataSource.currentUser() }
    }

    suspend fun login(userTag: UserTag) {
        when (val loginResult = userRemoteDataSource.userLogin(userTag)) {
            is UserState.Error -> {
                status.update { loginResult.msg }
            }
            is UserState.LoggedIn, is UserState.NoLogin -> {
                status.update { null }
                userState.update { loginResult }
            }
        }
    }

    suspend fun logout() {
        val result = userRemoteDataSource.userLogout()
        if (result != null) {
            status.emit(result)
        } else {
            status.update { "Logged out." }
            userState.update { UserState.NoLogin }
        }
    }
}
