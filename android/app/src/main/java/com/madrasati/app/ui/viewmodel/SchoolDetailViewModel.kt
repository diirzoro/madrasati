package com.madrasati.app.ui.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.madrasati.app.data.Result
import com.madrasati.app.data.model.Offering
import com.madrasati.app.data.model.Organization
import com.madrasati.app.data.repository.CatalogRepository
import kotlinx.coroutines.launch

class SchoolDetailViewModel(
    private val repo: CatalogRepository,
    private val orgId: String,
) : ViewModel() {

    var org by mutableStateOf<Organization?>(null)
        private set
    var offering by mutableStateOf<Offering?>(null)
        private set
    var loading by mutableStateOf(true)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    init {
        load()
    }

    fun load() {
        loading = true
        error = null
        viewModelScope.launch {
            val orgResult = repo.getOrganization(orgId)
            val offeringResult = repo.offeringPublic(orgId)

            when (orgResult) {
                is Result.Success -> org = orgResult.data
                is Result.Failure -> error = orgResult.message
            }
            when (offeringResult) {
                is Result.Success -> offering = offeringResult.data
                is Result.Failure -> if (error == null) error = offeringResult.message
            }
            loading = false
        }
    }
}
