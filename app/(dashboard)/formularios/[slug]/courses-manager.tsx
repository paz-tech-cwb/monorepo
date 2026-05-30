"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, Trash2, Plus, Check, X } from "lucide-react"
import {
  useFormCourses,
  useCreateCourse,
  useUpdateCourse,
  useUnlinkCourse,
} from "@/lib/hooks/use-form-courses"
import type { FormCourse } from "@/lib/api/types/formularios"

export function CoursesManager() {
  const { data: courses = [] } = useFormCourses()
  const create = useCreateCourse()
  const update = useUpdateCourse()
  const unlink = useUnlinkCourse()
  const [draftName, setDraftName] = useState("")
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cursos disponíveis neste formulário</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {courses.map((c: FormCourse) => (
          <div key={c.id} className="flex items-center gap-2">
            {editing?.id === c.id ? (
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
          <Input
            placeholder="Nome do novo curso"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            className="h-8"
          />
          <Button
            size="sm"
            disabled={!draftName.trim() || create.isPending}
            onClick={async () => {
              await create.mutateAsync({ name: draftName.trim() })
              setDraftName("")
            }}
          >
            <Plus className="size-4 mr-1" /> Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
