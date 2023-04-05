package de.stustanet.stustapay.ui.user

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.stustanet.stustapay.model.UserState
import de.stustanet.stustapay.repository.UserRepository
import de.stustanet.stustapay.util.Result
import de.stustanet.stustapay.util.asResult
import kotlinx.coroutines.flow.*
import javax.inject.Inject

sealed interface UserUIState {
    data class LoggedIn(
        val username: String,
        val privileges: String,
    ) : UserUIState

    object NotLoggedIn : UserUIState

    data class Error(
        val message: String
    ) : UserUIState
}


@HiltViewModel
class UserViewModel @Inject constructor(
    private val userRepository: UserRepository
) : ViewModel() {
    val userUIState: StateFlow<UserUIState> = userUiState(
        userRepo = userRepository
    )
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = UserUIState.Error("Loading..."),
        )

    val userLoginStatus = userRepository.status

    suspend fun fetchLogin() {
        userRepository.fetchLogin()
    }

    suspend fun login(uid: ULong) {
        userRepository.login(uid)
    }

    suspend fun logout() {
        userRepository.logout()
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
                                username = userState.user.name,
                                privileges = userState.user.privileges.map { it.id }.joinToString(),
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