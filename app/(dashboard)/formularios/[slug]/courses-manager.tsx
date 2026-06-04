"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Pencil, Trash2, Plus, Check, X, ChevronDown, ChevronRight } from "lucide-react"
import {
  useFormCourses,
  useAllFormCourses,
  useLinkCourse,
  useUpdateCourse,
  useUnlinkCourse,
} from "@/lib/hooks/use-form-courses"
import type { FormCourse } from "@/lib/api/types/formularios"

export function CoursesManager() {
  const { data: linked = [] } = useFormCourses()
  const { data: all = [] } = useAllFormCourses()
  const link = useLinkCourse()
  const update = useUpdateCourse()
  const unlink = useUnlinkCourse()
  const [selectedId, setSelectedId] = useState("")
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [open, setOpen] = useState(false)

  const linkedIds = new Set(linked.map((c) => c.id))
  const available = all.filter((c) => !linkedIds.has(c.id))

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <CollapsibleTrigger asChild>
          <CardTitle className="text-base flex items-center gap-2 select-none">
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            Cursos disponíveis neste formulário
            <span className="text-muted-foreground font-normal text-sm">({linked.length})</span>
          </CardTitle>
        </CollapsibleTrigger>
      </CardHeader>
      <CollapsibleContent>
      <CardContent className="space-y-2">
        {linked.map((c: FormCourse) => (
          <div key={c.id} className="flex items-center gap-2">
            {editing !== null && editing.id === c.id ? (
              <>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="flex-1 h-8"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await update.mutateAsync({ id: c.id, payload: { name: editing.name } })
                    setEditing(null)
                  }}
                >
                  <Check className="size-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                  <X className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{c.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing({ id: c.id, name: c.name })}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Remover "${c.name}" deste formulário?`)) unlink.mutate(c.id)
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="h-8 flex-1">
              <SelectValue placeholder="Selecionar curso..." />
            </SelectTrigger>
            <SelectContent>
              {available.length === 0 ? (
                <SelectItem value="__none__" disabled>Nenhum curso disponível</SelectItem>
              ) : (
                available.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!selectedId || selectedId === "__none__" || link.isPending}
            onClick={async () => {
              await link.mutateAsync(selectedId)
              setSelectedId("")
            }}
          >
            <Plus className="size-4 mr-1" /> Adicionar
          </Button>
        </div>
      </CardContent>
      </CollapsibleContent>
    </Card>
    </Collapsible>
  )
}
