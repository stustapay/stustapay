package de.stustapay.stustapay.ec

import org.junit.Assert.assertEquals
import org.junit.Test

class SumUpConfigErrorMessageTest {
    @Test
    fun missingSecretsUsesSentenceStyleMessage() {
        assertEquals(
            "Failed to load SumUp configuration. No SumUp credentials are configured for this terminal.",
            toUserFacingSumUpConfigError("no terminal ec secrets in config")
        )
    }

    @Test
    fun invalidAffiliateKeyDoesNotExposeRawKeyValue() {
        assertEquals(
            "Failed to load SumUp configuration. The configured SumUp affiliate key is invalid.",
            toUserFacingSumUpConfigError("invalid affiliate key: 'sup_afk_broken'")
        )
    }

    @Test
    fun missingMerchantCodeUsesSentenceStyleMessage() {
        assertEquals(
            "Failed to load SumUp configuration. No sumup merchant configured.",
            toUserFacingSumUpConfigError("no sumup merchant configured")
        )
    }

    @Test
    fun unknownErrorsAreNormalizedToSentenceCase() {
        assertEquals(
            "Failed to load SumUp configuration. Backend timeout.",
            toUserFacingSumUpConfigError("backend timeout")
        )
    }
}
