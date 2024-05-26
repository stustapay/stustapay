package de.stustapay.libssp.util

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager

fun restartApp(activity: Activity) {
    val packageManager: PackageManager = activity.packageManager
    val intent: Intent = packageManager.getLaunchIntentForPackage(activity.packageName)!!
    val componentName: ComponentName = intent.component!!
    val restartIntent: Intent = Intent.makeRestartActivityTask(componentName)
    activity.startActivity(restartIntent)
    Runtime.getRuntime().exit(0)
}