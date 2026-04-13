package de.stustapay.stustapay.ui.sale

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Button
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Surface
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorPalette

sealed interface SaleSelectionItemType {
    data class FixedPrice(
        val onIncr: () -> Unit,
        val onDecr: () -> Unit,
        val price: SaleItemPrice.FixedPrice,
        val amount: SaleItemAmount.FixedPrice?
    ) : SaleSelectionItemType

    data class FreePrice(
        val onPriceEdit: (clear: Boolean) -> Unit,
        val amount: SaleItemAmount.FreePrice?
    ) : SaleSelectionItemType

    data class Vouchers(
        val onIncr: () -> Unit,
        val onDecr: () -> Unit,
        val amount: Int,
        val maxAmount: Int,
    ) : SaleSelectionItemType

    data class Returnable(
        val onIncr: () -> Unit,
        val onDecr: () -> Unit,
        val price: SaleItemPrice.Returnable,
        val amount: SaleItemAmount.FixedPrice?,
        val incrementText: String,
    ) : SaleSelectionItemType
}

enum class SaleSelectionItemLayout {
    Card,
    ListRow,
}

@Preview
@Composable
fun PreviewSaleSelectionItem() {
    Column {
        SaleSelectionItem(
            caption = "Robbenfutter",
            type = SaleSelectionItemType.FixedPrice(
                onIncr = {},
                onDecr = {},
                price = SaleItemPrice.FixedPrice(13.37),
                amount = SaleItemAmount.FixedPrice(42),
            ),
        )
        SaleSelectionItem(
            caption = "Internetkanister",
            type = SaleSelectionItemType.FreePrice(
                onPriceEdit = {},
                amount = SaleItemAmount.FreePrice(4200u),
            )
        )
        SaleSelectionItem(
            caption = "Gutschein",
            type = SaleSelectionItemType.Vouchers(
                amount = 3,
                maxAmount = 12,
                onIncr = { },
                onDecr = { },
            )
        )
        SaleSelectionItem(
            caption = "Pfand zurück",
            type = SaleSelectionItemType.Returnable(
                price = SaleItemPrice.Returnable(2.0),
                amount = SaleItemAmount.FixedPrice(2),
                incrementText = "Extra Glas",
                onIncr = { },
                onDecr = { },
            )
        )
    }
}

/**
 * one buyable entry in the ordering overview.
 */
