"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormDrawer } from "@/components/ui/form-drawer"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Search, Plus, MoreHorizontal, Edit, Trash2, BookOpen, Clock, Link as LinkIcon, Image, Loader2 } from "lucide-react"
import { useCourses, useCourseStats, useCreateCourse, useUpdateCourse, useDeleteCourse } from "@/lib/hooks/use-courses"
import type { Course, CourseCategory, CreateCourseRequest, UpdateCourseRequest } from "@/lib/api/types/courses"

const CATEGORY_LABELS: Record<string, string> = {
  teologia: "Teologia",
  lideranca: "Liderança",
  ministerio: "Ministério",
  discipulado: "Discipulado",
}

export function CoursesManagement() {
  const { data: courses = [], isLoading, error } = useCourses()
  const { data: stats } = useCourseStats()
  const createCourseMutation = useCreateCourse()
  const updateCourseMutation = useUpdateCourse()
  const deleteCourseMutation = useDeleteCourse()

  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    creator: "",
    estimated_hours: 0,
    category: "teologia" as CourseCategory,
    url: "",
    image_url: "",
    is_published: false,
  })

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.creator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      creator: "",
      estimated_hours: 0,
      category: "teologia",
      url: "",
      image_url: "",
      is_published: false,
    })
  }

  const handleAddCourse = async () => {
    const courseData: CreateCourseRequest = {
      title: formData.title,
      description: formData.description,
      creator: formData.creator,
      estimated_hours: formData.estimated_hours,
      category: formData.category,
      url: formData.url || null,
      image_url: formData.image_url || null,
      status: "draft",
    }

    try {
      await createCourseMutation.mutateAsync(courseData)
      resetForm()
      setIsAddDialogOpen(false)
    } catch (err) {
      console.error("Failed to create course:", err)
    }
  }

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course)
    setFormData({
      title: course.title,
      description: course.description,
      creator: course.creator,
      estimated_hours: course.estimated_hours,
      category: course.category,
      url: course.url || "",
      image_url: course.image_url || "",
      is_published: false,
    })
  }

  const handleUpdateCourse = async () => {
    if (!editingCourse) return

    const updateData: UpdateCourseRequest = {
      title: formData.title,
      description: formData.description,
      creator: formData.creator,
      estimated_hours: formData.estimated_hours,
      category: formData.category,
      url: formData.url || null,
      image_url: formData.image_url || null,
    }

    try {
      await updateCourseMutation.mutateAsync({ id: editingCourse.id, data: updateData })
      setEditingCourse(null)
      resetForm()
    } catch (err) {
      console.error("Failed to update course:", err)
    }
  }

  const handleDeleteCourse = async (courseId: string) => {
    try {
      await deleteCourseMutation.mutateAsync(courseId)
      setDeletingCourseId(null)
    } catch (err) {
      console.error("Failed to delete course:", err)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { variant: "secondary" as const, text: "Rascunho" },
      published: { variant: "default" as const, text: "Publicado" },
      archived: { variant: "outline" as const, text: "Arquivado" },
    }

    const config = variants[status as keyof typeof variants]
    if (!config) return <Badge variant="outline">{status}</Badge>
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  const CourseFormFields = () => (
    <div className="grid gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="course-title">Título</Label>
        <Input
          id="course-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Título do curso"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="course-description">Descrição</Label>
        <Textarea
          id="course-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição do curso"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="course-creator">Criador</Label>
        <Input
          id="course-creator"
          value={formData.creator}
          onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
          placeholder="Nome do criador"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="course-hours">Horas estimadas</Label>
          <Input
            id="course-hours"
            type="number"
            value={formData.estimated_hours}
            onChange={(e) => setFormData({ ...formData, estimated_hours: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="course-category">Categoria</Label>
          <Select
            value={formData.category}
            onValueChange={(v) => setFormData({ ...formData, category: v as CourseCategory })}
          >
            <SelectTrigger id="course-category">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="teologia">Teologia</SelectItem>
              <SelectItem value="lideranca">Liderança</SelectItem>
              <SelectItem value="ministerio">Ministério</SelectItem>
              <SelectItem value="discipulado">Discipulado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Separator />
      <div className="space-y-1.5">
        <Label htmlFor="course-url">URL do curso (opcional)</Label>
        <Input
          id="course-url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="course-image_url">URL da imagem (opcional)</Label>
        <Input
          id="course-image_url"
          value={formData.image_url}
          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <Label htmlFor="course-published">Publicado</Label>
        <Switch
          id="course-published"
          checked={formData.is_published}
          onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
        />
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Erro ao carregar cursos: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Cursos</h1>
        <p className="text-muted-foreground">Gerencie os cursos oferecidos pela igreja</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cursos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_courses ?? 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.published_courses ?? 0} publicados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Horas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_hours ?? 0}h</div>
            <p className="text-xs text-muted-foreground">Conteudo total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com URL</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.courses_with_url ?? 0}</div>
            <p className="text-xs text-muted-foreground">Cursos com link</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Imagem</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.courses_with_image ?? 0}</div>
            <p className="text-xs text-muted-foreground">Cursos com capa</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Cursos</CardTitle>
              <CardDescription>{filteredCourses.length} curso(s) encontrado(s)</CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Curso
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cursos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Criador</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {course.image_url && (
                        <img
                          src={course.image_url}
                          alt={course.title}
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium">{course.title}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">{course.description}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{course.creator}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {CATEGORY_LABELS[course.category] ?? course.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{course.estimated_hours}h</TableCell>
                  <TableCell>{getStatusBadge(course.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTimeout(() => handleEditCourse(course), 0)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setTimeout(() => setDeletingCourseId(course.id), 0)}
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
        </CardContent>
      </Card>

      <FormDrawer
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title="Criar Novo Curso"
        description="Preencha os dados do curso"
        isLoading={createCourseMutation.isPending}
        onSubmit={handleAddCourse}
        submitLabel="Criar Curso"
      >
        <CourseFormFields />
      </FormDrawer>

      <FormDrawer
        open={!!editingCourse}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCourse(null)
            resetForm()
          }
        }}
        title="Editar Curso"
        description="Atualize os dados do curso"
        isLoading={updateCourseMutation.isPending}
        onSubmit={handleUpdateCourse}
        submitLabel="Salvar"
      >
        <CourseFormFields />
      </FormDrawer>

      <ConfirmDeleteDialog
        open={deletingCourseId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingCourseId(null)
        }}
        entityName="este curso"
        onConfirm={() => {
          if (deletingCourseId !== null) handleDeleteCourse(deletingCourseId)
        }}
        isLoading={deleteCourseMutation.isPending}
      />
    </div>
  )
}
