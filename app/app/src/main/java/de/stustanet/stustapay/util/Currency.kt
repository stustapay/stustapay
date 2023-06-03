package de.stustanet.stustapay.util

fun formatCurrencyValue(value: Double?): String {
    if (value == null) {
        return ""
    }
    return "%.02f€".format(value).replace('.', ',')
}
