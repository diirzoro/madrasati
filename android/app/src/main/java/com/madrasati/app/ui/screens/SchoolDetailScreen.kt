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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.madrasati.app.ui.components.AppTopBar
import com.madrasati.app.ui.components.ErrorState
import com.madrasati.app.ui.components.InfoLabel
import com.madrasati.app.ui.components.LoadingState
import com.madrasati.app.ui.components.PriceTag
import com.madrasati.app.ui.components.RemoteImage
import com.madrasati.app.ui.components.VerifiedBadge
import com.madrasati.app.ui.theme.Primary
import com.madrasati.app.ui.theme.Success
import com.madrasati.app.ui.theme.TextMuted
import com.madrasati.app.ui.theme.Warning
import com.madrasati.app.ui.viewmodel.SchoolDetailViewModel
import com.madrasati.app.util.I18n
import com.madrasati.app.util.deliveryModeLabel
import com.madrasati.app.util.formatMoney
import com.madrasati.app.util.t
import com.madrasati.app.util.typeLabel

@Composable
fun SchoolDetailScreen(
    vm: SchoolDetailViewModel,
    onBack: () -> Unit,
    onBookVisit: () -> Unit,
    onApply: () -> Unit,
) {
    Scaffold(
        topBar = { AppTopBar(title = vm.org?.name ?: "", onBack = onBack) },
        bottomBar = {
            if (vm.org != null) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    OutlinedButton(onClick = onBookVisit, modifier = Modifier.weight(1f)) {
                        Text(t("bookVisit"))
                    }
                    Button(onClick = onApply, modifier = Modifier.weight(1f)) {
                        Text(t("applyNow"))
                    }
                }
            }
        },
    ) { padding ->
        when {
            vm.loading -> LoadingState(Modifier.padding(padding))
            vm.error != null -> ErrorState(vm.error, onRetry = { vm.load() }, Modifier.padding(padding))
            vm.org == null -> {}
            else -> {
                val org = vm.org!!
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(padding),
                    contentPadding = PaddingValues(bottom = 16.dp),
                ) {
                    item {
                        RemoteImage(
                            url = org.image,
                            contentDescription = org.name,
                            modifier = Modifier.fillMaxWidth().height(200.dp),
                            shape = RoundedCornerShape(0.dp),
                        )
                    }
                    item {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = org.name.orEmpty(),
                                    style = MaterialTheme.typography.headlineMedium,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.weight(1f),
                                )
                                VerifiedBadge(verified = org.verified)
                            }
                            Spacer(Modifier.height(4.dp))
                            Text(typeLabel(org.type), style = MaterialTheme.typography.labelLarge, color = Primary)

                            Spacer(Modifier.height(8.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                if (org.rating != null && org.rating > 0) {
                                    Icon(Icons.Filled.Star, null, tint = Primary, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(org.rating.toString(), fontWeight = FontWeight.SemiBold)
                                    Spacer(Modifier.width(16.dp))
                                }
                                val location = listOfNotNull(org.governorate, org.district)
                                    .filter { it.isNotBlank() }.joinToString("، ")
                                if (location.isNotEmpty()) {
                                    Icon(Icons.Filled.LocationOn, null, tint = TextMuted, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(location, color = TextMuted)
                                }
                            }
                        }
                    }

                    item { HorizontalDivider() }

                    item {
                        Column(modifier = Modifier.padding(16.dp)) {
                            SectionTitle(t("about"))
                            if (!org.description.isNullOrBlank()) {
                                Text(org.description, style = MaterialTheme.typography.bodyLarge)
                            } else if (!org.bio.isNullOrBlank()) {
                                Text(org.bio, style = MaterialTheme.typography.bodyLarge)
                            } else {
                                Text(t("noResults"), color = TextMuted)
                            }
                        }
                    }

                    item { HorizontalDivider() }

                    item {
                        Column(modifier = Modifier.padding(16.dp)) {
                            SectionTitle(t("contact"))
                            InfoLabel(t("phone"), org.phone)
                            InfoLabel(t("email"), org.email)
                            InfoLabel(t("website"), org.website)
                            InfoLabel(t("address"), org.address)
                        }
                    }

                    if (!org.facilities.isNullOrEmpty()) {
                        item { HorizontalDivider() }
                        item {
                            Column(modifier = Modifier.padding(16.dp)) {
                                SectionTitle(t("facilities"))
                                org.facilities.forEach { FacilityRow(it) }
                            }
                        }
                    }

                    item { HorizontalDivider() }

                    item {
                        Column(modifier = Modifier.padding(16.dp)) {
                            SectionTitle(t("stages"))
                            if (vm.offering?.stages.isNullOrEmpty()) {
                                Text(t("noResults"), color = TextMuted)
                            } else {
                                vm.offering!!.stages.forEach { stage ->
                                    OfferingStageRow(
                                        name = stage.stageName ?: stage.stageCode ?: "",
                                        deliveryMode = stage.deliveryMode,
                                        remainingSeats = stage.remainingSeats,
                                        capacity = stage.capacity,
                                        amount = stage.fee?.amount,
                                        currency = stage.fee?.currency,
                                        gated = vm.offering!!.pricingGated,
                                    )
                                }
                            }
                        }
                    }

                    item { HorizontalDivider() }

                    item {
                        Column(modifier = Modifier.padding(16.dp)) {
                            SectionTitle(t("subjects"))
                            if (vm.offering?.subjects.isNullOrEmpty()) {
                                Text(t("noResults"), color = TextMuted)
                            } else {
                                vm.offering!!.subjects.forEach { subject ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            subject.name.orEmpty(),
                                            style = MaterialTheme.typography.bodyLarge,
                                            modifier = Modifier.weight(1f),
                                        )
                                        if (!vm.offering!!.pricingGated && subject.amount != null) {
                                            PriceTag(formatMoney(subject.amount, subject.currency))
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (vm.offering?.pricingGated == true) {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                                shape = RoundedCornerShape(12.dp),
                            ) {
                                Text(
                                    text = t("pricingGated"),
                                    modifier = Modifier.padding(16.dp),
                                    color = TextMuted,
                                )
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

@Composable
private fun FacilityRow(facility: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Filled.Star, null, tint = Primary, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(8.dp))
        Text(facility, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun OfferingStageRow(
    name: String,
    deliveryMode: String?,
    remainingSeats: Int?,
    capacity: Int?,
    amount: Double?,
    currency: String?,
    gated: Boolean,
) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(name, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
            if (!gated && amount != null) {
                PriceTag(formatMoney(amount, currency), accent = true)
            }
        }
        Spacer(Modifier.height(4.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = deliveryModeLabel(deliveryMode),
                style = MaterialTheme.typography.labelMedium,
                color = Primary,
            )
            Spacer(Modifier.width(12.dp))
            val seatsText = when {
                capacity == null -> t("notDeclared")
                remainingSeats != null && remainingSeats > 0 -> "$remainingSeats ${t("seatsAvailable")}"
                remainingSeats != null -> t("registrationClosed")
                else -> t("notDeclared")
            }
            val seatsColor = when {
                capacity == null -> TextMuted
                remainingSeats != null && remainingSeats > 0 -> Success
                else -> Warning
            }
            Text(
                text = seatsText,
                style = MaterialTheme.typography.labelMedium,
                color = seatsColor,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}
