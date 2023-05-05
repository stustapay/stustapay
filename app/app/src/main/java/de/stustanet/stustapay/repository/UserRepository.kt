package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.LoginPayload
import de.stustanet.stustapay.model.NewUser
import de.stustanet.stustapay.model.UserKind
import de.stustanet.stustapay.model.UserRolesState
import de.stustanet.stustapay.model.UserState
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.netsource.UserRemoteDataSource
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserRepository @Inject constructor(
    private val userRemoteDataSource: UserRemoteDataSource
) {
    private var _userState = MutableStateFlow<UserState>(UserState.Error("loading..."))
    var userState = _userState.asStateFlow()

    private var _userRolesState = MutableStateFlow<UserRolesState>(UserRolesState.Unknown)
    var userRoles = _userRolesState.asStateFlow()

    var status = MutableStateFlow<String?>(null)

    suspend fun fetchLogin() {
        _userState.update { userRemoteDataSource.currentUser() }
    }

    suspend fun checkLogin(userTag: UserTag) {
        when (val checkResult = userRemoteDataSource.checkLogin(userTag)) {
            is UserRolesState.Error -> {
                status.update { checkResult.msg }
            }
            is UserRolesState.OK -> {
                status.update { null }
                _userRolesState.update { checkResult }
            }
            is UserRolesState.Unknown -> {
                // checkLogin never returns this anyway
                status.update { "roles unknown" }
            }
        }
    }

    suspend fun login(userTag: UserTag, roleID: Int) {
        when (val loginResult = userRemoteDataSource.userLogin(LoginPayload(userTag, roleID))) {
            is UserState.Error -> {
                status.update { loginResult.msg }
            }
            is UserState.LoggedIn, is UserState.NoLogin -> {
                status.update { null }
                _userState.update { loginResult }
            }
        }
    }

    suspend fun logout() {
        val result = userRemoteDataSource.userLogout()
        if (result != null) {
            status.emit(result)
        } else {
            status.update { "Logged out." }
            _userState.update { UserState.NoLogin }
        }
    }

    suspend fun create(login: String, userTag: UserTag, userKind: UserKind) {
        // TODO: Error handling
        userRemoteDataSource.userCreate(NewUser(login, userTag.uid), userKind)
    }
}
