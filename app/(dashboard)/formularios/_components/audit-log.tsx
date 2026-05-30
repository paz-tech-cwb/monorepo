"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useFormAudit } from "@/lib/hooks/use-form-submissions"
import type { FormSlug } from "@/lib/api/types/formularios"

export function AuditLog({ slug, id }: { slug: FormSlug; id: string }) {
  const { data: entries = [], isLoading } = useFormAudit(slug, id)
  if (isLoading) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Histórico</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 text-sm">
              <Badge variant={e.action === "delete" ? "destructive" : "secondary"}>
                {e.action === "create" ? "Criado" : e.action === "update" ? "Editado" : "Removido"}
              </Badge>
              <span>{e.actor.name}</span>
              <span className="text-muted-foreground">
                {new Date(e.created_at).toLocaleString("pt-BR")}
              </span>
            </li>
          ))}
          {entries.length === 0 && (
            <li className="text-muted-foreground text-sm">Sem alterações registradas.</li>
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
