"use client"

import Link from "next/link"
import { Network } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { AreasManagement } from "@/app/(dashboard)/areas/areas-management"
import { SectorsManagement } from "@/app/(dashboard)/sectors/sectors-management"
import { OrgChartTree } from "@/components/organization/org-chart-tree"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function OrganizacaoManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Organização</h1>
          <p className="text-muted-foreground">
            Gerencie áreas, setores e a hierarquia da igreja
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/organizacao/organograma">
            <Network className="h-4 w-4" />
            Ver organograma visual
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="areas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="areas">Áreas</TabsTrigger>
          <TabsTrigger value="sectors">Setores</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarquia</TabsTrigger>
        </TabsList>

        <TabsContent value="areas">
          <AreasManagement />
        </TabsContent>

        <TabsContent value="sectors">
          <SectorsManagement />
        </TabsContent>

        <TabsContent value="hierarchy">
          <Card>
            <CardHeader>
              <CardTitle>Hierarquia da Organização</CardTitle>
              <CardDescription>
                Visualize e mova áreas, setores e life groups entre si
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrgChartTree />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
