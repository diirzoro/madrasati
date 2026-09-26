package com.madrasati.app.ui.screens

import android.app.DatePickerDialog
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.madrasati.app.ui.components.AppTopBar
import com.madrasati.app.ui.components.LoadingState
import com.madrasati.app.ui.theme.Danger
import com.madrasati.app.ui.theme.Success
import com.madrasati.app.ui.theme.TextMuted
import com.madrasati.app.ui.viewmodel.BookingKind
import com.madrasati.app.ui.viewmodel.BookingViewModel
import com.madrasati.app.util.I18n
import com.madrasati.app.util.t
import java.util.Calendar
import java.util.Locale

private val bookingTypes = listOf(
    "teacher_lesson", "school_visit", "admission_interview",
    "parent_meeting", "institute_course", "workshop", "other",
)

@Composable
fun BookingScreen(
    vm: BookingViewModel,
    onBack: () -> Unit,
) {
    Scaffold(topBar = { AppTopBar(title = t("bookingTitle"), onBack = onBack) }) { padding ->
        when {
            vm.submitted -> SuccessView(onBack)
            vm.loading -> LoadingState(Modifier.padding(padding))
            else -> {
                val contextTitle = when {
                    vm.kind == BookingKind.TEACHER -> vm.teacher?.userName ?: vm.teacher?.nameEn.orEmpty()
                    else -> vm.org?.name.orEmpty()
                }
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(24.dp),
                ) {
                    if (contextTitle.isNotBlank()) {
                        Text(contextTitle, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(16.dp))
                    }

                    LabeledDropdown(
                        label = t("bookingType"),
                        selected = t("booking.${vm.bookingType}"),
                        options = bookingTypes.map { it to t("booking.$it") },
                        onSelect = { vm.bookingType = it },
                    )

                    if (vm.kind == BookingKind.TEACHER) {
                        Spacer(Modifier.height(12.dp))
                        val subjects = vm.teacher?.subjects ?: emptyList()
                        LabeledDropdown(
                            label = t("subject"),
                            selected = vm.subjectId?.let { id ->
                                subjects.firstOrNull { it.subjectId == id }?.name ?: t("all")
                            } ?: t("all"),
                            options = listOf(null to t("all")) + subjects.map { it.subjectId to it.name.orEmpty() },
                            onSelect = { vm.subjectId = it },
                        )
                    } else {
                        Spacer(Modifier.height(12.dp))
                        OutlinedTextField(
                            value = vm.seats,
                            onValueChange = { vm.seats = it.filter(Char::isDigit) },
                            label = { Text(t("seats")) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }

                    Spacer(Modifier.height(12.dp))
                    DateField(value = vm.date, onValueChange = { vm.date = it })

                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = vm.notes,
                        onValueChange = { vm.notes = it },
                        label = { Text(t("bookingNotes")) },
                        placeholder = { Text(t("bookingNotesHint")) },
                        minLines = 3,
                        modifier = Modifier.fillMaxWidth(),
                    )

                    if (vm.error != null) {
                        Spacer(Modifier.height(12.dp))
                        Text(vm.error.orEmpty(), color = Danger, style = MaterialTheme.typography.bodyMedium)
                    }

                    Spacer(Modifier.height(24.dp))
                    Button(
                        onClick = { vm.submit {} },
                        enabled = !vm.submitting,
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                    ) {
                        if (vm.submitting) {
                            CircularProgressIndicator(modifier = Modifier.height(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                        } else {
                            Text(t("confirm"))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DateField(value: String, onValueChange: (String) -> Unit) {
    val context = LocalContext.current
    var showPicker by remember { mutableStateOf(false) }

    OutlinedTextField(
        value = value,
        onValueChange = {},
        readOnly = true,
        label = { Text(t("bookingDate")) },
        modifier = Modifier.fillMaxWidth().clickable { showPicker = true },
    )

    if (showPicker) {
        val calendar = Calendar.getInstance()
        DatePickerDialog(
            context,
            { _, year, month, day ->
                onValueChange(String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, day))
            },
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH),
            calendar.get(Calendar.DAY_OF_MONTH),
        ).apply {
            setOnDismissListener { showPicker = false }
            show()
        }
    }
}

@Composable
private fun <T> LabeledDropdown(
    label: String,
    selected: String,
    options: List<Pair<T, String>>,
    onSelect: (T) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }

    OutlinedTextField(
        value = selected,
        onValueChange = {},
        readOnly = true,
        label = { Text(label) },
        modifier = Modifier.fillMaxWidth().clickable { expanded = true },
    )

    androidx.compose.material3.DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
        options.forEach { (value, labelText) ->
            androidx.compose.material3.DropdownMenuItem(
                text = { Text(labelText) },
                onClick = {
                    expanded = false
                    onSelect(value)
                },
            )
        }
    }
}

@Composable
private fun SuccessView(onBack: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = t("bookingSuccess"),
            style = MaterialTheme.typography.titleLarge,
            color = Success,
            fontWeight = FontWeight.Bold,
        )
        Spacer(Modifier.height(16.dp))
        Button(onClick = onBack, modifier = Modifier.fillMaxWidth()) {
            Text(t("back"))
        }
    }
}
