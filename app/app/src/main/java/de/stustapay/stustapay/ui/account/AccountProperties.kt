package de.stustapay.stustapay.ui.account

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.Divider
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustapay.api.models.Customer
import de.stustapay.api.models.UserTag
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.TagItem
import de.stustapay.stustapay.ui.theme.AccountOverviewKeyStyle
import de.stustapay.stustapay.ui.theme.AccountOverviewValueBigStyle
import de.stustapay.stustapay.ui.theme.AccountOverviewValueStyle
import de.stustapay.stustapay.ui.theme.MoneyAmountStyle


@Composable
fun SummaryEntry(
    key: String,
    value: String,
    below: Boolean = false,
    small: Boolean = false,
) {
    val keySize = AccountOverviewKeyStyle
    val contentStyle = if (small) {
        AccountOverviewValueStyle
    } else {
        AccountOverviewValueBigStyle
    }

    if (below) {
        Column(
            modifier = Modifier
                .fillMaxWidth(),
            horizontalAlignment = Alignment.Start,
        ) {
            Text(
                text = key,
                style = keySize,
            )
            Text(
                text = value,
                style = contentStyle,
                modifier = Modifier.padding(start = 5.dp),
            )
        }
    } else {
        Row(
            modifier = Modifier
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Start,
        ) {
            Text(
                text = key,
                style = keySize,
                modifier = Modifier.weight(0.4f),
            )
            Text(
                text = value,
                style = contentStyle,
                modifier = Modifier.weight(0.6f),
            )
        }
    }
}


@Composable
fun AccountProperties(
    account: Customer,
    showComment: Boolean,
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxWidth(),
    ) {
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                if (account.userTagUid != null) {
                    TagItem(
                        UserTag(account.userTagUid!!),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp)
                    )
                }

                Text(
                    text = "%.02f€".format(account.balance),
                    style = MoneyAmountStyle,
                )

                // only show if they have vouchers?
                Spacer(modifier = Modifier.height(5.dp))
                Text(
                    "${account.vouchers} ${stringResource(R.string.customer_vouchers)}",
                    fontSize = 36.sp
                )
            }
        }

        item {
            Spacer(modifier = Modifier.height(5.dp))
        }

        val restriction = account.restriction
        if (restriction != null) {
            item {
                Divider()
                SummaryEntry(
                    stringResource(R.string.customer_restriction),
                    when (restriction.value) {
                        "under_18" -> {
                            stringResource(R.string.under_18_years)
                        }

                        "under_16" -> {
                            stringResource(R.string.under_16_years)
                        }

                        else -> restriction.value
                    },
                )
            }
        }

        val name = account.name
        if (name != null) {
            item {
                Divider()
                SummaryEntry(
                    stringResource(R.string.customer_name),
                    name,
                )
            }
        }

        val comment = account.comment
        if (showComment && !comment.isNullOrEmpty()) {
            item {
                Divider()
                SummaryEntry(
                    stringResource(R.string.customer_comment),
                    comment,
                    below = true,
                    small = true,
                )
            }
        }
    }
}