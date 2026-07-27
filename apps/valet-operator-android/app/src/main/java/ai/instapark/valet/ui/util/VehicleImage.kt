package ai.instapark.valet.ui.util

import ai.instapark.valet.R
import androidx.annotation.DrawableRes

/**
 * Shared vehicle-type -> thumbnail mapping (Dashboard's "Next up" card, Vehicles, Queue,
 * Search results). Only bike/car photographic thumbnails exist -- scooter reuses the bike
 * photo, sedan/suv reuse the car photo (closest visual match), matching how all four call
 * sites already collapse vehicle type into this same 4-way grouping.
 */
@DrawableRes
fun vehicleImageRes(vehicleType: String): Int = when {
    "bike" in vehicleType.lowercase() || "scoot" in vehicleType.lowercase() -> R.drawable.img_thumb_bike
    else -> R.drawable.img_thumb_car
}
