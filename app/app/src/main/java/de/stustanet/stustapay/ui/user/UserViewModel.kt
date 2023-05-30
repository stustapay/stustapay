package de.stustanet.stustapay.ui.user

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.*
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.repository.CashierRepository
import de.stustanet.stustapay.repository.TerminalConfigRepository
import de.stustanet.stustapay.repository.TerminalConfigState
import de.stustanet.stustapay.repository.UserRepository
import de.stustanet.stustapay.ui.cashiermanagement.CashierManagementStatus
import de.stustanet.stustapay.util.Result
import de.stustanet.stustapay.util.asResult
import kotlinx.coroutines.flow.*
import javax.inject.Inject

sealed interface UserUIState {
    data class LoggedIn(
        val username: String,
        val activeRole: String,
        val showCreateUser: Boolean,
        val showLoginUser: Boolean
    ) : UserUIState

    object NotLoggedIn : UserUIState

    data class Error(
        val message: String
    ) : UserUIState
}

sealed interface UserRequestState {
    object Idle : UserRequestState
    object Fetching : UserRequestState
    object Done : UserRequestState
    data class Failed(val msg: String) : UserRequestState
}

@HiltViewModel
class UserViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val cashierRepository: CashierRepository,
    terminalConfigRepository: TerminalConfigRepository
) : ViewModel() {
    val userUIState: StateFlow<UserUIState> = userUiState(
        userRepo = userRepository
    )
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = UserUIState.Error("Loading..."),
        )

    val userStatus = userRepository.status
    val userRoles = userRepository.userRoles

    val availableRoles = terminalConfigRepository.terminalConfigState.map { state ->
        if (state is TerminalConfigState.Success) {
            state.config.available_roles
        } else {
            listOf()
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(3000),
        initialValue = listOf(),
    )

    private var _status = MutableStateFlow<UserRequestState>(UserRequestState.Idle)
    val status = _status.asStateFlow()

    private var _currentUser = MutableStateFlow<UserInfo?>(null)
    val currentUser = _currentUser.asStateFlow()

    private var _currentTag = MutableStateFlow(0uL)
    val currentTag = _currentTag.asStateFlow()

    fun clearErrors() {
        userStatus.update { null }
    }

    suspend fun fetchLogin() {
        userRepository.fetchLogin()
    }

    suspend fun checkLogin(tag: UserTag) {
        userRepository.checkLogin(tag)
    }

    suspend fun login(tag: UserTag, roleID: Int) {
        userRepository.login(tag, roleID)
    }

    suspend fun logout() {
        userRepository.logout()
    }

    fun idleState() {
        _status.update { UserRequestState.Idle }
        _currentUser.update { null }
        _currentTag.update { 0uL }
    }

    suspend fun create(login: String, displayName: String, tag: ULong, roles: List<Role>, description: String) {
        _status.update { UserRequestState.Fetching }
        when (val res = userRepository.create(login, displayName, UserTag(tag), roles, description)) {
            is UserCreateState.Created -> {
                _status.update { UserRequestState.Done }
            }
            is UserCreateState.Error -> {
                _status.update { UserRequestState.Failed(res.msg) }
            }
        }
    }

    suspend fun update(tag: ULong, roles: List<Role>) {
        _status.update { UserRequestState.Fetching }
        when (val res = userRepository.update(UserTag(tag), roles)) {
            is UserUpdateState.Created -> {
                _status.update { UserRequestState.Done }
            }
            is UserUpdateState.Error -> {
                _status.update { UserRequestState.Failed(res.msg) }
            }
        }
    }

    suspend fun display(tag: ULong) {
        // TODO: Rename getCashierInfo / get_user_info
        _status.update { UserRequestState.Fetching }
        _currentUser.update { null }
        when (val res = cashierRepository.getCashierInfo(tag)) {
            is Response.OK -> {
                _currentUser.update { res.data }
                _currentTag.update { tag }
                _status.update { UserRequestState.Done }
            }
            is Response.Error -> {
                _status.update { UserRequestState.Failed(res.msg()) }
            }
        }
    }
}

private fun userUiState(
    userRepo: UserRepository,
): Flow<UserUIState> {
    // observe if we're logged in, i.e. if the flow element != null
    val regState: Flow<UserState> = userRepo.userState

    // convert the registration state to a ui registration state
    return regState.asResult()
        .map { userStateResult ->
            when (userStateResult) {
                is Result.Loading -> {
                    UserUIState.Error("waiting...")
                }

                is Result.Success -> {
                    when (val userState = userStateResult.data) {
                        is UserState.LoggedIn -> {
                            if (userState.user.active_role_name != null) {
                                UserUIState.LoggedIn(
                                    username = userState.user.login,
                                    activeRole = userState.user.active_role_name!!,
                                    showCreateUser = Access.canCreateUser(userState.user),
                                    showLoginUser = Access.canLogInOtherUsers(userState.user),
                                )
                            } else {
                                UserUIState.Error(
                                    message = "no active role provided",
                                )
                            }

                        }

                        is UserState.NoLogin -> {
                            UserUIState.NotLoggedIn
                        }

                        is UserState.Error -> {
                            UserUIState.Error(
                                message = userState.msg,
                            )
                        }
                    }
                }

                is Result.Error -> {
                    UserUIState.Error(
                        userStateResult.exception?.localizedMessage
                            ?: "unknown user state error"
                    )
                }
            }
        }
}

