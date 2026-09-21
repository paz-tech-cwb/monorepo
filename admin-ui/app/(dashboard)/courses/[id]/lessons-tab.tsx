"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Plus, MoreHorizontal, Edit, Trash2, ArrowUp, ArrowDown, Loader2, PlayCircle } from "lucide-react"
import {
  useCourseLessons,
  useCreateCourseLesson,
  useUpdateCourseLesson,
  useDeleteCourseLesson,
  useReorderCourseLessons,
} from "@/lib/hooks/use-course-lessons"
import type { CreateLessonRequest, Lesson, UpdateLessonRequest } from "@/lib/api/types/academy"
import { LessonFormDialog } from "./lesson-form-dialog"

function formatDuration(seconds?: number | null): string {
  if (!seconds) return "-"
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}m ${secs.toString().padStart(2, "0")}s`
}

interface LessonsTabProps {
  courseId: string
}

export function LessonsTab({ courseId }: LessonsTabProps) {
  const { data: lessons = [], isLoading, error } = useCourseLessons(courseId)
  const createMutation = useCreateCourseLesson(courseId)
  const updateMutation = useUpdateCourseLesson(courseId)
  const deleteMutation = useDeleteCourseLesson(courseId)
  const reorderMutation = useReorderCourseLessons(courseId)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null)

  const sortedLessons = [...lessons].sort((a, b) => a.sort_order - b.sort_order)

  const handleCreate = () => {
    setEditingLesson(null)
    setIsFormOpen(true)
  }

  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson)
    setIsFormOpen(true)
  }

  const handleSubmit = async (data: CreateLessonRequest | UpdateLessonRequest) => {
    try {
      if (editingLesson) {
        await updateMutation.mutateAsync({ lessonId: editingLesson.id, data })
      } else {
        await createMutation.mutateAsync(data as CreateLessonRequest)
      }
      setIsFormOpen(false)
      setEditingLesson(null)
    } catch (err) {
      console.error("Failed to save lesson:", err)
    }
  }

  const handleDelete = async (lessonId: string) => {
    try {
      await deleteMutation.mutateAsync(lessonId)
      setDeletingLessonId(null)
    } catch (err) {
      console.error("Failed to delete lesson:", err)
    }
  }

  const handleMove = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= sortedLessons.length) return

    const reordered = [...sortedLessons]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)
    reorderMutation.mutate(reordered.map((l) => l.id))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return <p className="text-destructive text-center py-8">Erro ao carregar lições.</p>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Lições</CardTitle>
            <CardDescription>{sortedLessons.length} lição(ões) cadastrada(s)</CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Lição
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sortedLessons.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhuma lição cadastrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">Ordem</TableHead>
                <TableHead>Lição</TableHead>
                <TableHead>Vídeo</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead className="w-[70px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLessons.map((lesson, index) => (
                <TableRow key={lesson.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0 || reorderMutation.isPending}
                        onClick={() => handleMove(index, -1)}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === sortedLessons.length - 1 || reorderMutation.isPending}
                        onClick={() => handleMove(index, 1)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{lesson.title}</p>
                      {lesson.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-xs">{lesson.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <PlayCircle className="h-4 w-4" />
                      {lesson.youtube_video_id}
                    </div>
                  </TableCell>
                  <TableCell>{formatDuration(lesson.duration_seconds)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTimeout(() => handleEdit(lesson), 0)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setTimeout(() => setDeletingLessonId(lesson.id), 0)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <LessonFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingLesson(null)
        }}
        lesson={editingLesson}
        isLoading={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />

      <ConfirmDeleteDialog
        open={deletingLessonId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingLessonId(null)
        }}
        entityName="esta lição"
        onConfirm={() => {
          if (deletingLessonId !== null) handleDelete(deletingLessonId)
        }}
        isLoading={deleteMutation.isPending}
      />
    </Card>
  )
}
