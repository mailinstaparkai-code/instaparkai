package ai.instapark.valet.data.remote.dto

data class LoginRequest(
    val username: String,
    val password: String,
)

data class Account(
    val id: String,
    val username: String,
    val role: String,
    val fullName: String?,
    val assignedSiteId: String,
)

data class LoginResponse(
    val token: String,
    val expiresAt: String,
    val account: Account,
)

data class AccessibleSite(
    val id: String,
    val name: String,
)

data class MeResponse(
    val id: String,
    val username: String,
    val role: String,
    val fullName: String?,
    val assignedSiteId: String,
    val currentSiteId: String? = null,
    val accessibleSites: List<AccessibleSite> = emptyList(),
    val siteName: String?,
    val valetParkingEnabled: Boolean,
    val qrCodeModeEnabled: Boolean,
)

data class SwitchSiteRequest(val siteId: String)
data class SwitchSiteResponse(val currentSiteId: String)

data class DashboardKpis(
    val activeVehicles: Int,
    val arrived: Int,
    val completedToday: Int,
    val avgTurnaroundMinutes: Int?,
)

data class DashboardCapacity(
    val totalSlots: Int,
    val occupiedSlots: Int,
)

data class MyDailyStatus(
    val status: String?,
    val statusDate: String,
)

data class DashboardResponse(
    val siteName: String?,
    val valetParkingEnabled: Boolean,
    val qrCodeModeEnabled: Boolean,
    val kpis: DashboardKpis,
    val capacity: DashboardCapacity?,
    val myDailyStatus: MyDailyStatus?,
)

data class SetStatusRequest(val status: String)

data class DeviceTokenRequest(val platform: String, val token: String)

data class AppVersionResponse(
    val latestVersionCode: Int?,
    val latestVersionName: String?,
    val apkUrl: String?,
    val releaseNotes: String?,
)

data class FilterOption(
    val value: String,
    val label: String,
)

data class TicketOperator(
    val username: String,
    val fullName: String?,
)

data class Ticket(
    val id: String,
    val ticketToken: String,
    val vehicleNumber: String,
    val vehicleType: String,
    val mobileNumber: String,
    val status: String,
    val checkedInAt: String,
    val completedAt: String?,
    val fareAmount: Int?,
    val paymentCollected: Boolean,
    val photoCount: Int,
    val slotNumber: String?,
    val qrCode: String?,
    val checkedInOperator: TicketOperator?,
    val deliveredOperator: TicketOperator?,
)

data class VehiclesStats(
    val completedCount: Int,
    val totalRevenue: Int,
)

data class VehiclesFilters(
    val statusOptions: List<FilterOption>,
    val vehicleTypeOptions: List<FilterOption>,
    val operatorOptions: List<FilterOption>,
)

data class VehiclesResponse(
    val tickets: List<Ticket>,
    val page: Int,
    val totalPages: Int,
    val totalCount: Int,
    val stats: VehiclesStats,
    val filters: VehiclesFilters,
)

data class ApiErrorDetail(
    val code: String,
    val message: String,
)

data class ApiErrorBody(
    val error: ApiErrorDetail,
)

data class QueueTicket(
    val id: String,
    val ticketToken: String,
    val vehicleNumber: String,
    val vehicleType: String,
    val mobileNumber: String,
    val status: String,
    val checkedInAt: String,
    val checkedInBy: String?,
    val fareAmount: Int?,
    val photoCount: Int,
    val slotNumber: String?,
    val qrCode: String?,
    // Direct Checkout mode only -- null/false for a site not in that mode.
    val suggestedFare: Int?,
    val isPassVehicle: Boolean,
)

data class SlotOption(
    val id: String,
    val label: String,
)

data class OperatorOption(
    val id: String,
    val label: String,
)

data class QueueFilters(
    val statusOptions: List<FilterOption>,
    val vehicleTypeOptions: List<FilterOption>,
)

data class QueueResponse(
    val tickets: List<QueueTicket>,
    val availableSlots: List<SlotOption>,
    val operatorOptions: List<OperatorOption>,
    val filters: QueueFilters,
    val autoAllocateEnabled: Boolean,
    val canToggleAutoAllocate: Boolean,
    val guestRequestMode: String,
    val directCheckoutModeEnabled: Boolean,
    val canRequest: Boolean,
    val canDispatch: Boolean,
    val myAccountId: String?,
)

data class CheckInResponse(
    val ticket: QueueTicket,
)

data class MarkParkedRequest(val slotId: String)
data class DispatchRequest(val operatorId: String)
data class VoidRequest(val reason: String?)
data class UpdateTicketRequest(val vehicleNumber: String, val mobileNumber: String)
data class AutoAllocateRequest(val enabled: Boolean)

data class TimelineEntry(
    val key: String,
    val type: String,
    val timestamp: String,
    val vehicleNumber: String,
    val operator: TicketOperator?,
    val fare: Int?,
    val paymentCollected: Boolean?,
)

data class TimelineResponse(
    val timeline: List<TimelineEntry>,
)

data class TicketPhoto(
    val label: String,
    val stage: String,
    val url: String,
)

data class PhotosResponse(
    val photos: List<TicketPhoto>,
)

data class NotificationItem(
    val id: String,
    val kind: String,
    val message: String,
    val readAt: String?,
    val createdAt: String,
)

