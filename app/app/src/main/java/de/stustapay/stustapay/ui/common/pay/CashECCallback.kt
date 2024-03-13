package de.stustapay.stustapay.ui.common.pay

import de.stustapay.api.models.UserTag

/**
 * Callbacks after money was received successfully.
 * The functions are called after confirming the money was received,
 * i.e. SumUp confirmed the transaction, or we received the cash.
 */
sealed interface CashECCallback {
    /**
     * User already has a tag.
     */
    data class Tag(
        val onEC: (UserTag) -> Unit = {},
        val onCash: (UserTag) -> Unit = {},
    ) : CashECCallback

    /**
     * User has no tag yet (e.g. for entry admission)
     */
    data class NoTag(
        val onEC: () -> Unit = {},
        val onCash: () -> Unit = {},
    ) : CashECCallback
}
