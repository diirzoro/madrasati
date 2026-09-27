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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.madrasati.app.ui.components.AppTopBar
import com.madrasati.app.ui.components.ErrorState
import com.madrasati.app.ui.components.LoadingState
import com.madrasati.app.ui.components.PriceTag
import com.madrasati.app.ui.components.RemoteImage
import com.madrasati.app.ui.components.VerifiedBadge
import com.madrasati.app.ui.theme.Primary
import com.madrasati.app.ui.theme.TextMuted
import com.madrasati.app.ui.viewmodel.TeacherDetailViewModel
import com.madrasati.app.util.I18n
import com.madrasati.app.util.dayLabel
import com.madrasati.app.util.formatMoney
import com.madrasati.app.util.t

@Composable
fun TeacherDetailScreen(
    vm: TeacherDetailViewModel,
    onBack: () -> Unit,
    onBook: () -> Unit,
    onLogin: () -> Unit,
) {
    Scaffold(
        topBar = { AppTopBar(title = vm.teacher?.userName ?: "", onBack = onBack) },
        bottomBar = {
            if (vm.teacher != null) {
                Button(
                    onClick = onBook,
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                ) {
                    Text(t("bookLesson"))
                }
            }
        },
    ) { padding ->
        when {
            vm.loading -> LoadingState(Modifier.padding(padding))
            vm.error != null -> ErrorState(vm.error, onRetry = { vm.load() }, Modifier.padding(padding))
            vm.teacher == null -> {}
            else -> {
                val teacher = vm.teacher!!
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(padding),
                    contentPadding = PaddingValues(bottom = 16.dp),
                ) {
                    item {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            RemoteImage(
                                url = teacher.avatarUrl,
                                contentDescription = teacher.userName,
                                modifier = Modifier.size(96.dp),
                                shape = RoundedCornerShape(48.dp),
                            )
                            Spacer(Modifier.height(12.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = teacher.userName ?: teacher.nameEn.orEmpty(),
                                    style = MaterialTheme.typography.headlineMedium,
                                    fontWeight = FontWeight.Bold,
                                )
                                Spacer(Modifier.width(8.dp))
                                VerifiedBadge(verified = teacher.verified)
                            }
                            if (!teacher.headline.isNullOrBlank()) {
                                Text(
                                    teacher.headline,
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = TextMuted,
                                )
                            }
                            val location = listOfNotNull(teacher.governorateName, teacher.districtName)
                                .filter { it.isNotBlank() }.joinToString("، ")
                            if (location.isNotEmpty()) {
                                Spacer(Modifier.height(4.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Filled.LocationOn, null, tint = TextMuted, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(location, color = TextMuted, style = MaterialTheme.typography.labelMedium)
                                }
                            }
                        }
                    }

                    item { HorizontalDivider() }

                    item {
                        Column(modifier = Modifier.padding(16.dp)) {
                            SectionTitle(t("about"))
                            if (!teacher.bio.isNullOrBlank()) {
                                Text(teacher.bio, style = MaterialTheme.typography.bodyLarge)
                            } else {
                                Text(t("noResults"), color = TextMuted)
                            }
                            if (teacher.experienceYears != null) {
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    text = "${teacher.experienceYears} ${t("years")} ${t("experience")}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = TextMuted,
                                )
                            }
                        }
                    }

                    if (teacher.skills.isNotEmpty()) {
                        item { HorizontalDivider() }
                        item {
                            Column(modifier = Modifier.padding(16.dp)) {
                                SectionTitle(t("skills"))
                                Text(teacher.skills.joinToString("، "), style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }

                    item { HorizontalDivider() }

                    item {
                        Column(modifier = Modifier.padding(16.dp)) {
                            SectionTitle(t("subjectsTaught"))
                            if (teacher.subjects.isEmpty()) {
                                Text(t("noResults"), color = TextMuted)
                            } else {
                                teacher.subjects.forEach { subject ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            subject.name.orEmpty(),
                                            style = MaterialTheme.typography.bodyLarge,
                                            modifier = Modifier.weight(1f),
                                        )
                                        if (!teacher.pricingGated && subject.amount != null) {
                                            PriceTag(formatMoney(subject.amount, subject.currency))
                                        }
                                    }
                                }
                                if (teacher.pricingGated) {
                                    TextButton(onClick = onLogin) {
                                        Text(t("pricingLoginPrompt"))
                                    }
                                }
                            }
                        }
                    }

                    if (teacher.qualifications.isNotEmpty()) {
                        item { HorizontalDivider() }
                        item {
                            Column(modifier = Modifier.padding(16.dp)) {
                                SectionTitle(t("qualifications"))
                                teacher.qualifications.forEach { q ->
                                    Text(
                                        text = listOfNotNull(
                                            q.title,
                                            q.institutionName,
                                            q.degree,
                                        ).filter { it.isNotBlank() }.joinToString(" — "),
                                        style = MaterialTheme.typography.bodyMedium,
                                        modifier = Modifier.padding(vertical = 4.dp),
                                    )
                                }
                            }
                        }
                    }

                    if (teacher.availability.isNotEmpty()) {
                        item { HorizontalDivider() }
                        item {
                            Column(modifier = Modifier.padding(16.dp)) {
                                SectionTitle(t("availability"))
                                teacher.availability.forEach { slot ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            dayLabel(slot.dayOfWeek),
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.width(96.dp),
                                        )
                                        Text(
                                            "${slot.startTime ?: ""} - ${slot.endTime ?: ""}",
                                            style = MaterialTheme.typography.bodyMedium,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleLarge,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(bottom = 8.dp),
    )
}
