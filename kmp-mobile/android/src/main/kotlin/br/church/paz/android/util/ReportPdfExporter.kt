package br.church.paz.android.util

import android.app.Activity
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.pdf.PdfDocument
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.ComposeView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.ViewModelStoreOwner
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.lifecycle.setViewTreeViewModelStoreOwner
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import br.church.paz.android.ui.theme.PazTheme
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.File
import java.io.FileOutputStream
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Renders an arbitrary `@Composable` (the FULL report content — every
 * section, not a scrollable viewport subset) off-screen and exports it as a
 * paginated PDF using platform-native [PdfDocument], no third-party PDF
 * dependency.
 *
 * Mirrors iOS's `ReportPDFExporter`: rasterize the whole report at its full
 * intrinsic height first, then slice that single tall bitmap across as many
 * A4 pages as needed.
 *
 * IMPORTANT: [PdfDocument.Page.getCanvas] is a *software* canvas. Content
 * composables passed here must avoid hardware-accelerated-only effects
 * (e.g. `Modifier.blur`, [PazMeshBackground]'s glass/blur chrome) or they
 * will render blank — callers should pass a plain-background export variant
 * of their report content, not the live screen's chrome.
 */
object ReportPdfExporter {
    // A4 at 72dpi, matching the PDF page's point space.
    private const val PAGE_WIDTH_PT = 595
    private const val PAGE_HEIGHT_PT = 842
    private const val MARGIN_PT = 24

    // Width (in dp) the off-screen Composable is measured/rendered at —
    // matches a typical phone content width so charts/cards lay out the same
    // way they do on screen.
    private const val CONTENT_WIDTH_DP = 360

    // Caps the off-screen render density (see widthPx computation below) —
    // 2x is plenty of resolution for a printed/shared PDF and meaningfully
    // cuts memory use on 3x+ devices.
    private const val EXPORT_DENSITY_CAP = 2.0f

    class ExportException(
        message: String,
    ) : Exception(message)

    /**
     * Suspends until the off-screen composable has rendered and the PDF has
     * been written to [fileName] inside `cacheDir/shared_reports/`, then
     * returns that [File].
     */
    suspend fun export(
        activity: Activity,
        fileName: String,
        content: @Composable () -> Unit,
    ): File =
        suspendCancellableCoroutine { cont ->
            val decorView = activity.window.decorView as ViewGroup
            // Cap the render density: the final PDF page width is a fixed
            // point-size regardless of device density, so rendering at raw
            // device density (e.g. 3x on many phones) wastes memory with no
            // visual benefit — a full-report bitmap at full density can be a
            // 45-90MB single allocation, a realistic OOM risk on mid-range
            // devices with real data.
            val density = minOf(activity.resources.displayMetrics.density, EXPORT_DENSITY_CAP)
            val widthPx = (CONTENT_WIDTH_DP * density).toInt()

            val lifecycleOwner = FixedLifecycleOwner()
            val savedStateOwner = FixedSavedStateRegistryOwner(lifecycleOwner)
            val viewModelStoreOwner = FixedViewModelStoreOwner()

            val composeView =
                ComposeView(activity).apply {
                    // Force light theme regardless of system setting, matching
                    // the "white background" export design intent — without
                    // this wrapper, MaterialTheme.colorScheme/.typography calls
                    // inside the reused composables resolve to Compose's
                    // baseline (purple) theme instead of the app's brand theme.
                    setContent {
                        PazTheme(darkTheme = false) {
                            content()
                        }
                    }
                }

            val container =
                FrameLayout(activity).apply {
                    addView(composeView, ViewGroup.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))
                }

            container.setViewTreeLifecycleOwner(lifecycleOwner)
            container.setViewTreeViewModelStoreOwner(viewModelStoreOwner)
            container.setViewTreeSavedStateRegistryOwner(savedStateOwner)

            // Zero footprint in the real layout — this view never becomes
            // visible to the user, it only exists to be measured/drawn.
            decorView.addView(container, ViewGroup.LayoutParams(0, 0))
            lifecycleOwner.registry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
            lifecycleOwner.registry.handleLifecycleEvent(Lifecycle.Event.ON_START)
            lifecycleOwner.registry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)

            fun cleanup() {
                decorView.removeView(container)
                lifecycleOwner.registry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
            }

            // Let Compose run its first composition/layout pass(es) before
            // we force our own unbounded-height measure below — a couple of
            // posted frames is the standard way to let a freshly-attached
            // ComposeView settle without a hard sleep.
            composeView.post {
                composeView.post {
                    try {
                        val widthSpec = View.MeasureSpec.makeMeasureSpec(widthPx, View.MeasureSpec.EXACTLY)
                        val heightSpec = View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
                        composeView.measure(widthSpec, heightSpec)
                        val measuredWidth = composeView.measuredWidth
                        val measuredHeight = composeView.measuredHeight
                        composeView.layout(0, 0, measuredWidth, measuredHeight)

                        if (measuredHeight <= 0 || measuredWidth <= 0) {
                            cleanup()
                            cont.resumeWithException(ExportException("Conteúdo vazio ao gerar o PDF."))
                            return@post
                        }

                        val bitmap = Bitmap.createBitmap(measuredWidth, measuredHeight, Bitmap.Config.ARGB_8888)
                        val canvas = Canvas(bitmap)
                        canvas.drawColor(android.graphics.Color.WHITE)
                        composeView.draw(canvas)

                        cleanup()

                        val file = writePaginatedPdf(activity, fileName, bitmap)
                        bitmap.recycle()
                        cont.resume(file)
                    } catch (t: Throwable) {
                        cleanup()
                        // `OutOfMemoryError` (and other `Error`s) are
                        // `Throwable` but NOT `Exception` — callers only
                        // `catch (_: Exception)`, so a raw rethrow here would
                        // escape that handler and crash the app instead of
                        // showing the graceful error dialog. Wrap any
                        // non-Exception Throwable so it's always catchable.
                        val resumable = if (t is Exception) t else ExportException(t.message ?: "Falha ao gerar o PDF.")
                        cont.resumeWithException(resumable)
                    }
                }
            }
        }

    /**
     * Pure pagination math: given a source bitmap's pixel size and the PDF
     * page geometry, computes the scale factor (bitmap pixels -> PDF
     * points) and how many pages the scaled image spans. Extracted from
     * [writePaginatedPdf] so it's testable without needing a real
     * [Bitmap]/[Canvas]/[PdfDocument].
     */
    internal fun computePagination(
        bitmapWidthPx: Int,
        bitmapHeightPx: Int,
        pageWidthPt: Int = PAGE_WIDTH_PT,
        pageHeightPt: Int = PAGE_HEIGHT_PT,
        marginPt: Int = MARGIN_PT,
    ): Pagination {
        val contentWidthPt = pageWidthPt - marginPt * 2
        val contentHeightPt = pageHeightPt - marginPt * 2
        val scale = contentWidthPt.toFloat() / bitmapWidthPx
        val scaledHeightPt = bitmapHeightPx * scale
        val pageCount = maxOf(1, Math.ceil((scaledHeightPt / contentHeightPt).toDouble()).toInt())
        return Pagination(scale = scale, scaledHeightPt = scaledHeightPt, contentHeightPt = contentHeightPt, pageCount = pageCount)
    }

    internal data class Pagination(
        val scale: Float,
        val scaledHeightPt: Float,
        val contentHeightPt: Int,
        val pageCount: Int,
    )

    private fun writePaginatedPdf(
        context: Context,
        fileName: String,
        bitmap: Bitmap,
    ): File {
        val pagination = computePagination(bitmap.width, bitmap.height)
        val scale = pagination.scale
        val contentHeightPt = pagination.contentHeightPt
        val pageCount = pagination.pageCount

        val document = PdfDocument()
        try {
            for (pageIndex in 0 until pageCount) {
                val pageInfo = PdfDocument.PageInfo.Builder(PAGE_WIDTH_PT, PAGE_HEIGHT_PT, pageIndex).create()
                val page = document.startPage(pageInfo)
                val canvas = page.canvas
                canvas.save()
                canvas.clipRect(
                    MARGIN_PT.toFloat(),
                    MARGIN_PT.toFloat(),
                    (PAGE_WIDTH_PT - MARGIN_PT).toFloat(),
                    (PAGE_HEIGHT_PT - MARGIN_PT).toFloat(),
                )
                canvas.translate(MARGIN_PT.toFloat(), MARGIN_PT.toFloat() - pageIndex * contentHeightPt)
                canvas.scale(scale, scale)
                canvas.drawBitmap(bitmap, 0f, 0f, null)
                canvas.restore()
                document.finishPage(page)
            }

            val dir = File(context.cacheDir, "shared_reports").apply { mkdirs() }
            // Each export uses a unique timestamped filename (see call
            // sites), so without this the directory accumulates one PDF
            // per export forever — prune old exports before writing. Age-
            // based (rather than wiping everything) so an in-flight share
            // target (e.g. Gmail attach-on-send) reading a just-exported
            // file from a previous export isn't yanked out from under it.
            val staleThresholdMs = 60 * 60 * 1000L
            val now = System.currentTimeMillis()
            dir.listFiles()?.forEach { f -> if (now - f.lastModified() > staleThresholdMs) f.delete() }
            val file = File(dir, fileName)
            FileOutputStream(file).use { out -> document.writeTo(out) }
            return file
        } finally {
            document.close()
        }
    }
}

/** Minimal [LifecycleOwner] that's immediately usable for off-screen Compose rendering. */
private class FixedLifecycleOwner : LifecycleOwner {
    val registry = LifecycleRegistry(this)
    override val lifecycle: Lifecycle get() = registry
}

/** Minimal [SavedStateRegistryOwner] — Compose requires one to be present in the view tree. */
private class FixedSavedStateRegistryOwner(
    private val lifecycleOwner: LifecycleOwner,
) : SavedStateRegistryOwner {
    private val controller = SavedStateRegistryController.create(this)

    init {
        controller.performRestore(null)
    }

    override val lifecycle: Lifecycle get() = lifecycleOwner.lifecycle
    override val savedStateRegistry: SavedStateRegistry get() = controller.savedStateRegistry
}

/** Minimal [ViewModelStoreOwner] — Compose requires one to be present in the view tree. */
private class FixedViewModelStoreOwner : ViewModelStoreOwner {
    override val viewModelStore = ViewModelStore()
}
