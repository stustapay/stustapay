package de.stustapay.stustapay.ui.sale

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
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

private data class SaleSelectionLabelParts(
    val title: String,
    val variantBadge: String?,
)

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
) {
    val isReturnable = type is SaleSelectionItemType.Returnable
    val itemPrice: String
    val quantityLabel: String?
    val primaryText: String
    val secondaryText: String
    val primaryAction: () -> Unit
    val secondaryAction: () -> Unit
    val secondaryEnabled: Boolean
    val primaryButtonColor: Color
    val primaryButtonTextColor: Color
    val secondaryButtonColor: Color
    val secondaryButtonTextColor: Color
    val selectionLabel: String?
    var primaryIsSymbol = false
    val labelParts = caption.toSelectionLabelParts()

    when (type) {
        is SaleSelectionItemType.FixedPrice -> {
            val amount: Int = type.amount?.amount ?: 0
            itemPrice = "%.02f€".format(type.price.price)
            quantityLabel = if (amount > 0) "×$amount" else null
            primaryText = stringResource(R.string.sale_action_add_symbol)
            secondaryText = "−"
            primaryAction = type.onIncr
            secondaryAction = type.onDecr
            secondaryEnabled = amount > 0
            primaryButtonColor = OperatorPalette.accent
            primaryButtonTextColor = OperatorPalette.accentText
            secondaryButtonColor = Color(0xFFB91C1C)
            secondaryButtonTextColor = Color.White
            selectionLabel = if (amount > 0) stringResource(R.string.sale_item_in_basket) else null
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
            secondaryEnabled = true
            primaryButtonColor = Color(0xFFB91C1C)
            primaryButtonTextColor = Color.White
            secondaryButtonColor = Color(0xFFEAB308)
            secondaryButtonTextColor = Color(0xFF1A1200)
            selectionLabel = if (amount != 0) stringResource(R.string.sale_item_return_selected) else null
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
            secondaryText = stringResource(R.string.sale_clear_price)
            primaryAction = { type.onPriceEdit(false) }
            secondaryAction = { type.onPriceEdit(true) }
            secondaryEnabled = type.amount != null
            primaryButtonColor = OperatorPalette.accent
            primaryButtonTextColor = OperatorPalette.accentText
            secondaryButtonColor = Color(0xFFB91C1C)
            secondaryButtonTextColor = Color.White
            selectionLabel = if (type.amount != null) stringResource(R.string.sale_item_price_set) else null
        }

        is SaleSelectionItemType.Vouchers -> {
            itemPrice = "${type.amount}/${type.maxAmount}"
            quantityLabel = null
            primaryText = stringResource(R.string.sale_action_add_symbol)
            secondaryText = "−"
            primaryAction = type.onIncr
            secondaryAction = type.onDecr
            secondaryEnabled = type.amount > 0
            primaryButtonColor = OperatorPalette.accent
            primaryButtonTextColor = OperatorPalette.accentText
            secondaryButtonColor = Color(0xFFB91C1C)
            secondaryButtonTextColor = Color.White
            selectionLabel = if (type.amount > 0) stringResource(R.string.sale_item_selected) else null
            primaryIsSymbol = true
        }
    }

    Surface(
        shape = RoundedCornerShape(18.dp),
        color = OperatorPalette.interactivePanel,
        border = BorderStroke(1.dp, OperatorPalette.panelBorder),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = labelParts.title,
                            color = OperatorPalette.title,
                            fontSize = 23.sp,
                            fontWeight = FontWeight.ExtraBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f, fill = false),
                        )

                        labelParts.variantBadge?.let { badge ->
                            Box(
                                modifier = Modifier
                                    .background(OperatorPalette.pill, RoundedCornerShape(999.dp))
                                    .padding(horizontal = 10.dp, vertical = 5.dp),
                            ) {
                                Text(
                                    text = badge,
                                    color = OperatorPalette.title,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }

                    selectionLabel?.let { detail ->
                        Text(
                            text = detail,
                            color = OperatorPalette.subtitle,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }

                Column(
                    horizontalAlignment = Alignment.End,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = itemPrice,
                        color = OperatorPalette.title,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.ExtraBold,
                    )

                    if (quantityLabel != null) {
                        Box(
                            modifier = Modifier
                                .background(OperatorPalette.panel, RoundedCornerShape(999.dp))
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
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Button(
                    onClick = secondaryAction,
                    enabled = secondaryEnabled,
                    modifier = Modifier
                        .height(46.dp)
                        .widthIn(min = if (secondaryText.length > 1) 96.dp else 64.dp),
                    colors = ButtonDefaults.buttonColors(
                        backgroundColor = secondaryButtonColor,
                        contentColor = secondaryButtonTextColor,
                        disabledBackgroundColor = OperatorPalette.panel,
                        disabledContentColor = OperatorPalette.subtitle,
                    ),
                ) {
                    Text(
                        text = secondaryText,
                        fontSize = if (secondaryText.length > 1) 13.sp else 21.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }

                Button(
                    onClick = primaryAction,
                    modifier = Modifier
                        .height(46.dp)
                        .weight(1f)
                        .widthIn(min = if (primaryIsSymbol) 92.dp else if (isReturnable || primaryText.length > 4) 132.dp else 104.dp),
                    colors = ButtonDefaults.buttonColors(
                        backgroundColor = primaryButtonColor,
                        contentColor = primaryButtonTextColor,
                    ),
                ) {
                    Text(
                        text = primaryText,
                        fontSize = if (primaryIsSymbol) 28.sp else 16.sp,
                        fontWeight = if (primaryIsSymbol) FontWeight.ExtraBold else FontWeight.SemiBold,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}

private fun String.toSelectionLabelParts(): SaleSelectionLabelParts {
    val match = Regex("""^(.+?)\s+(\d+(?:[.,]\d+)?l)$""", RegexOption.IGNORE_CASE).matchEntire(trim())
    if (match == null) {
        return SaleSelectionLabelParts(
            title = this,
            variantBadge = null,
        )
    }

    return SaleSelectionLabelParts(
        title = match.groupValues[1],
        variantBadge = match.groupValues[2],
    )
}
