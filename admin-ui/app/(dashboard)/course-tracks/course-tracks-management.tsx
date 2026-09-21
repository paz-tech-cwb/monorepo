"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { FormDrawer } from "@/components/ui/form-drawer"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Plus, MoreHorizontal, Edit, Trash2, Route, BookOpen, Target } from "lucide-react"
import {
  useCourseTracks,
  useCreateCourseTrack,
  useUpdateCourseTrack,
  useDeleteCourseTrack,
} from "@/lib/hooks/use-course-tracks"
import type { CourseTrack, CreateCourseTrackRequest, UpdateCourseTrackRequest } from "@/lib/api/types/academy"

export function CourseTracksManagement() {
  const { data: tracks = [], isLoading, error } = useCourseTracks()
  const createMutation = useCreateCourseTrack()
  const updateMutation = useUpdateCourseTrack()
  const deleteMutation = useDeleteCourseTrack()

  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingTrack, setEditingTrack] = useState<CourseTrack | null>(null)
  const [deletingTrackId, setDeletingTrackId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  })

  const filteredTracks = tracks.filter(
    (track) =>
      track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (track.description || "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalCourses = tracks.reduce((sum, track) => sum + track.courses.length, 0)

  const resetForm = () => {
    setFormData({ title: "", description: "" })
  }

  const handleAddTrack = async () => {
    const data: CreateCourseTrackRequest = {
      title: formData.title,
      description: formData.description || null,
    }

    try {
      await createMutation.mutateAsync(data)
      resetForm()
      setIsAddDialogOpen(false)
    } catch (err) {
      console.error("Failed to create course track:", err)
    }
  }

  const handleEditTrack = (track: CourseTrack) => {
    setEditingTrack(track)
    setFormData({
      title: track.title,
      description: track.description || "",
    })
  }

  const handleUpdateTrack = async () => {
    if (!editingTrack) return

    const data: UpdateCourseTrackRequest = {
      title: formData.title,
      description: formData.description || null,
    }

    try {
      await updateMutation.mutateAsync({ id: editingTrack.id, data })
      setEditingTrack(null)
      resetForm()
    } catch (err) {
      console.error("Failed to update course track:", err)
    }
  }

  const handleDeleteTrack = async (trackId: number) => {
    try {
      await deleteMutation.mutateAsync(trackId)
      setDeletingTrackId(null)
    } catch (err) {
      console.error("Failed to delete course track:", err)
    }
  }

  const trackFormFields = (
    <div className="grid gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="track-title">Título</Label>
        <Input
          id="track-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Título da trilha"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="track-description">Descrição</Label>
        <Textarea
          id="track-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição da trilha"
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Trilhos de Cursos</h1>
          <p className="text-muted-foreground">Gerencie as trilhas de formação da academia</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Criar Trilha
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Trilhas</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "-" : tracks.length}</div>
            <p className="text-xs text-muted-foreground">Trilhas cadastradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cursos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "-" : totalCourses}</div>
            <p className="text-xs text-muted-foreground">Em todas as trilhas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Media por Trilha</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading || tracks.length === 0 ? "-" : Math.round(totalCourses / tracks.length)}
            </div>
            <p className="text-xs text-muted-foreground">Cursos por trilha</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Trilhas da Academia</CardTitle>
            <CardDescription>{filteredTracks.length} trilha(s) encontrada(s)</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar trilhas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="text-destructive text-center py-8">Erro ao carregar trilhas. Tente novamente mais tarde.</p>
          ) : filteredTracks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma trilha encontrada.</p>
          ) : (
            <div className="space-y-4">
              {filteredTracks.map((track) => (
                <Card key={track.id} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{track.title}</CardTitle>
                        {track.description && (
                          <CardDescription className="mt-1">{track.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline">{track.courses.length} curso(s)</Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setTimeout(() => handleEditTrack(track), 0)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setTimeout(() => setDeletingTrackId(track.id), 0)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  {track.courses.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2">
                        {track.courses.map((course) => (
                          <div
                            key={course.id}
                            className="flex items-center gap-2 border border-border rounded-md px-2 py-1 text-sm"
                          >
                            <BookOpen className="h-3 w-3 text-muted-foreground" />
                            <span>{course.title}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FormDrawer
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title="Criar Nova Trilha"
        description="Preencha os dados da trilha"
        isLoading={createMutation.isPending}
        onSubmit={handleAddTrack}
        submitLabel="Criar Trilha"
      >
        {trackFormFields}
      </FormDrawer>

      <FormDrawer
        open={!!editingTrack}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTrack(null)
            resetForm()
          }
        }}
        title="Editar Trilha"
        description="Atualize os dados da trilha"
        isLoading={updateMutation.isPending}
        onSubmit={handleUpdateTrack}
        submitLabel="Salvar"
      >
        {trackFormFields}
      </FormDrawer>

      <ConfirmDeleteDialog
        open={deletingTrackId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingTrackId(null)
        }}
        entityName="esta trilha"
        onConfirm={() => {
          if (deletingTrackId !== null) handleDeleteTrack(deletingTrackId)
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
