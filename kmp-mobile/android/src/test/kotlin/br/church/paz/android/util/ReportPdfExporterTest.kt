package br.church.paz.android.util

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Tests the pure pagination/scale-factor math extracted into
 * [ReportPdfExporter.computePagination] — the only non-trivial logic in
 * the PDF export feature. Boundary cases: exactly one page, just over one
 * page, and several pages.
 */
class ReportPdfExporterTest {
    // Using the real page geometry (A4 at 72dpi, 24pt margin) so the
    // expected page counts below reflect real-world behavior.
    private val pageWidthPt = 595
    private val pageHeightPt = 842
    private val marginPt = 24
    private val contentWidthPt = pageWidthPt - marginPt * 2
    private val contentHeightPt = pageHeightPt - marginPt * 2

    @Test
    fun `content exactly one page tall produces one page`() {
        val bitmapWidthPx = contentWidthPt
        val bitmapHeightPx = contentHeightPt

        val result = ReportPdfExporter.computePagination(bitmapWidthPx, bitmapHeightPx)

        assertEquals(1, result.pageCount)
    }

    @Test
    fun `content slightly over one page tall produces two pages`() {
        val bitmapWidthPx = contentWidthPt
        val bitmapHeightPx = (contentHeightPt * 1.01f).toInt()

        val result = ReportPdfExporter.computePagination(bitmapWidthPx, bitmapHeightPx)

        assertEquals(2, result.pageCount)
    }

    @Test
    fun `content spanning multiple pages rounds up to the next page`() {
        val bitmapWidthPx = contentWidthPt
        val bitmapHeightPx = (contentHeightPt * 3.2f).toInt()

        val result = ReportPdfExporter.computePagination(bitmapWidthPx, bitmapHeightPx)

        assertEquals(4, result.pageCount)
    }

    @Test
    fun `scale factor maps bitmap width to the page content width`() {
        val bitmapWidthPx = 1080
        val bitmapHeightPx = 2000

        val result = ReportPdfExporter.computePagination(bitmapWidthPx, bitmapHeightPx)

        assertEquals(contentWidthPt.toFloat() / bitmapWidthPx, result.scale, 0.0001f)
    }

    @Test
    fun `never reports zero pages even for a degenerate zero-height bitmap`() {
        val result = ReportPdfExporter.computePagination(contentWidthPt, 0)

        assertEquals(1, result.pageCount)
    }
}
