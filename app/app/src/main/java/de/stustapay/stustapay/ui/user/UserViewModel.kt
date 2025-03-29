package de.stustapay.stustapay.ui.user

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ionspin.kotlin.bignum.integer.BigInteger
import com.ionspin.kotlin.bignum.integer.toBigInteger
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustapay.api.models.UserInfo
import de.stustapay.api.models.UserTag
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.net.Response
import de.stustapay.libssp.util.Result
import de.stustapay.libssp.util.asResult
import de.stustapay.stustapay.model.Access
import de.stustapay.stustapay.model.UserCreateState
import de.stustapay.stustapay.model.UserState
import de.stustapay.stustapay.model.UserUpdateState
import de.stustapay.stustapay.repository.CashierRepository
import de.stustapay.stustapay.repository.TerminalConfigRepository
import de.stustapay.stustapay.repository.TerminalConfigState
import de.stustapay.stustapay.repository.UserRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
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
    ).stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = UserUIState.Error("Loading..."),
    )

    val userStatus = userRepository.status
    val userRoles = userRepository.userRoles

    val availableRoles = terminalConfigRepository.terminalConfigState.map { state ->
        if (state is TerminalConfigState.Success) {
            state.config.availableRoles
        } else {
            listOf()
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(3000),
        initialValue = listOf(),
    )

    private val _status = MutableStateFlow<UserRequestState>(UserRequestState.Idle)
    val status = _status.asStateFlow()

    private val _currentUser = MutableStateFlow<UserInfo?>(null)
    val currentUser = _currentUser.asStateFlow()

    private val _currentTag = MutableStateFlow(NfcTag(0.toBigInteger(), null))
    val currentTag = _currentTag.asStateFlow()

    fun clearErrors() {
        userStatus.update { null }
    }

    suspend fun fetchLogin() {
        userRepository.fetchLogin()
    }

    suspend fun checkLogin(tag: NfcTag) {
        userRepository.checkLogin(tag)
    }

    suspend fun login(tag: NfcTag, roleID: BigInteger) {
        userRepository.login(tag, roleID)
    }

    suspend fun logout() {
        userRepository.logout()
    }

    fun idleState() {
        _status.update { UserRequestState.Idle }
        _currentUser.update { null }
        _currentTag.update { NfcTag(0.toBigInteger(), null) }
    }

    suspend fun checkCreate(tag: NfcTag): Boolean {
        return when (cashierRepository.getUserInfo(tag)) {
            is Response.OK -> {
                display(tag)
                true
            }
            is Response.Error -> false
        }
    }

    suspend fun create(
        login: String,
        displayName: String,
        tag: NfcTag,
        roles: List<BigInteger>,
        description: String
    ) {
        _status.update { UserRequestState.Fetching }
        when (val res = userRepository.create(
            login, displayName, tag, roles, description
        )) {
            is UserCreateState.Created -> {
                _status.update { UserRequestState.Done }
            }

            is UserCreateState.Error -> {
                _status.update { UserRequestState.Failed(res.msg) }
            }
        }
    }

    suspend fun update(tag: NfcTag, roles: List<BigInteger>) {
        _status.update { UserRequestState.Fetching }
        when (val res = userRepository.update(tag, roles)) {
            is UserUpdateState.Created -> {
                _status.update { UserRequestState.Done }
            }

            is UserUpdateState.Error -> {
                _status.update { UserRequestState.Failed(res.msg) }
            }
        }
    }

    suspend fun display(tag: NfcTag) {
        _status.update { UserRequestState.Fetching }
        _currentUser.update { null }
        when (val res = cashierRepository.getUserInfo(tag)) {
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
    return regState.asResult().map { userStateResult ->
        when (userStateResult) {
            is Result.Loading -> {
                UserUIState.Error("waiting...")
            }

            is Result.Success -> {
                when (val userState = userStateResult.data) {
                    is UserState.LoggedIn -> {
                        if (userState.user.activeRoleName != null) {
                            UserUIState.LoggedIn(
                                username = userState.user.login,
                                activeRole = userState.user.activeRoleName!!,
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
                    userStateResult.exception?.localizedMessage ?: "unknown user state error"
                )
            }
        }
    }
}

