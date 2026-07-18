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

data class DashboardResponse(
    val siteName: String?,
    val valetParkingEnabled: Boolean,
    val kpis: DashboardKpis,
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
