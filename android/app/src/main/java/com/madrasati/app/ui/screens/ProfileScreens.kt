package com.madrasati.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.madrasati.app.di.AppContainer
import com.madrasati.app.ui.components.AppTopBar
import com.madrasati.app.ui.components.EmptyState
import com.madrasati.app.ui.components.ErrorState
import com.madrasati.app.ui.components.LoadingState
import com.madrasati.app.ui.theme.Danger
import com.madrasati.app.ui.theme.Primary
import com.madrasati.app.ui.theme.Success
import com.madrasati.app.ui.theme.TextMuted
import com.madrasati.app.ui.theme.Warning
import com.madrasati.app.ui.viewmodel.ProfileViewModel
import com.madrasati.app.util.Language
import com.madrasati.app.util.formatMoney
import com.madrasati.app.util.statusLabel
import com.madrasati.app.util.t

@Composable
fun ProfileScreen(
    onLogin: () -> Unit,
    onRegister: () -> Unit,
    onBookings: () -> Unit,
    onApplications: () -> Unit,
) {
    val vm: ProfileViewModel = viewModel {
        ProfileViewModel(AppContainer.get.authRepository, AppContainer.get.catalogRepository)
    }
    val user by vm.user.collectAsStateWithLifecycle()

    LaunchedEffectRefresh(vm, user)

    Scaffold(topBar = { AppTopBar(title = t("profile")) }) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (user == null) {
                GuestProfile(onLogin, onRegister)
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                shape = RoundedCornerShape(28.dp),
                                color = Primary.copy(alpha = 0.1f),
                            ) {
                                Icon(
                                    Icons.Filled.Person,
                                    null,
                                    tint = Primary,
                                    modifier = Modifier.padding(14.dp).size(28.dp),
                                )
                            }
                            Spacer(Modifier.size(16.dp))
                            Column {
                                Text(user!!.name.orEmpty(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                                Text(user!!.email.orEmpty(), style = MaterialTheme.typography.bodyMedium, color = TextMuted)
                                Spacer(Modifier.height(2.dp))
                                Text(
                                    t("role.${user!!.role}"),
                                    style = MaterialTheme.typography.labelMedium,
                                    color = Primary,
                                )
                            }
                        }
                    }
                    item { HorizontalDivider() }
                    item {
                        ProfileAction(title = t("myBookings"), onClick = onBookings)
                    }
                    item {
                        ProfileAction(title = t("myApplications"), onClick = onApplications)
                    }
                    item { HorizontalDivider() }
                    item {
                        LanguageRow()
                    }
                    item {
                        Button(
                            onClick = { vm.logout {} },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(t("logout"))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LaunchedEffectRefresh(vm: ProfileViewModel, user: com.madrasati.app.data.model.UserDto?) {
    androidx.compose.runtime.LaunchedEffect(user?.id) {
        vm.load()
    }
}

@Composable
private fun GuestProfile(onLogin: () -> Unit, onRegister: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Surface(shape = RoundedCornerShape(36.dp), color = Primary.copy(alpha = 0.1f)) {
            Icon(Icons.Filled.Person, null, tint = Primary, modifier = Modifier.padding(20.dp).size(40.dp))
        }
        Spacer(Modifier.height(16.dp))
        Text(t("guest"), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text(t("loginPrompt"), color = TextMuted, style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(24.dp))
        Button(onClick = onLogin, modifier = Modifier.fillMaxWidth().height(48.dp)) {
            Text(t("login"))
        }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(onClick = onRegister, modifier = Modifier.fillMaxWidth().height(48.dp)) {
            Text(t("register"))
        }
    }
}

@Composable
private fun ProfileAction(title: String, onClick: () -> Unit) {
    androidx.compose.material3.TextButton(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Text(title, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun LanguageRow() {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(t("language"), style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
        Text(
            text = if (Language.isArabic) "العربية" else "English",
            color = Primary,
            style = MaterialTheme.typography.labelLarge,
        )
    }
}

@Composable
fun MyBookingsScreen(onBack: () -> Unit) {
    val vm: ProfileViewModel = viewModel {
        ProfileViewModel(AppContainer.get.authRepository, AppContainer.get.catalogRepository)
    }
    val user by vm.user.collectAsStateWithLifecycle()
    androidx.compose.runtime.LaunchedEffect(user?.id) { vm.load() }

    Scaffold(topBar = { AppTopBar(title = t("myBookings"), onBack = onBack) }) { padding ->
        when {
            vm.loading -> LoadingState(Modifier.padding(padding))
            vm.error != null -> ErrorState(vm.error, onRetry = { vm.load() }, Modifier.padding(padding))
            vm.bookings.isEmpty() -> EmptyState(t("emptyBookings"), Modifier.padding(padding))
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(vm.bookings, key = { it.id }) { booking ->
                    BookingRow(booking)
                }
            }
        }
    }
}

@Composable
private fun BookingRow(booking: com.madrasati.app.data.model.Booking) {
    Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = t("booking.${booking.bookingType ?: "other"}"),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                )
                StatusChip(booking.status)
            }
            if (!booking.startTime.isNullOrBlank()) {
                Spacer(Modifier.height(6.dp))
                Text(booking.startTime, style = MaterialTheme.typography.bodyMedium, color = TextMuted)
            }
            if (booking.amount != null) {
                Spacer(Modifier.height(6.dp))
                Text(formatMoney(booking.amount, booking.currency), color = Primary, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
fun MyApplicationsScreen(onBack: () -> Unit) {
    val vm: ProfileViewModel = viewModel {
        ProfileViewModel(AppContainer.get.authRepository, AppContainer.get.catalogRepository)
    }
    val user by vm.user.collectAsStateWithLifecycle()
    androidx.compose.runtime.LaunchedEffect(user?.id) { vm.load() }

    Scaffold(topBar = { AppTopBar(title = t("myApplications"), onBack = onBack) }) { padding ->
        when {
            vm.loading -> LoadingState(Modifier.padding(padding))
            vm.error != null -> ErrorState(vm.error, onRetry = { vm.load() }, Modifier.padding(padding))
            vm.applications.isEmpty() -> EmptyState(t("emptyApplications"), Modifier.padding(padding))
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(vm.applications, key = { it.id }) { app ->
                    Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = app.applicantName.orEmpty(),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.weight(1f),
                                )
                                StatusChip(app.status)
                            }
                            if (!app.programName.isNullOrBlank()) {
                                Spacer(Modifier.height(6.dp))
                                Text(app.programName, style = MaterialTheme.typography.bodyMedium, color = TextMuted)
                            }
                            if (!app.submittedAt.isNullOrBlank()) {
                                Spacer(Modifier.height(6.dp))
                                Text(app.submittedAt, style = MaterialTheme.typography.labelMedium, color = TextMuted)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusChip(status: String?) {
    val color = when (status) {
        "confirmed", "accepted", "enrolled", "completed", "booked", "submitted" -> Success
        "cancelled", "rejected", "no_show", "expired" -> Danger
        "pending", "under_review", "waiting_list", "offered", "more_information_required", "assessment_interview" -> Warning
        else -> TextMuted
    }
    Surface(color = color.copy(alpha = 0.12f), shape = RoundedCornerShape(8.dp)) {
        Text(
            text = statusLabel(status),
            style = MaterialTheme.typography.labelMedium,
            color = color,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
        )
    }
}
