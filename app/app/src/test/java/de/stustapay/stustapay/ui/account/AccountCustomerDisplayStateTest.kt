package de.stustapay.stustapay.ui.account

import com.ionspin.kotlin.bignum.integer.toBigInteger
import de.stustapay.api.models.Account
import de.stustapay.api.models.AccountType
import de.stustapay.stustapay.display.CustomerDisplayState
import org.junit.Assert.assertEquals
import org.junit.Test

class AccountCustomerDisplayStateTest {
    @Test
    fun `maps named account with vouchers to customer display state`() {
        val state = customerDisplayStateForAccount(
            account(
                name = "Alice Example",
                balance = 12.5,
                vouchers = 3,
            )
        )

        assertEquals(
            CustomerDisplayState.AccountBalance(
                accountName = "Alice Example",
                balance = 12.5,
                voucherCount = "3",
            ),
            state,
        )
    }

    @Test
    fun `omits blank names and zero vouchers on customer display`() {
        val state = customerDisplayStateForAccount(
            account(
                name = "   ",
                balance = 0.0,
                vouchers = 0,
            )
        )

        assertEquals(
            CustomerDisplayState.AccountBalance(
                accountName = null,
                balance = 0.0,
                voucherCount = null,
            ),
            state,
        )
    }

    private fun account(
        name: String?,
        balance: Double,
        vouchers: Int,
    ): Account {
        return Account(
            nodeId = 1.toBigInteger(),
            id = 2.toBigInteger(),
            type = AccountType.private,
            name = name,
            comment = null,
            balance = balance,
            vouchers = vouchers.toBigInteger(),
            userTagId = null,
            userTagUid = null,
            restriction = null,
            tagHistory = emptyList(),
            userTagUidHex = null,
            userTagComment = null,
            isVip = false,
            vipMaxBalance = null,
        )
    }
}
