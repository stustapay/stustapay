package de.stustapay.stustapay.ui.common.selfservice

import android.content.Context
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Button
import androidx.compose.material.ButtonColors
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Card
import androidx.compose.material.Icon
import androidx.compose.material.IconButton
import androidx.compose.material.LinearProgressIndicator
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Brightness2
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.theme.TfPayBluePalette
import de.stustapay.stustapay.locale.AppLanguage
import de.stustapay.stustapay.locale.AppLocaleManager

enum class AppDisplayMode(val persistedValue: String) {
    Night("night"),
    Day("day");

    companion object {
        fun fromPersistedValue(value: String?): AppDisplayMode {
            return entries.firstOrNull { it.persistedValue == value } ?: Night
        }
    }
}

typealias SelfServiceDisplayMode = AppDisplayMode

private data class SelfServiceColors(
    val backgroundTop: Color,
    val backgroundBottom: Color,
    val panel: Color,
    val panelMuted: Color,
    val panelBorder: Color,
    val interactivePanel: Color,
    val highlightedPanel: Color,
    val title: Color,
    val subtitle: Color,
    val accent: Color,
    val accentText: Color,
    val success: Color,
    val successPanel: Color,
    val successMuted: Color,
    val error: Color,
    val errorPanel: Color,
    val errorMuted: Color,
    val scanOuter: Color,
    val scanInner: Color,
)

private val selfServiceNightColors = SelfServiceColors(
    backgroundTop = TfPayBluePalette.backgroundTop,
    backgroundBottom = TfPayBluePalette.backgroundBottom,
    panel = TfPayBluePalette.panel,
    panelMuted = TfPayBluePalette.panelMuted,
    panelBorder = TfPayBluePalette.panelBorder,
    interactivePanel = TfPayBluePalette.interactivePanel,
    highlightedPanel = Color(0xFF243A63),
    title = TfPayBluePalette.title,
    subtitle = TfPayBluePalette.subtitle,
    accent = Color(0xFFFFB547),
    accentText = TfPayBluePalette.backgroundTop,
    success = Color(0xFF1FC892),
    successPanel = Color(0xFF16342A),
    successMuted = Color(0xFFD8FFF2),
    error = Color(0xFFFF6B6B),
    errorPanel = Color(0xFF4B1F2C),
    errorMuted = Color(0xFFFFC8C8),
    scanOuter = Color(0xFF28497A),
    scanInner = Color(0xFF315A92),
)

private val selfServiceDayColors = SelfServiceColors(
    backgroundTop = Color(0xFFF7FAFD),
    backgroundBottom = Color(0xFFE6EDF5),
    panel = Color(0xFFFFFFFF),
    panelMuted = Color(0xFFF0F4F8),
    panelBorder = Color(0xFFB5C4D6),
    interactivePanel = Color(0xFFE3EBF4),
    highlightedPanel = Color(0xFFDCE8F7),
    title = Color(0xFF122033),
    subtitle = Color(0xFF44586F),
    accent = Color(0xFFCE7A00),
    accentText = Color(0xFF122033),
    success = Color(0xFF177A57),
    successPanel = Color(0xFFDFF5EA),
    successMuted = Color(0xFF1E5E47),
    error = Color(0xFFC53D3D),
    errorPanel = Color(0xFFFBE3E3),
    errorMuted = Color(0xFF7C2525),
    scanOuter = Color(0xFFD5E0EE),
    scanInner = Color(0xFFE7EEF7),
)

private object SelfServiceThemeState {
    var displayMode by mutableStateOf(AppDisplayMode.Night)

    val colors: SelfServiceColors
        get() = when (displayMode) {
            AppDisplayMode.Night -> selfServiceNightColors
            AppDisplayMode.Day -> selfServiceDayColors
        }
}

object AppDisplayModeManager {
    private const val preferencesName = "app_display_mode"
    private const val legacyPreferencesName = "self_service_display_mode"
    private const val displayModeKey = "display_mode"

    fun currentDisplayMode(context: Context): AppDisplayMode {
        val appPreferences = preferences(context)
        val legacyPreferences = legacyPreferences(context)
        return resolveStoredMode(
            storedValue = appPreferences.getString(displayModeKey, null),
            legacyValue = legacyPreferences.getString(displayModeKey, null),
        )
    }

    fun persistDisplayMode(context: Context, mode: AppDisplayMode) {
        preferences(context)
            .edit()
            .putString(displayModeKey, mode.persistedValue)
            .apply()
        legacyPreferences(context)
            .edit()
            .putString(displayModeKey, mode.persistedValue)
            .apply()
    }

    fun resolveStoredMode(storedValue: String?, legacyValue: String?): AppDisplayMode {
        return AppDisplayMode.fromPersistedValue(storedValue ?: legacyValue)
    }

    internal fun key(): String = displayModeKey
    internal fun preferences(context: Context) =
        context.applicationContext.getSharedPreferences(preferencesName, Context.MODE_PRIVATE)
    internal fun legacyPreferences(context: Context) =
        context.applicationContext.getSharedPreferences(legacyPreferencesName, Context.MODE_PRIVATE)
}

