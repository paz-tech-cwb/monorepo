"use client"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useFormsCatalog } from "@/lib/hooks/use-forms-catalog"
import { FormIcon } from "./_components/form-icon"

export function FormulariosHub() {
  const { data: forms = [], isLoading } = useFormsCatalog()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Formulários</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {forms.map((f) => (
          <div key={f.slug}>
            <Link href={`/formularios/${f.slug}`} className="block h-full">
            <Card className="hover:shadow-md transition cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-3">
                <FormIcon slug={f.slug} className="size-6 text-primary" />
                <CardTitle className="text-lg">{f.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{f.description}</p>
                {!f.can_write && f.can_read && (
                  <p className="mt-2 text-xs text-muted-foreground">Apenas leitura</p>
                )}
              </CardContent>
            </Card>
            </Link>
          </div>
        ))}
        {forms.length === 0 && (
          <p className="text-muted-foreground">Nenhum formulário disponível para você.</p>
        )}
      </div>
    </div>
  )
}
