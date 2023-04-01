package de.stustanet.stustapay.repository

import de.stustanet.stustapay.model.TerminalConfig
import de.stustanet.stustapay.model.TerminalConfigState
import de.stustanet.stustapay.model.TillButton
import de.stustanet.stustapay.netsource.TerminalConfigRemoteDataSource
import de.stustanet.stustapay.ui.order.TillProductButtonUI
import kotlinx.coroutines.flow.MutableSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TerminalConfigRepository @Inject constructor(
    private val terminalConfigRemoteDataSource: TerminalConfigRemoteDataSource,
) {
    var terminalConfigState = MutableSharedFlow<TerminalConfigState>()

    suspend fun fetchConfig() {
        return terminalConfigState.emit(
            TerminalConfigState.Success(
                TerminalConfig(
                    id = 0,
                    name = "test config",
                    description = "testing the fetch workflow",
                    user_privileges = null,
                    allow_top_up = false,
                    buttons = listOf<TillButton>(
                        TillButton(name = "Bier", product_ids = listOf(0, 10), price = 3.5, id = 0),
                        TillButton(name = "Mass", product_ids = listOf(1, 10), price = 6.0, id = 1),
                        TillButton(name = "Weißbier", product_ids = listOf(2, 10), price = 3.5, id = 2),
                        TillButton(name = "Radler", product_ids = listOf(3, 10), price = 3.5, id = 3),
                        TillButton(name = "Spezi", product_ids = listOf(4, 10), price = 3.5, id = 4),
                        TillButton(name = "Pfand zurück", product_ids = listOf(11), price = -2.0, id = 11),
                    )
                ),
            )
        )
    }
}