data class NotificationsResponse(
    val notifications: List<NotificationItem>,
)

// -- Reports --------------------------------------------------------------

data class TransactionRow(
    val key: String,
    val type: String,
    val label: String,
    val timestamp: String,
    val vehicleNumber: String,
    val operatorLabel: String,
    val fare: Int?,
    val paymentCollected: Boolean?,
)

data class ReportStats(
    val checkIns: Int,
    val handovers: Int,
    val activeOperators: Int,
)

data class VehicleTransactionsResponse(
    val transactions: List<TransactionRow>,
    val page: Int,
    val totalPages: Int,
    val totalCount: Int,
    val cappedAt: Int?,
    val stats: ReportStats,
    val operatorOptions: List<FilterOption>,
    val from: String,
    val to: String,
)

// -- Configuration: Zones & Slots -------------------------------------------

data class SlotItem(
    val id: String,
    val slotNumber: String,
    val isEv: Boolean,
    val isDisabledSlot: Boolean,
    val status: String,
)

data class ZoneItem(
    val id: String,
    val name: String,
    val slots: List<SlotItem>,
)

data class ZonesResponse(val zones: List<ZoneItem>)
data class CreateZoneRequest(val name: String)
data class CreateZoneResponse(val zone: ZoneItem)
data class CreateSlotRequest(val slotNumber: String, val isEv: Boolean, val isDisabledSlot: Boolean)
data class CreateSlotResponse(val slot: SlotItem)
data class CreateSlotsBulkRequest(val prefix: String?, val start: Int, val end: Int, val isEv: Boolean, val isDisabledSlot: Boolean)
data class CreateSlotsBulkResponse(val slots: List<SlotItem>)

// -- Configuration: Vehicle types -------------------------------------------

data class VehicleTypeItem(val id: String, val name: String)
data class VehicleTypesResponse(val vehicleTypes: List<VehicleTypeItem>)
data class CreateVehicleTypeRequest(val name: String)
data class CreateVehicleTypeResponse(val vehicleType: VehicleTypeItem)

// -- Configuration: Vehicle Passes -------------------------------------------

data class VehiclePassItem(val id: String, val vehicleNumber: String, val label: String?)
data class VehiclePassesResponse(val vehiclePasses: List<VehiclePassItem>)
data class CreateVehiclePassRequest(val vehicleNumber: String, val label: String?)
data class CreateVehiclePassResponse(val vehiclePass: VehiclePassItem)

// -- Configuration: Tariffs -------------------------------------------------

// slab_tiers is stored/returned as raw snake_case jsonb (see mapTariffRuleForApi on
// the server -- it passes rule.slab_tiers through untransformed, unlike every other
// camelCase field in this API), so this needs an explicit SerializedName: Gson does
// exact case-sensitive field matching with no naming policy configured, so without
// this "upto_minutes" was silently never matching "uptoMinutes" in either direction.
data class SlabTier(
    @com.google.gson.annotations.SerializedName("upto_minutes") val uptoMinutes: Int?,
    val rate: Double,
)

data class TariffRuleItem(
    val id: String,
    val vehicleCategory: String,
    val pricingType: String,
    val rate: Double,
    val surgeMultiplier: Double?,
    val slabTiers: List<SlabTier>?,
    val effectiveFrom: String,
)

data class TariffRulesResponse(val tariffRules: List<TariffRuleItem>)
data class CreateTariffRuleRequest(
    val vehicleCategory: String,
    val pricingType: String,
    val rate: Double? = null,
    val surgeMultiplier: Double? = null,
    val slabTiers: List<SlabTier>? = null,
    val effectiveDate: String? = null,
)
data class CreateTariffRuleResponse(val tariffRule: TariffRuleItem)

data class UpdateTariffRuleRequest(
    val pricingType: String,
    val rate: Double? = null,
    val surgeMultiplier: Double? = null,
    val slabTiers: List<SlabTier>? = null,
    val effectiveDate: String? = null,
)
data class UpdateTariffRuleResponse(val tariffRule: TariffRuleItem)

// -- Configuration: Guest requests / QR --------------------------------------

data class QrCodeItem(
    val id: String,
    val code: String,
    val createdAt: String,
    val inUse: Boolean,
    val ticket: TicketOperatorLite?,
)

data class TicketOperatorLite(val id: String, val vehicleNumber: String, val status: String)

data class GuestRequestsResponse(val guestRequestMode: String, val qrCodes: List<QrCodeItem>)
data class SetGuestRequestModeRequest(val mode: String)
data class SetGuestRequestModeResponse(val guestRequestMode: String)
data class GenerateQrCodesRequest(val count: Int)
data class GenerateQrCodesResponse(val qrCodes: List<QrCodeItem>)

// -- Operators ----------------------------------------------------------

data class OperatorItem(
    val id: String,
    val username: String,
    val fullName: String?,
    val employeeId: String?,
    val email: String?,
    val phone: String?,
    val isActive: Boolean,
    val drivingLicenseExpiry: String?,
    val dailyStatus: String?,
)

data class OperatorsResponse(val operators: List<OperatorItem>)
data class CreateOperatorResponse(val id: String)
data class SetOperatorActiveRequest(val isActive: Boolean)
data class SetOperatorDailyStatusRequest(val status: String)
data class SetOperatorLeaveRequest(val startDate: String, val endDate: String)