@Composable
fun SaleSelectionItem(
    caption: String,
    type: SaleSelectionItemType,
    layout: SaleSelectionItemLayout = SaleSelectionItemLayout.Card,
) {
    val isReturnable = type is SaleSelectionItemType.Returnable
    val itemPrice: String
    val quantityLabel: String?
    val primaryText: String
    val secondaryText: String?
    val primaryAction: () -> Unit
    val secondaryAction: (() -> Unit)?
    val primaryButtonColor: Color
    val primaryButtonTextColor: Color
    val secondaryButtonColor: Color
    val secondaryButtonTextColor: Color
    var primaryIsSymbol = false

    when (type) {
        is SaleSelectionItemType.FixedPrice -> {
            val amount: Int = type.amount?.amount ?: 0
            itemPrice = "%.02f€".format(type.price.price)
            quantityLabel = if (amount > 0) "×$amount" else null
            primaryText = stringResource(R.string.sale_action_add_symbol)
            secondaryText = if (amount > 0) "−" else null
            primaryAction = type.onIncr
            secondaryAction = if (amount > 0) type.onDecr else null
            primaryButtonColor = OperatorPalette.accent
            primaryButtonTextColor = OperatorPalette.accentText
            secondaryButtonColor = Color(0xFFB91C1C)
            secondaryButtonTextColor = Color.White
            primaryIsSymbol = true
        }

        is SaleSelectionItemType.Returnable -> {
            val amount: Int = type.amount?.amount ?: 0
            itemPrice = "%.02f€".format(type.price.price ?: 0.0)
            quantityLabel = if (amount != 0) amount.toString() else null
            primaryText = stringResource(R.string.sale_action_add_symbol)
            secondaryText = "−"
            primaryAction = type.onDecr
            secondaryAction = type.onIncr
            primaryButtonColor = Color(0xFFB91C1C)
            primaryButtonTextColor = Color.White
            secondaryButtonColor = Color(0xFFEAB308)
            secondaryButtonTextColor = Color(0xFF1A1200)
            primaryIsSymbol = true
        }

        is SaleSelectionItemType.FreePrice -> {
            val price: Double = (type.amount?.price?.toDouble() ?: 0.0) / 100
            itemPrice = "%.02f€".format(price)
            quantityLabel = null
            primaryText = if (type.amount == null) {
                stringResource(R.string.sale_set_price)
            } else {
                stringResource(R.string.sale_edit_price)
            }
            secondaryText = if (type.amount != null) stringResource(R.string.sale_clear_price) else null
            primaryAction = { type.onPriceEdit(false) }
            secondaryAction = if (type.amount != null) ({ type.onPriceEdit(true) }) else null
            primaryButtonColor = OperatorPalette.accent
            primaryButtonTextColor = OperatorPalette.accentText
            secondaryButtonColor = Color(0xFFB91C1C)
            secondaryButtonTextColor = Color.White
        }

        is SaleSelectionItemType.Vouchers -> {
            itemPrice = "${type.amount}/${type.maxAmount}"
            quantityLabel = null
            primaryText = stringResource(R.string.sale_action_add_symbol)
            secondaryText = if (type.amount > 0) "−" else null
            primaryAction = type.onIncr
            secondaryAction = if (type.amount > 0) type.onDecr else null
            primaryButtonColor = OperatorPalette.accent
            primaryButtonTextColor = OperatorPalette.accentText
            secondaryButtonColor = Color(0xFFB91C1C)
            secondaryButtonTextColor = Color.White
            primaryIsSymbol = true
        }
    }

    if (layout == SaleSelectionItemLayout.ListRow) {
        Surface(
            shape = RoundedCornerShape(14.dp),
            color = OperatorPalette.panel,
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.Center,
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = caption,
                            color = OperatorPalette.title,
                            fontSize = 21.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f, fill = false),
                        )

                        if (quantityLabel != null) {
                            Box(
                                modifier = Modifier
                                    .background(OperatorPalette.pill, RoundedCornerShape(999.dp))
                                    .padding(horizontal = 12.dp, vertical = 6.dp),
                            ) {
                                Text(
                                    text = quantityLabel,
                                    color = OperatorPalette.title,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }
                }

                Text(
                    text = itemPrice,
                    color = OperatorPalette.title,
                    fontSize = 23.sp,
                    fontWeight = FontWeight.ExtraBold,
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (secondaryText != null && secondaryAction != null) {
                        Button(
                            onClick = secondaryAction,
                            modifier = Modifier
                                .height(46.dp)
                                .widthIn(min = if (secondaryText.length > 1) 72.dp else 50.dp),
                            colors = ButtonDefaults.buttonColors(
                                backgroundColor = secondaryButtonColor,
                                contentColor = secondaryButtonTextColor,
                            ),
                        ) {
                            Text(
                                text = secondaryText,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }

                    Button(
                        onClick = primaryAction,
                        modifier = Modifier
                            .height(46.dp)
                            .widthIn(min = if (primaryIsSymbol) 58.dp else if (isReturnable || primaryText.length > 4) 94.dp else 78.dp),
                        colors = ButtonDefaults.buttonColors(
                            backgroundColor = primaryButtonColor,
                            contentColor = primaryButtonTextColor,
                        ),
                    ) {
                        Text(
                            text = primaryText,
                            fontSize = if (primaryIsSymbol) 27.sp else 14.sp,
                            fontWeight = if (primaryIsSymbol) FontWeight.ExtraBold else FontWeight.SemiBold,
                            maxLines = 1,
                        )
                    }
                }
            }
        }
        return
    }

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = OperatorPalette.panel,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Text(
                    text = caption,
                    color = OperatorPalette.title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                if (quantityLabel != null) {
                    Box(
                        modifier = Modifier
                            .background(OperatorPalette.pill, RoundedCornerShape(999.dp))
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                    ) {
                        Text(
                            text = quantityLabel,
                            color = OperatorPalette.title,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }

            Text(
                text = itemPrice,
                color = OperatorPalette.subtitle,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Button(
                    onClick = primaryAction,
                    modifier = Modifier
                        .weight(if (primaryIsSymbol) 0.32f else if (secondaryText != null) 0.72f else 1f)
                        .height(38.dp),
                    colors = ButtonDefaults.buttonColors(
                        backgroundColor = primaryButtonColor,
                        contentColor = primaryButtonTextColor,
                    ),
                ) {
                    Text(
                        text = primaryText,
                        fontSize = if (primaryIsSymbol) 24.sp else 13.sp,
                        fontWeight = if (primaryIsSymbol) FontWeight.ExtraBold else FontWeight.SemiBold,
                    )
                }

                if (secondaryText != null && secondaryAction != null) {
                    Button(
                        onClick = secondaryAction,
                        modifier = Modifier
                            .weight(0.28f)
                            .height(38.dp),
                        colors = ButtonDefaults.buttonColors(
                            backgroundColor = secondaryButtonColor,
                            contentColor = secondaryButtonTextColor,
                        ),
                    ) {
                        Text(
                            text = secondaryText,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        }
    }
}
