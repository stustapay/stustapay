package de.stustapay.stustapay.ui.common.selfservice

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dagger.hilt.android.EntryPointAccessors
import de.stustapay.stustapay.ui.hilt.DeviceConfigEntryPoint

data class SelfServiceDeviceProfile(
    val isSmallScreen: Boolean,
    val isIminFalcons2: Boolean,
    val contentPaddingHorizontal: Dp,
    val contentPaddingVertical: Dp,
    val headlineTitleSize: TextUnit,
    val headlineSubtitleSize: TextUnit,
    val actionCardTitleSize: TextUnit,
    val actionCardDescriptionSize: TextUnit,
    val amountValueSize: TextUnit,
    val buttonTextSize: TextUnit
)

@Composable
fun rememberSelfServiceDeviceProfile(): SelfServiceDeviceProfile {
    val context = LocalContext.current
    val deviceConfigProvider = remember {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            DeviceConfigEntryPoint::class.java
        ).deviceConfigProvider()
    }
    val deviceConfig = remember { deviceConfigProvider.getDeviceConfig() }

    return when {
        deviceConfig.isSmallScreen -> SelfServiceDeviceProfile(
            isSmallScreen = true,
            isIminFalcons2 = deviceConfig.isIminFalcons2,
            contentPaddingHorizontal = 14.dp,
            contentPaddingVertical = 10.dp,
            headlineTitleSize = 30.sp,
            headlineSubtitleSize = 14.sp,
            actionCardTitleSize = 28.sp,
            actionCardDescriptionSize = 13.sp,
            amountValueSize = 46.sp,
            buttonTextSize = 15.sp
        )
        deviceConfig.isIminFalcons2 -> SelfServiceDeviceProfile(
            isSmallScreen = false,
            isIminFalcons2 = true,
            contentPaddingHorizontal = 18.dp,
            contentPaddingVertical = 12.dp,
            headlineTitleSize = 38.sp,
            headlineSubtitleSize = 17.sp,
            actionCardTitleSize = 30.sp,
            actionCardDescriptionSize = 14.sp,
            amountValueSize = 58.sp,
            buttonTextSize = 16.sp
        )
        else -> SelfServiceDeviceProfile(
            isSmallScreen = false,
            isIminFalcons2 = false,
            contentPaddingHorizontal = 20.dp,
            contentPaddingVertical = 14.dp,
            headlineTitleSize = 40.sp,
            headlineSubtitleSize = 18.sp,
            actionCardTitleSize = 34.sp,
            actionCardDescriptionSize = 16.sp,
            amountValueSize = 72.sp,
            buttonTextSize = 18.sp
        )
    }
}
