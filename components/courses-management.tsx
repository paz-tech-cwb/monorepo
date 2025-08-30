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
import { Search, Plus, MoreHorizontal, Edit, Trash2, BookOpen, Users, Clock, Award } from "lucide-react"

interface Course {
  id: string
  title: string
  description: string
  instructor: string
  duration: string
  level: "iniciante" | "intermediario" | "avancado"
  category: "teologia" | "lideranca" | "ministerio" | "discipulado"
  enrolled: number
  maxStudents: number
  startDate: string
  endDate: string
  status: "upcoming" | "ongoing" | "completed"
  price: number
}

const mockCourses: Course[] = [
  {
    id: "1",
    title: "Fundamentos da Fé Cristã",
    description: "Curso básico sobre os fundamentos da fé cristã",
    instructor: "Pastor João Silva",
    duration: "8 semanas",
    level: "iniciante",
    category: "teologia",
    enrolled: 25,
    maxStudents: 30,
    startDate: "2024-02-01",
    endDate: "2024-03-28",
    status: "upcoming",
    price: 0,
  },
  {
    id: "2",
    title: "Liderança Cristã",
    description: "Desenvolvimento de líderes para a igreja",
    instructor: "Pastora Maria Santos",
    duration: "12 semanas",
    level: "intermediario",
    category: "lideranca",
    enrolled: 15,
    maxStudents: 20,
    startDate: "2024-01-15",
    endDate: "2024-04-08",
    status: "ongoing",
    price: 50,
  },
  {
    id: "3",
    title: "Ministério de Louvor",
    description: "Treinamento para músicos e cantores",
    instructor: "Carlos Mendes",
    duration: "6 semanas",
    level: "iniciante",
    category: "ministerio",
    enrolled: 12,
    maxStudents: 15,
    startDate: "2023-11-01",
    endDate: "2023-12-15",
    status: "completed",
    price: 30,
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
    instructor: "",
    duration: "",
    level: "iniciante" as const,
    category: "teologia" as const,
    maxStudents: 20,
    startDate: "",
    endDate: "",
    price: 0,
  })

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddCourse = () => {
    const course: Course = {
      id: Date.now().toString(),
      ...newCourse,
      enrolled: 0,
      status: "upcoming",
    }
    setCourses([...courses, course])
    setNewCourse({
      title: "",
      description: "",
      instructor: "",
      duration: "",
      level: "iniciante",
      category: "teologia",
      maxStudents: 20,
      startDate: "",
      endDate: "",
      price: 0,
    })
    setIsAddDialogOpen(false)
  }

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course)
    setNewCourse({
      title: course.title,
      description: course.description,
      instructor: course.instructor,
      duration: course.duration,
      level: course.level,
      category: course.category,
      maxStudents: course.maxStudents,
      startDate: course.startDate,
      endDate: course.endDate,
      price: course.price,
    })
  }

  const handleUpdateCourse = () => {
    if (!editingCourse) return

    setCourses(courses.map((course) => (course.id === editingCourse.id ? { ...course, ...newCourse } : course)))
    setEditingCourse(null)
    setNewCourse({
      title: "",
      description: "",
      instructor: "",
      duration: "",
      level: "iniciante",
      category: "teologia",
      maxStudents: 20,
      startDate: "",
      endDate: "",
      price: 0,
    })
  }

  const handleDeleteCourse = (courseId: string) => {
    setCourses(courses.filter((course) => course.id !== courseId))
  }

  const getLevelBadge = (level: string) => {
    const variants = {
      iniciante: { variant: "secondary" as const, text: "Iniciante" },
      intermediario: { variant: "default" as const, text: "Intermediário" },
      avancado: { variant: "destructive" as const, text: "Avançado" },
    }

    const config = variants[level as keyof typeof variants]
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  const getCategoryBadge = (category: string) => {
    const variants = {
      teologia: { variant: "default" as const, text: "Teologia" },
      lideranca: { variant: "secondary" as const, text: "Liderança" },
      ministerio: { variant: "outline" as const, text: "Ministério" },
      discipulado: { variant: "destructive" as const, text: "Discipulado" },
    }

    const config = variants[category as keyof typeof variants]
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      upcoming: { variant: "secondary" as const, text: "Próximo" },
      ongoing: { variant: "default" as const, text: "Em andamento" },
      completed: { variant: "outline" as const, text: "Concluído" },
    }

    const config = variants[status as keyof typeof variants]
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  const totalStudents = courses.reduce((sum, course) => sum + course.enrolled, 0)
  const totalCapacity = courses.reduce((sum, course) => sum + course.maxStudents, 0)
  const ongoingCourses = courses.filter((course) => course.status === "ongoing").length

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
            <p className="text-xs text-muted-foreground">{ongoingCourses} em andamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">de {totalCapacity} vagas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Ocupação</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((totalStudents / totalCapacity) * 100)}%</div>
            <p className="text-xs text-muted-foreground">Vagas preenchidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {courses.reduce((sum, course) => sum + course.enrolled * course.price, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Arrecadado</p>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="title">Título do Curso</Label>
                    <Input
                      id="title"
                      value={newCourse.title}
                      onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                      placeholder="Nome do curso"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={newCourse.description}
                      onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                      placeholder="Descrição do curso"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="instructor">Instrutor</Label>
                    <Input
                      id="instructor"
                      value={newCourse.instructor}
                      onChange={(e) => setNewCourse({ ...newCourse, instructor: e.target.value })}
                      placeholder="Nome do instrutor"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duração</Label>
                    <Input
                      id="duration"
                      value={newCourse.duration}
                      onChange={(e) => setNewCourse({ ...newCourse, duration: e.target.value })}
                      placeholder="8 semanas"
                    />
                  </div>
                  <div>
                    <Label htmlFor="level">Nível</Label>
                    <select
                      id="level"
                      value={newCourse.level}
                      onChange={(e) => setNewCourse({ ...newCourse, level: e.target.value as any })}
                      className="w-full p-2 border border-input rounded-md bg-background"
                    >
                      <option value="iniciante">Iniciante</option>
                      <option value="intermediario">Intermediário</option>
                      <option value="avancado">Avançado</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <select
                      id="category"
                      value={newCourse.category}
                      onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value as any })}
                      className="w-full p-2 border border-input rounded-md bg-background"
                    >
                      <option value="teologia">Teologia</option>
                      <option value="lideranca">Liderança</option>
                      <option value="ministerio">Ministério</option>
                      <option value="discipulado">Discipulado</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="maxStudents">Máximo de Alunos</Label>
                    <Input
                      id="maxStudents"
                      type="number"
                      value={newCourse.maxStudents}
                      onChange={(e) =>
                        setNewCourse({ ...newCourse, maxStudents: Number.parseInt(e.target.value) || 20 })
                      }
                      placeholder="20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Preço (R$)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={newCourse.price}
                      onChange={(e) => setNewCourse({ ...newCourse, price: Number.parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="startDate">Data de Início</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newCourse.startDate}
                      onChange={(e) => setNewCourse({ ...newCourse, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Data de Término</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newCourse.endDate}
                      onChange={(e) => setNewCourse({ ...newCourse, endDate: e.target.value })}
                    />
                  </div>
                </div>
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
                <TableHead>Instrutor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Alunos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead className="w-[70px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{course.title}</p>
                      <p className="text-sm text-muted-foreground">{course.duration}</p>
                    </div>
                  </TableCell>
                  <TableCell>{course.instructor}</TableCell>
                  <TableCell>{getCategoryBadge(course.category)}</TableCell>
                  <TableCell>{getLevelBadge(course.level)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">
                        {course.enrolled}/{course.maxStudents}
                      </p>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                        <div
                          className="bg-primary h-1.5 rounded-full"
                          style={{ width: `${(course.enrolled / course.maxStudents) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(course.status)}</TableCell>
                  <TableCell>R$ {course.price}</TableCell>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="edit-title">Título do Curso</Label>
              <Input
                id="edit-title"
                value={newCourse.title}
                onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                placeholder="Nome do curso"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={newCourse.description}
                onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                placeholder="Descrição do curso"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-instructor">Instrutor</Label>
              <Input
                id="edit-instructor"
                value={newCourse.instructor}
                onChange={(e) => setNewCourse({ ...newCourse, instructor: e.target.value })}
                placeholder="Nome do instrutor"
              />
            </div>
            <div>
              <Label htmlFor="edit-duration">Duração</Label>
              <Input
                id="edit-duration"
                value={newCourse.duration}
                onChange={(e) => setNewCourse({ ...newCourse, duration: e.target.value })}
                placeholder="8 semanas"
              />
            </div>
            <div>
              <Label htmlFor="edit-level">Nível</Label>
              <select
                id="edit-level"
                value={newCourse.level}
                onChange={(e) => setNewCourse({ ...newCourse, level: e.target.value as any })}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="iniciante">Iniciante</option>
                <option value="intermediario">Intermediário</option>
                <option value="avancado">Avançado</option>
              </select>
            </div>
            <div>
              <Label htmlFor="edit-category">Categoria</Label>
              <select
                id="edit-category"
                value={newCourse.category}
                onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value as any })}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="teologia">Teologia</option>
                <option value="lideranca">Liderança</option>
                <option value="ministerio">Ministério</option>
                <option value="discipulado">Discipulado</option>
              </select>
            </div>
            <div>
              <Label htmlFor="edit-maxStudents">Máximo de Alunos</Label>
              <Input
                id="edit-maxStudents"
                type="number"
                value={newCourse.maxStudents}
                onChange={(e) => setNewCourse({ ...newCourse, maxStudents: Number.parseInt(e.target.value) || 20 })}
                placeholder="20"
              />
            </div>
            <div>
              <Label htmlFor="edit-price">Preço (R$)</Label>
              <Input
                id="edit-price"
                type="number"
                value={newCourse.price}
                onChange={(e) => setNewCourse({ ...newCourse, price: Number.parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="edit-startDate">Data de Início</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={newCourse.startDate}
                onChange={(e) => setNewCourse({ ...newCourse, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-endDate">Data de Término</Label>
              <Input
                id="edit-endDate"
                type="date"
                value={newCourse.endDate}
                onChange={(e) => setNewCourse({ ...newCourse, endDate: e.target.value })}
              />
            </div>
          </div>
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
