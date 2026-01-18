"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, MoreHorizontal, Edit, Trash2, BookOpen, Clock, Link as LinkIcon, Image } from "lucide-react"

interface Course {
  id: string
  title: string
  description: string
  creator: string
  estimatedHours: number
  category: "teologia" | "lideranca" | "ministerio" | "discipulado"
  url?: string
  imageUrl?: string
  status: "draft" | "published" | "archived"
}

const mockCourses: Course[] = [
  {
    id: "1",
    title: "Fundamentos da Fe Crista",
    description: "Curso basico sobre os fundamentos da fe crista",
    creator: "Pastor Joao Silva",
    estimatedHours: 16,
    category: "teologia",
    url: "https://academia.igrejadapaz.com.br/fundamentos",
    imageUrl: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800",
    status: "published",
  },
  {
    id: "2",
    title: "Lideranca Crista",
    description: "Desenvolvimento de lideres para a igreja",
    creator: "Pastora Maria Santos",
    estimatedHours: 24,
    category: "lideranca",
    url: "https://academia.igrejadapaz.com.br/lideranca",
    imageUrl: "https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=800",
    status: "published",
  },
  {
    id: "3",
    title: "Ministerio de Louvor",
    description: "Treinamento para musicos e cantores",
    creator: "Carlos Mendes",
    estimatedHours: 12,
    category: "ministerio",
    url: "https://academia.igrejadapaz.com.br/louvor",
    imageUrl: "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800",
    status: "draft",
  },
]

export function CoursesManagement() {
  const [courses, setCourses] = useState<Course[]>(mockCourses)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    creator: "",
    estimatedHours: 0,
    category: "teologia" as const,
    url: "",
    imageUrl: "",
  })

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.creator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddCourse = () => {
    const course: Course = {
      id: Date.now().toString(),
      ...newCourse,
      status: "draft",
    }
    setCourses([...courses, course])
    setNewCourse({
      title: "",
      description: "",
      creator: "",
      estimatedHours: 0,
      category: "teologia",
      url: "",
      imageUrl: "",
    })
    setIsAddDialogOpen(false)
  }

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course)
    setNewCourse({
      title: course.title,
      description: course.description,
      creator: course.creator,
      estimatedHours: course.estimatedHours,
      category: course.category,
      url: course.url || "",
      imageUrl: course.imageUrl || "",
    })
  }

  const handleUpdateCourse = () => {
    if (!editingCourse) return

    setCourses(courses.map((course) => (course.id === editingCourse.id ? { ...course, ...newCourse } : course)))
    setEditingCourse(null)
    setNewCourse({
      title: "",
      description: "",
      creator: "",
      estimatedHours: 0,
      category: "teologia",
      url: "",
      imageUrl: "",
    })
  }

  const handleDeleteCourse = (courseId: string) => {
    setCourses(courses.filter((course) => course.id !== courseId))
  }

  const getCategoryBadge = (category: string) => {
    const variants = {
      teologia: { variant: "default" as const, text: "Teologia" },
      lideranca: { variant: "secondary" as const, text: "Lideranca" },
      ministerio: { variant: "outline" as const, text: "Ministerio" },
      discipulado: { variant: "destructive" as const, text: "Discipulado" },
    }

    const config = variants[category as keyof typeof variants]
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { variant: "secondary" as const, text: "Rascunho" },
      published: { variant: "default" as const, text: "Publicado" },
      archived: { variant: "outline" as const, text: "Arquivado" },
    }

    const config = variants[status as keyof typeof variants]
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  const totalHours = courses.reduce((sum, course) => sum + course.estimatedHours, 0)
  const publishedCourses = courses.filter((course) => course.status === "published").length

  const CourseForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label htmlFor={isEdit ? "edit-title" : "title"}>Titulo do Curso</Label>
        <Input
          id={isEdit ? "edit-title" : "title"}
          value={newCourse.title}
          onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
          placeholder="Nome do curso"
        />
      </div>
      <div className="col-span-2">
        <Label htmlFor={isEdit ? "edit-description" : "description"}>Descricao</Label>
        <Textarea
          id={isEdit ? "edit-description" : "description"}
          value={newCourse.description}
          onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
          placeholder="Descricao do curso"
          rows={3}
        />
      </div>
      <div>
        <Label htmlFor={isEdit ? "edit-creator" : "creator"}>Criador</Label>
        <Input
          id={isEdit ? "edit-creator" : "creator"}
          value={newCourse.creator}
          onChange={(e) => setNewCourse({ ...newCourse, creator: e.target.value })}
          placeholder="Nome do criador"
        />
      </div>
      <div>
        <Label htmlFor={isEdit ? "edit-estimatedHours" : "estimatedHours"}>Horas Estimadas</Label>
        <Input
          id={isEdit ? "edit-estimatedHours" : "estimatedHours"}
          type="number"
          value={newCourse.estimatedHours}
          onChange={(e) => setNewCourse({ ...newCourse, estimatedHours: Number.parseInt(e.target.value) || 0 })}
          placeholder="16"
        />
      </div>
      <div>
        <Label htmlFor={isEdit ? "edit-category" : "category"}>Categoria</Label>
        <select
          id={isEdit ? "edit-category" : "category"}
          value={newCourse.category}
          onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value as Course["category"] })}
          className="w-full p-2 border border-input rounded-md bg-background"
        >
          <option value="teologia">Teologia</option>
          <option value="lideranca">Lideranca</option>
          <option value="ministerio">Ministerio</option>
          <option value="discipulado">Discipulado</option>
        </select>
      </div>
      <div>
        <Label htmlFor={isEdit ? "edit-url" : "url"}>URL do Curso</Label>
        <Input
          id={isEdit ? "edit-url" : "url"}
          value={newCourse.url}
          onChange={(e) => setNewCourse({ ...newCourse, url: e.target.value })}
          placeholder="https://exemplo.com/curso"
        />
      </div>
      <div className="col-span-2">
        <Label htmlFor={isEdit ? "edit-imageUrl" : "imageUrl"}>URL da Imagem (Capa)</Label>
        <Input
          id={isEdit ? "edit-imageUrl" : "imageUrl"}
          value={newCourse.imageUrl}
          onChange={(e) => setNewCourse({ ...newCourse, imageUrl: e.target.value })}
          placeholder="https://exemplo.com/imagem.jpg"
        />
      </div>
    </div>
  )

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
            <div className="text-2xl font-bold">{courses.length}</div>
            <p className="text-xs text-muted-foreground">{publishedCourses} publicados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Horas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours}h</div>
            <p className="text-xs text-muted-foreground">Conteudo total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com URL</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.filter((c) => c.url).length}</div>
            <p className="text-xs text-muted-foreground">Cursos com link</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Imagem</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.filter((c) => c.imageUrl).length}</div>
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
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Curso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Novo Curso</DialogTitle>
                  <DialogDescription>Preencha os dados do novo curso</DialogDescription>
                </DialogHeader>
                <CourseForm />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddCourse}>Criar Curso</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                      {course.imageUrl && (
                        <img
                          src={course.imageUrl}
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
                  <TableCell>{getCategoryBadge(course.category)}</TableCell>
                  <TableCell>{course.estimatedHours}h</TableCell>
                  <TableCell>{getStatusBadge(course.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditCourse(course)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteCourse(course.id)} className="text-destructive">
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

      {/* Edit Course Dialog */}
      <Dialog open={!!editingCourse} onOpenChange={() => setEditingCourse(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Curso</DialogTitle>
            <DialogDescription>Atualize os dados do curso</DialogDescription>
          </DialogHeader>
          <CourseForm isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCourse(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateCourse}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
