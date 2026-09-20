"use client"

import { useState, type RefObject } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ExportDashboardButtonProps {
  /** Ref to the DOM node to capture — wrap the exportable dashboard content in it. */
  targetRef: RefObject<HTMLElement | null>
  /** Used as the downloaded file's base name (without extension). */
  filename: string
}

/**
 * Reusable export-to-image/PDF button for any dashboard page — wrap the
 * section you want exportable in a ref and drop this next to its filters.
 * Uses html2canvas to rasterize the DOM (charts + tables) client-side, so it
 * needs no backend support and works for any dashboard without change.
 */
export function ExportDashboardButton({ targetRef, filename }: ExportDashboardButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  async function capture(): Promise<HTMLCanvasElement | null> {
    const node = targetRef.current
    if (!node) {
      toast.error("Não foi possível exportar: conteúdo não encontrado.")
      return null
    }
    // html2canvas-pro (not html2canvas) — Tailwind v4 compiles opacity
    // modifiers like `bg-primary/10` using the modern `color-mix(in oklab, ...)`
    // CSS function, which the original html2canvas can't parse. It doesn't
    // throw cleanly either — the capture just hangs mid-clone with no error,
    // which is exactly what "Starting document clone" never completing looks
    // like. html2canvas-pro is a maintained fork that adds oklch/oklab/
    // color-mix() support.
    const { default: html2canvas } = await import("html2canvas-pro")
    return html2canvas(node, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    })
  }

  async function exportPng() {
    setIsExporting(true)
    try {
      const canvas = await capture()
      if (!canvas) return
      const link = document.createElement("a")
      link.download = `${filename}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    } catch {
      toast.error("Erro ao exportar imagem.")
    } finally {
      setIsExporting(false)
    }
  }

  async function exportPdf() {
    setIsExporting(true)
    try {
      const canvas = await capture()
      if (!canvas) return
      const { jsPDF } = await import("jspdf")
      const imgData = canvas.toDataURL("image/png")
      // Fit the captured canvas into an A4-proportioned page, landscape if
      // the content is wider than tall (dashboards usually are).
      const isLandscape = canvas.width >= canvas.height
      const pdf = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "pt",
        format: "a4",
      })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height)
      const w = canvas.width * ratio
      const h = canvas.height * ratio
      pdf.addImage(imgData, "PNG", (pageWidth - w) / 2, (pageHeight - h) / 2, w, h)
      pdf.save(`${filename}.pdf`)
    } catch {
      toast.error("Erro ao exportar PDF.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportPng}>Exportar como PNG</DropdownMenuItem>
        <DropdownMenuItem onClick={exportPdf}>Exportar como PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