object SelfServiceDisplayModeManager {
    fun currentDisplayMode(context: Context): AppDisplayMode = AppDisplayModeManager.currentDisplayMode(context)
    fun persistDisplayMode(context: Context, mode: AppDisplayMode) = AppDisplayModeManager.persistDisplayMode(context, mode)
}

object SelfServicePalette {
    val backgroundTop get() = SelfServiceThemeState.colors.backgroundTop
    val backgroundBottom get() = SelfServiceThemeState.colors.backgroundBottom
    val panel get() = SelfServiceThemeState.colors.panel
    val panelMuted get() = SelfServiceThemeState.colors.panelMuted
    val panelBorder get() = SelfServiceThemeState.colors.panelBorder
    val interactivePanel get() = SelfServiceThemeState.colors.interactivePanel
    val highlightedPanel get() = SelfServiceThemeState.colors.highlightedPanel
    val title get() = SelfServiceThemeState.colors.title
    val subtitle get() = SelfServiceThemeState.colors.subtitle
    val accent get() = SelfServiceThemeState.colors.accent
    val accentText get() = SelfServiceThemeState.colors.accentText
    val success get() = SelfServiceThemeState.colors.success
    val successPanel get() = SelfServiceThemeState.colors.successPanel
    val successMuted get() = SelfServiceThemeState.colors.successMuted
    val error get() = SelfServiceThemeState.colors.error
    val errorPanel get() = SelfServiceThemeState.colors.errorPanel
    val errorMuted get() = SelfServiceThemeState.colors.errorMuted
    val scanOuter get() = SelfServiceThemeState.colors.scanOuter
    val scanInner get() = SelfServiceThemeState.colors.scanInner
}

object AppDisplayModeState {
    val current: AppDisplayMode
        get() = SelfServiceThemeState.displayMode
}

object SelfServiceDisplayModeState {
    val current: AppDisplayMode
        get() = AppDisplayModeState.current
}

@Composable
fun ObserveAppDisplayMode() {
    val context = LocalContext.current.applicationContext

    DisposableEffect(context) {
        val preferences = AppDisplayModeManager.preferences(context)
        val legacyPreferences = AppDisplayModeManager.legacyPreferences(context)
        val listener = android.content.SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
            if (key == null || key == AppDisplayModeManager.key()) {
                SelfServiceThemeState.displayMode = AppDisplayModeManager.currentDisplayMode(context)
            }
        }

        SelfServiceThemeState.displayMode = AppDisplayModeManager.currentDisplayMode(context)
        preferences.registerOnSharedPreferenceChangeListener(listener)
        legacyPreferences.registerOnSharedPreferenceChangeListener(listener)

        onDispose {
            preferences.unregisterOnSharedPreferenceChangeListener(listener)
            legacyPreferences.unregisterOnSharedPreferenceChangeListener(listener)
        }
    }
}

@Composable
fun ObserveSelfServiceDisplayMode() {
    ObserveAppDisplayMode()
}

@Composable
fun SelfServiceBackground(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(SelfServicePalette.backgroundTop, SelfServicePalette.backgroundBottom)
                )
            ),
        content = content
    )
}

@Composable
fun SelfServicePanel(
    modifier: Modifier = Modifier,
    borderColor: Color = SelfServicePalette.panelBorder,
    backgroundColor: Color = SelfServicePalette.panel,
    content: @Composable () -> Unit
) {
    Card(
        modifier = modifier,
        backgroundColor = backgroundColor,
        shape = RoundedCornerShape(16.dp),
        elevation = 0.dp
    ) {
        Box(
            modifier = Modifier
                .border(1.5.dp, borderColor, RoundedCornerShape(16.dp))
                .padding(14.dp)
        ) {
            content()
        }
    }
}

@Composable
fun SelfServiceHeadline(
    title: String,
    subtitle: String,
    subtitleColor: Color = SelfServicePalette.subtitle,
    titleFontSize: androidx.compose.ui.unit.TextUnit = 42.sp,
    subtitleFontSize: androidx.compose.ui.unit.TextUnit = 19.sp,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            text = title,
            color = SelfServicePalette.title,
            fontWeight = FontWeight.ExtraBold,
            fontSize = titleFontSize
        )
        Text(
            text = subtitle,
            color = subtitleColor,
            fontWeight = FontWeight.SemiBold,
            fontSize = subtitleFontSize
        )
    }
}

