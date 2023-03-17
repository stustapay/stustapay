package de.stustanet.stustapay.util


/**
 * Something that can hide and show menu and title bars.
 *
 * Used to call ui hiding/showing on the main activity.
 */
interface SysUiController {
    fun hideSystemUI()
    fun showSystemUI()
}
