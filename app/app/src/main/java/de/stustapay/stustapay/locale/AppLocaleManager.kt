package de.stustapay.stustapay.locale

import android.app.Activity
import android.content.Context
import android.content.res.Configuration
import java.util.Locale

enum class AppLanguage(val languageTag: String, val shortLabel: String) {
    German(languageTag = "de", shortLabel = "DE"),
    English(languageTag = "en", shortLabel = "EN"),
    Dutch(languageTag = "nl", shortLabel = "NL");

    companion object {
        fun fromLanguageTag(languageTag: String?): AppLanguage {
            val normalizedTag = languageTag?.lowercase(Locale.ROOT)
            return entries.firstOrNull { it.languageTag == normalizedTag } ?: German
        }
    }
}

object AppLocaleManager {
    private const val preferencesName = "app_locale"
    private const val preferredLanguageKey = "preferred_language"

    fun currentLanguage(context: Context): AppLanguage {
        val preferences = context.getSharedPreferences(preferencesName, Context.MODE_PRIVATE)
        return AppLanguage.fromLanguageTag(preferences.getString(preferredLanguageKey, null))
    }

    fun persistLanguage(context: Context, language: AppLanguage) {
        context.getSharedPreferences(preferencesName, Context.MODE_PRIVATE)
            .edit()
            .putString(preferredLanguageKey, language.languageTag)
            .apply()
    }

    fun wrapContext(base: Context): Context {
        return wrapContext(base, currentLanguage(base))
    }

    fun applyStoredLocale(context: Context) {
        setDefaultLocale(currentLanguage(context))
    }

    fun switchLanguage(activity: Activity, language: AppLanguage) {
        if (currentLanguage(activity) == language) {
            return
        }

        persistLanguage(activity, language)
        setDefaultLocale(language)
        activity.recreate()
    }

    private fun wrapContext(base: Context, language: AppLanguage): Context {
        val locale = Locale.forLanguageTag(language.languageTag)
        Locale.setDefault(locale)

        val configuration = Configuration(base.resources.configuration)
        configuration.setLocale(locale)
        configuration.setLayoutDirection(locale)
        return base.createConfigurationContext(configuration)
    }

    private fun setDefaultLocale(language: AppLanguage) {
        Locale.setDefault(Locale.forLanguageTag(language.languageTag))
    }
}