@Composable
fun SelfServiceLanguageSelector(modifier: Modifier = Modifier) {
    val activity = LocalActivity.current
    val context = LocalContext.current
    var selectedLanguage by remember(context) {
        mutableStateOf(AppLocaleManager.currentLanguage(context))
    }

    Row(
        modifier = modifier
            .background(SelfServicePalette.panelMuted, RoundedCornerShape(16.dp))
            .border(1.5.dp, SelfServicePalette.panelBorder, RoundedCornerShape(16.dp))
            .padding(horizontal = 6.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        AppLanguage.entries.forEach { language ->
            val selected = language == selectedLanguage

            Text(
                text = language.shortLabel,
                color = if (selected) {
                    SelfServicePalette.accentText
                } else {
                    SelfServicePalette.subtitle
                },
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .background(
                        if (selected) SelfServicePalette.accent else Color.Transparent,
                        RoundedCornerShape(10.dp)
                    )
                    .clickable {
                        if (language == selectedLanguage) {
                            return@clickable
                        }

                        selectedLanguage = language
                        if (activity != null) {
                            AppLocaleManager.switchLanguage(activity, language)
                        } else {
                            AppLocaleManager.persistLanguage(context, language)
                        }
                    }
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            )
        }
    }
}

@Composable
fun SelfServiceDisplayModeToggle(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val currentMode = SelfServiceDisplayModeState.current
    val nextMode = if (currentMode == SelfServiceDisplayMode.Day) {
        SelfServiceDisplayMode.Night
    } else {
        SelfServiceDisplayMode.Day
    }
    val contentDescription = if (nextMode == SelfServiceDisplayMode.Day) {
        stringResource(R.string.settings_selfservice_display_day)
    } else {
        stringResource(R.string.settings_selfservice_display_night)
    }

    Card(
        modifier = modifier,
        backgroundColor = SelfServicePalette.panelMuted,
        shape = RoundedCornerShape(16.dp),
        elevation = 0.dp,
    ) {
        Box(
            modifier = Modifier.border(1.5.dp, SelfServicePalette.panelBorder, RoundedCornerShape(16.dp))
        ) {
            IconButton(
                onClick = {
                    SelfServiceDisplayModeManager.persistDisplayMode(context, nextMode)
                }
            ) {
                Icon(
                    imageVector = if (currentMode == SelfServiceDisplayMode.Day) {
                        Icons.Filled.Brightness2
                    } else {
                        Icons.Filled.WbSunny
                    },
                    contentDescription = contentDescription,
                    tint = SelfServicePalette.title,
                )
            }
        }
    }
}

@Composable
fun SelfServiceSectionHeader(
    title: String,
    subtitle: String,
    subtitleColor: Color = SelfServicePalette.subtitle,
    titleFontSize: androidx.compose.ui.unit.TextUnit = 42.sp,
    subtitleFontSize: androidx.compose.ui.unit.TextUnit = 19.sp,
    showLanguageSelector: Boolean = true,
    headerAction: (@Composable () -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        if (showLanguageSelector || headerAction != null) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (showLanguageSelector) {
                    SelfServiceLanguageSelector()
                }
                headerAction?.invoke()
            }
        }

        SelfServiceHeadline(
            title = title,
            subtitle = subtitle,
            subtitleColor = subtitleColor,
            titleFontSize = titleFontSize,
            subtitleFontSize = subtitleFontSize
        )
    }
}

@Composable
fun SelfServiceCountdownCard(
    label: String,
    subLabel: String,
    progress: Float,
    modifier: Modifier = Modifier
) {
    SelfServicePanel(
        modifier = modifier,
        backgroundColor = SelfServicePalette.panelMuted
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                text = label,
                color = SelfServicePalette.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold
            )
            LinearProgressIndicator(
                progress = progress.coerceIn(0f, 1f),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(10.dp),
                color = SelfServicePalette.accent,
                backgroundColor = SelfServicePalette.panelBorder
            )
            Text(
                text = subLabel,
                color = SelfServicePalette.subtitle,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
fun selfServicePrimaryButtonColors(): ButtonColors = ButtonDefaults.buttonColors(
    backgroundColor = SelfServicePalette.accent,
    contentColor = SelfServicePalette.accentText,
    disabledBackgroundColor = SelfServicePalette.panelBorder,
    disabledContentColor = SelfServicePalette.subtitle
)

@Composable
fun selfServiceSecondaryButtonColors(): ButtonColors = ButtonDefaults.buttonColors(
    backgroundColor = SelfServicePalette.panel,
    contentColor = SelfServicePalette.title,
    disabledBackgroundColor = SelfServicePalette.panelBorder,
    disabledContentColor = SelfServicePalette.subtitle
)

@Composable
fun SelfServiceActionButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    primary: Boolean = true,
    enabled: Boolean = true,
    fontSize: androidx.compose.ui.unit.TextUnit = 18.sp,
    height: Dp = 56.dp,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(height),
        shape = RoundedCornerShape(14.dp),
        colors = if (primary) selfServicePrimaryButtonColors() else selfServiceSecondaryButtonColors()
    ) {
        Text(
            text = text,
            fontSize = fontSize,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun SelfServiceBottomActions(
    primaryText: String,
    onPrimary: () -> Unit,
    secondaryText: String,
    onSecondary: () -> Unit,
    buttonTextSize: androidx.compose.ui.unit.TextUnit = 18.sp,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        SelfServiceActionButton(
            text = primaryText,
            onClick = onPrimary,
            modifier = Modifier.weight(1f),
            primary = true,
            fontSize = buttonTextSize
        )
        SelfServiceActionButton(
            text = secondaryText,
            onClick = onSecondary,
            modifier = Modifier.weight(1f),
            primary = false,
            fontSize = buttonTextSize
        )
    }
}
