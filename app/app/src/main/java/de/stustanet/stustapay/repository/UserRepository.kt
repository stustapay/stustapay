package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.UserState
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.netsource.UserRemoteDataSource
import kotlinx.coroutines.flow.MutableStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserRepository @Inject constructor(
    private val userRemoteDataSource: UserRemoteDataSource
) {
    var userState = MutableStateFlow<UserState>(UserState.Error("Initialized"))
    var status = MutableStateFlow<String?>(null)

    suspend fun fetchLogin() {
        userState.emit(userRemoteDataSource.currentUser())
    }

    suspend fun login(userTag: UserTag) {
        userState.emit(userRemoteDataSource.userLogin(userTag))
    }

    suspend fun logout() {
        val result = userRemoteDataSource.userLogout()
        if (result != null) {
            status.emit(result)
        }
        else {
            status.emit("Logged out.")
            userState.emit(UserState.NoLogin)
        }
    }
}
