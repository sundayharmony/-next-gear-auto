package com.nextgearauto.admin.ui.vehicles

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.nextgearauto.admin.api.AdminVehicleDto
import com.nextgearauto.admin.api.NgaApi
import kotlinx.coroutines.launch
import retrofit2.HttpException

class VehiclesViewModel(
    private val api: NgaApi,
) : ViewModel() {

    var uiState: VehiclesUiState by mutableStateOf(VehiclesUiState.Loading)
        private set

    fun load() {
        viewModelScope.launch {
            uiState = VehiclesUiState.Loading
            uiState = try {
                val resp = api.listAdminVehicles()
                if (!resp.success) {
                    VehiclesUiState.Error(resp.message ?: "Failed to load vehicles")
                } else {
                    VehiclesUiState.Success(resp.data)
                }
            } catch (e: HttpException) {
                VehiclesUiState.Error("HTTP ${e.code()}")
            } catch (e: Exception) {
                VehiclesUiState.Error(e.message ?: "Error")
            }
        }
    }

    companion object {
        fun Factory(api: NgaApi): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return VehiclesViewModel(api) as T
            }
        }
    }
}

sealed interface VehiclesUiState {
    data object Loading : VehiclesUiState
    data class Success(val vehicles: List<AdminVehicleDto>) : VehiclesUiState
    data class Error(val message: String) : VehiclesUiState
}
