package com.madrasati.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.madrasati.app.ui.components.EmptyState
import com.madrasati.app.ui.components.ErrorState
import com.madrasati.app.ui.components.LoadingState
import com.madrasati.app.ui.components.OrgCard
import com.madrasati.app.ui.components.TeacherCard
import com.madrasati.app.ui.theme.Primary
import com.madrasati.app.ui.viewmodel.SearchTab
import com.madrasati.app.ui.viewmodel.SearchViewModel
import com.madrasati.app.util.I18n
import com.madrasati.app.util.t
import com.madrasati.app.util.typeLabel

private val orgTypes = listOf(
    "private_school", "government_school", "college", "university", "institute",
)

@Composable
fun SearchScreen(
    vm: SearchViewModel,
    onOpenSchool: (String) -> Unit,
    onOpenTeacher: (String) -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        SearchField(
            query = vm.query,
            onQueryChange = vm::onQueryChange,
        )

        TabRow(
            selectedTabIndex = if (vm.tab == SearchTab.SCHOOLS) 0 else 1,
            containerColor = MaterialTheme.colorScheme.surface,
        ) {
            Tab(
                selected = vm.tab == SearchTab.SCHOOLS,
                onClick = { vm.selectTab(SearchTab.SCHOOLS) },
                text = { Text(t("schools")) },
            )
            Tab(
                selected = vm.tab == SearchTab.TEACHERS,
                onClick = { vm.selectTab(SearchTab.TEACHERS) },
                text = { Text(t("teachers")) },
            )
        }

        FilterBar(vm)

        when {
            vm.loading -> LoadingState()
            vm.error != null -> ErrorState(vm.error, onRetry = { vm.search() })
            vm.tab == SearchTab.SCHOOLS && vm.orgs.isEmpty() -> EmptyState(t("noResults"))
            vm.tab == SearchTab.TEACHERS && vm.teachers.isEmpty() -> EmptyState(t("noResults"))
            else -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (vm.tab == SearchTab.SCHOOLS) {
                        items(vm.orgs, key = { it.id }) { org ->
                            OrgCard(org = org, onClick = { onOpenSchool(org.id) })
                        }
                    } else {
                        items(vm.teachers, key = { it.id }) { teacher ->
                            TeacherCard(teacher = teacher, onClick = { onOpenTeacher(teacher.id) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SearchField(query: String, onQueryChange: (String) -> Unit) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        placeholder = { Text(t("searchHint")) },
        leadingIcon = { Icon(Icons.Filled.Search, null) },
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FilterBar(vm: SearchViewModel) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (vm.tab == SearchTab.SCHOOLS) {
            item {
                DropdownFilter(
                    label = t("allTypes"),
                    selected = vm.orgType?.let { typeLabel(it) } ?: t("allTypes"),
                    options = listOf(null to t("allTypes")) + orgTypes.map { it to typeLabel(it) },
                    onSelect = { vm.selectOrgType(it) },
                )
            }
            item {
                DropdownFilter(
                    label = t("governorate"),
                    selected = vm.governorateCode?.let { code ->
                        vm.governorates.firstOrNull { it.code == code }?.name ?: t("all")
                    } ?: t("all"),
                    options = listOf(null to t("all")) +
                        vm.governorates.map { it.code to it.name.orEmpty() },
                    onSelect = { vm.selectGovernorate(it) },
                )
            }
        } else {
            item {
                DropdownFilter(
                    label = t("subject"),
                    selected = vm.subjectId?.let { id ->
                        vm.subjects.firstOrNull { it.id == id }?.name ?: t("all")
                    } ?: t("all"),
                    options = listOf(null to t("all")) +
                        vm.subjects.map { it.id to it.name.orEmpty() },
                    onSelect = { vm.selectSubject(it) },
                )
            }
            item {
                DropdownFilter(
                    label = t("stage"),
                    selected = vm.stageId?.let { id ->
                        vm.stages.firstOrNull { it.id == id }?.name ?: t("all")
                    } ?: t("all"),
                    options = listOf(null to t("all")) +
                        vm.stages.map { it.id to it.name.orEmpty() },
                    onSelect = { vm.selectStage(it) },
                )
            }
        }

        item {
            Surface(
                onClick = { vm.clearFilters() },
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surfaceVariant,
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Filled.Close, null, modifier = Modifier.width(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(t("clear"), style = MaterialTheme.typography.labelLarge)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun <T> DropdownFilter(
    label: String,
    selected: String,
    options: List<Pair<T?, String>>,
    onSelect: (T?) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }

    Surface(
        onClick = { expanded = true },
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = if (selected == t("all")) label else selected,
                style = MaterialTheme.typography.labelLarge,
                color = if (selected == t("all")) MaterialTheme.colorScheme.onSurfaceVariant else Primary,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }

    if (expanded) {
        androidx.compose.material3.DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            options.forEach { (value, label) ->
                androidx.compose.material3.DropdownMenuItem(
                    text = { Text(label) },
                    onClick = {
                        expanded = false
                        onSelect(value)
                    },
                )
            }
        }
    }
}
