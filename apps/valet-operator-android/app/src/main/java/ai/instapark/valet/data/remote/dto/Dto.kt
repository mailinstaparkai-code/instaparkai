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

data class MeResponse(
    val id: String,
    val username: String,
    val role: String,
    val fullName: String?,
    val assignedSiteId: String,
    val siteName: String?,
    val valetParkingEnabled: Boolean,
)

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
    val kpis: DashboardKpis,
    val capacity: DashboardCapacity?,
    val myDailyStatus: MyDailyStatus?,
)

data class SetStatusRequest(val status: String)

data class DeviceTokenRequest(val platform: String, val token: String)

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
