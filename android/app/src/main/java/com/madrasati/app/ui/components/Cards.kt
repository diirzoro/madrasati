package com.madrasati.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.madrasati.app.data.model.Organization
import com.madrasati.app.data.model.Teacher
import com.madrasati.app.ui.theme.OutlineSoft
import com.madrasati.app.ui.theme.Primary
import com.madrasati.app.ui.theme.TextMuted
import com.madrasati.app.util.I18n
import com.madrasati.app.util.formatMoney
import com.madrasati.app.util.typeLabel

@Composable
fun OrgCard(
    org: Organization,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
    ) {
        Column {
            RemoteImage(
                url = org.image,
                contentDescription = org.name,
                modifier = Modifier.fillMaxWidth().height(150.dp),
                shape = RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp),
            )
            Column(modifier = Modifier.padding(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = org.name.orEmpty(),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    Spacer(Modifier.width(6.dp))
                    VerifiedBadge(verified = org.verified)
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    text = typeLabel(org.type),
                    style = MaterialTheme.typography.labelMedium,
                    color = Primary,
                )
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (org.rating != null && org.rating > 0) {
                        Icon(Icons.Filled.Star, null, tint = Primary, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(3.dp))
                        Text(
                            text = org.rating.toString(),
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Spacer(Modifier.width(12.dp))
                    }
                    val location = listOfNotNull(org.governorate, org.district)
                        .filter { it.isNotBlank() }
                        .joinToString("، ")
                    if (location.isNotEmpty()) {
                        Icon(Icons.Filled.LocationOn, null, tint = TextMuted, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(3.dp))
                        Text(
                            text = location,
                            style = MaterialTheme.typography.labelMedium,
                            color = TextMuted,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun TeacherCard(
    teacher: Teacher,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            RemoteImage(
                url = teacher.avatarUrl,
                contentDescription = teacher.userName,
                modifier = Modifier.size(56.dp),
                shape = RoundedCornerShape(28.dp),
            )
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = teacher.userName ?: teacher.nameEn.orEmpty(),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                    Spacer(Modifier.width(6.dp))
                    VerifiedBadge(verified = teacher.verified)
                }
                if (!teacher.headline.isNullOrBlank()) {
                    Text(
                        text = teacher.headline,
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextMuted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Spacer(Modifier.height(4.dp))
                val subjectNames = teacher.subjects.mapNotNull { it.name }.take(3).joinToString(" · ")
                if (subjectNames.isNotBlank()) {
                    Text(
                        text = subjectNames,
                        style = MaterialTheme.typography.labelMedium,
                        color = Primary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            Spacer(Modifier.width(8.dp))
            if (!teacher.pricingGated && teacher.hourlyRate != null) {
                PriceTag(text = formatMoney(teacher.hourlyRate, teacher.currency))
            }
        }
    }
}
