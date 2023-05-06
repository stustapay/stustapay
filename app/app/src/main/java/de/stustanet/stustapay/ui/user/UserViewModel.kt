package de.stustanet.stustapay.ui.user

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.*
import de.stustanet.stustapay.repository.TerminalConfigRepository
import de.stustanet.stustapay.repository.TerminalConfigState
import de.stustanet.stustapay.repository.UserRepository
import de.stustanet.stustapay.util.Result
import de.stustanet.stustapay.util.asResult
import kotlinx.coroutines.flow.*
import javax.inject.Inject

sealed interface UserUIState {
    data class LoggedIn(
        val username: String,
        val activeRole: String,
        val showCreateUser: Boolean,
    ) : UserUIState

    object NotLoggedIn : UserUIState

    data class Error(
        val message: String
    ) : UserUIState
}


@HiltViewModel
class UserViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val terminalConfigRepository: TerminalConfigRepository
) : ViewModel() {
    val userUIState: StateFlow<UserUIState> = userUiState(
        userRepo = userRepository
    )
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = UserUIState.Error("Loading..."),
        )

    val userUIMessage = userRepository.status
    val userRoles = userRepository.userRoles

    val availableRoles = terminalConfigRepository.terminalConfigState.map { state ->
        if (state is TerminalConfigState.Success) {
            state.config.available_roles
        } else {
            List(0) { Role() }
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(3000),
        initialValue = List(0) { Role() },
    )

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

    suspend fun create(login: String, tag: ULong, roles: List<Role>) {
        userRepository.create(login, UserTag(tag), roles)
    }

    suspend fun update(tag: ULong, roles: List<Role>) {
        userRepository.update(UserTag(tag), roles)
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
                            UserUIState.LoggedIn(
                                username = userState.user.login,
                                activeRole = userState.user.active_role_name,
                                showCreateUser = Access.canCreateUser(userState.user),
                            )
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