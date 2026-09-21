import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OrgChartCanvas } from "@/components/organization/org-chart-canvas"

export default function OrganogramaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/organizacao" aria-label="Voltar para Organização">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Organograma</h1>
          <p className="text-muted-foreground">
            Visualize a hierarquia da igreja em um diagrama interativo
          </p>
        </div>
      </div>

      <OrgChartCanvas />
    </div>
  )
}
