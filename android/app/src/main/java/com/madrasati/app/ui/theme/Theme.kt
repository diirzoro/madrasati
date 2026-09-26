package com.madrasati.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(
    primary = Primary,
    onPrimary = Surface,
    primaryContainer = PrimaryDark,
    onPrimaryContainer = Surface,
    secondary = Accent,
    onSecondary = Surface,
    background = Background,
    onBackground = TextPrimary,
    surface = Surface,
    onSurface = TextPrimary,
    surfaceVariant = OutlineSoft,
    onSurfaceVariant = TextMuted,
    error = Danger,
)

private val DarkColors = darkColorScheme(
    primary = Primary,
    onPrimary = Surface,
    primaryContainer = PrimaryDark,
    onPrimaryContainer = Surface,
    secondary = Accent,
    onSecondary = Surface,
    background = Color_dark_bg,
    onBackground = Color_dark_text,
    surface = Color_dark_surface,
    onSurface = Color_dark_text,
    surfaceVariant = Color_dark_variant,
    onSurfaceVariant = Color_dark_muted,
    error = Danger,
)

@Composable
fun MadrasatiTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = Typography,
        content = content,
    )
}
