package ai.instapark.valet.data.repository

import ai.instapark.valet.data.remote.ParkingAdminApi
import ai.instapark.valet.data.remote.dto.CreateSlotRequest
import ai.instapark.valet.data.remote.dto.CreateSlotResponse
import ai.instapark.valet.data.remote.dto.CreateTariffRuleRequest
import ai.instapark.valet.data.remote.dto.CreateTariffRuleResponse
import ai.instapark.valet.data.remote.dto.CreateVehiclePassRequest
import ai.instapark.valet.data.remote.dto.CreateVehiclePassResponse
import ai.instapark.valet.data.remote.dto.CreateVehicleTypeResponse
import ai.instapark.valet.data.remote.dto.CreateZoneResponse
import ai.instapark.valet.data.remote.dto.CreateVehicleTypeRequest
import ai.instapark.valet.data.remote.dto.CreateZoneRequest
import ai.instapark.valet.data.remote.dto.GenerateQrCodesRequest
import ai.instapark.valet.data.remote.dto.GenerateQrCodesResponse
import ai.instapark.valet.data.remote.dto.GuestRequestsResponse
import ai.instapark.valet.data.remote.dto.SetGuestRequestModeRequest
import ai.instapark.valet.data.remote.dto.TariffRulesResponse
import ai.instapark.valet.data.remote.dto.VehiclePassesResponse
import ai.instapark.valet.data.remote.dto.VehicleTypesResponse
import ai.instapark.valet.data.remote.dto.ZonesResponse
import ai.instapark.valet.data.remote.toApiException
import com.google.gson.Gson

class ConfigurationRepository(
    private val api: ParkingAdminApi,
    private val gson: Gson,
) {
    private suspend fun <T> wrap(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (t: Throwable) {
        Result.failure(t.toApiException(gson))
    }

    suspend fun zones(): Result<ZonesResponse> = wrap { api.zones() }
    suspend fun createZone(name: String): Result<CreateZoneResponse> = wrap { api.createZone(CreateZoneRequest(name)) }
    suspend fun deleteZone(id: String): Result<Unit> = wrap { api.deleteZone(id) }
    suspend fun createSlot(zoneId: String, slotNumber: String, isEv: Boolean, isDisabledSlot: Boolean): Result<CreateSlotResponse> =
        wrap { api.createSlot(zoneId, CreateSlotRequest(slotNumber, isEv, isDisabledSlot)) }
    suspend fun deleteSlot(id: String): Result<Unit> = wrap { api.deleteSlot(id) }

    suspend fun vehicleTypes(): Result<VehicleTypesResponse> = wrap { api.vehicleTypes() }
    suspend fun createVehicleType(name: String): Result<CreateVehicleTypeResponse> =
        wrap { api.createVehicleType(CreateVehicleTypeRequest(name)) }
    suspend fun deleteVehicleType(id: String): Result<Unit> = wrap { api.deleteVehicleType(id) }

    suspend fun vehiclePasses(): Result<VehiclePassesResponse> = wrap { api.vehiclePasses() }
    suspend fun createVehiclePass(vehicleNumber: String, label: String?): Result<CreateVehiclePassResponse> =
        wrap { api.createVehiclePass(CreateVehiclePassRequest(vehicleNumber, label)) }
    suspend fun deleteVehiclePass(id: String): Result<Unit> = wrap { api.deleteVehiclePass(id) }

    suspend fun tariffRules(): Result<TariffRulesResponse> = wrap { api.tariffRules() }
    suspend fun createTariffRule(request: CreateTariffRuleRequest): Result<CreateTariffRuleResponse> =
        wrap { api.createTariffRule(request) }
    suspend fun deleteTariffRule(id: String): Result<Unit> = wrap { api.deleteTariffRule(id) }

    suspend fun guestRequests(): Result<GuestRequestsResponse> = wrap { api.guestRequests() }
    suspend fun setGuestRequestMode(mode: String): Result<Unit> = wrap {
        api.setGuestRequestMode(SetGuestRequestModeRequest(mode))
    }
    suspend fun generateQrCodes(count: Int): Result<GenerateQrCodesResponse> = wrap {
        api.generateQrCodes(GenerateQrCodesRequest(count))
    }
}
