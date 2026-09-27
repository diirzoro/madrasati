package com.madrasati.app.ui.screens

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.madrasati.app.ui.components.AppTopBar
import com.madrasati.app.ui.components.LoadingState
import com.madrasati.app.ui.theme.Danger
import com.madrasati.app.ui.theme.Success
import com.madrasati.app.ui.viewmodel.AdmissionViewModel
import com.madrasati.app.util.I18n
import com.madrasati.app.util.t

@Composable
fun AdmissionScreen(
    vm: AdmissionViewModel,
    onBack: () -> Unit,
) {
    Scaffold(topBar = { AppTopBar(title = t("admissionTitle"), onBack = onBack) }) { padding ->
        when {
            vm.submitted -> SuccessView(onBack)
            vm.loading -> LoadingState(Modifier.padding(padding))
            else -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(24.dp),
                ) {
                    val orgName = vm.org?.name.orEmpty()
                    if (orgName.isNotBlank()) {
                        Text(orgName, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(16.dp))
                    }

                    OutlinedTextField(
                        value = vm.studentName,
                        onValueChange = { vm.studentName = it },
                        label = { Text(t("studentName")) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = vm.phone,
                        onValueChange = { vm.phone = it },
                        label = { Text(t("phone")) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = vm.email,
                        onValueChange = { vm.email = it },
                        label = { Text(t("email")) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )

                    val stages = vm.offering?.stages ?: emptyList()
                    if (stages.isNotEmpty()) {
                        Spacer(Modifier.height(12.dp))
                        LabeledDropdown(
                            label = t("stage"),
                            selected = vm.stageId?.let { id ->
                                stages.firstOrNull { it.stageId == id }?.stageName ?: t("all")
                            } ?: t("all"),
                            options = listOf(null to t("all")) +
                                stages.map { it.stageId to (it.stageName ?: it.stageCode.orEmpty()) },
                            onSelect = { id -> if (id != null) vm.onStageSelected(id) else { vm.stageId = null; vm.gradeId = null } },
                        )
                    }

                    if (vm.grades.isNotEmpty()) {
                        Spacer(Modifier.height(12.dp))
                        LabeledDropdown(
                            label = t("grade"),
                            selected = vm.gradeId?.let { id ->
                                vm.grades.firstOrNull { it.id == id }?.name ?: t("all")
                            } ?: t("all"),
                            options = listOf(null to t("all")) + vm.grades.map { it.id to it.name.orEmpty() },
                            onSelect = { vm.gradeId = it },
                        )
                    }

                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = vm.programName,
                        onValueChange = { vm.programName = it },
                        label = { Text(t("programName")) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = vm.notes,
                        onValueChange = { vm.notes = it },
                        label = { Text(t("notes")) },
                        placeholder = { Text(t("notesHint")) },
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
private fun <T> LabeledDropdown(
    label: String,
    selected: String,
    options: List<Pair<T?, String>>,
    onSelect: (T?) -> Unit,
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
            text = t("admissionSuccess"),
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
