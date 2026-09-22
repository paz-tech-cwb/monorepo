package br.church.paz.android.ui.features.ministries

import android.content.Context
import android.content.Intent
import android.net.Uri

/** Opens the device's default maps app — lets the user pick their preferred provider. */
internal fun openInMaps(
    context: Context,
    latitude: Double,
    longitude: Double,
    name: String,
) {
    val uri = Uri.parse("geo:$latitude,$longitude?q=$latitude,$longitude(${Uri.encode(name)})")
    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, uri)) }
}
