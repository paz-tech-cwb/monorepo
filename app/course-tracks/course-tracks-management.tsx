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
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Plus, MoreHorizontal, Edit, Trash2, Route, BookOpen, Clock, Target, Link as LinkIcon } from "lucide-react"

interface Course {
  id: string
  title: string
  description: string
  creator: string
  estimatedHours: number
  category: "teologia" | "lideranca" | "ministerio" | "discipulado"
  url?: string
  imageUrl?: string
}

interface CourseTrack {
  id: string
  name: string
  description: string
  category: "lideranca" | "ministerio" | "teologia" | "discipulado"
  courseIds: string[]
  estimatedHours: number
  status: "active" | "inactive"
  createdAt: string
}

// Mock available courses
const availableCourses: Course[] = [
  {
    id: "1",
    title: "Fundamentos da Fe Crista",
    description: "Curso basico sobre os fundamentos da fe crista",
    creator: "Pastor Joao Silva",
    estimatedHours: 16,
    category: "teologia",
  },
  {
    id: "2",
    title: "Lideranca Crista",
    description: "Desenvolvimento de lideres para a igreja",
    creator: "Pastora Maria Santos",
    estimatedHours: 24,
    category: "lideranca",
  },
  {
    id: "3",
    title: "Ministerio de Louvor",
    description: "Treinamento para musicos e cantores",
    creator: "Carlos Mendes",
    estimatedHours: 12,
    category: "ministerio",
  },
  {
    id: "4",
    title: "Hermeneutica Biblica",
    description: "Interpretacao e estudo das Escrituras",
    creator: "Pastor Joao Silva",
    estimatedHours: 20,
    category: "teologia",
  },
  {
    id: "5",
    title: "Gestao de Equipes",
    description: "Como liderar e gerenciar equipes ministeriais",
    creator: "Pastora Maria Santos",
    estimatedHours: 16,
    category: "lideranca",
  },
  {
    id: "6",
    title: "Evangelismo Pessoal",
    description: "Tecnicas e praticas de evangelismo",
    creator: "Pastor Paulo Oliveira",
    estimatedHours: 10,
    category: "ministerio",
  },
  {
    id: "7",
    title: "Discipulado Um a Um",
    description: "Como discipular individualmente",
    creator: "Pastora Maria Santos",
    estimatedHours: 14,
    category: "discipulado",
  },
  {
    id: "8",
    title: "Teologia Sistematica",
    description: "Estudo aprofundado de doutrinas biblicas",
    creator: "Pastor Joao Silva",
    estimatedHours: 40,
    category: "teologia",
  },
]

const mockCourseTracks: CourseTrack[] = [
  {
    id: "1",
    name: "Trilha de Lideranca",
    description: "Formacao completa para lideres da igreja",
    category: "lideranca",
    courseIds: ["2", "5"],
    estimatedHours: 40,
    status: "active",
    createdAt: "2023-01-15",
  },
  {
    id: "2",
    name: "Trilha Teologica",
    description: "Estudo aprofundado das escrituras e teologia",
    category: "teologia",
    courseIds: ["1", "4", "8"],
    estimatedHours: 76,
    status: "active",
    createdAt: "2023-02-20",
  },
  {
    id: "3",
    name: "Trilha de Ministerio",
    description: "Preparacao para diferentes ministerios da igreja",
    category: "ministerio",
    courseIds: ["3", "6"],
    estimatedHours: 22,
    status: "active",
    createdAt: "2023-03-10",
  },
  {
    id: "4",
    name: "Trilha de Discipulado",
    description: "Formacao de discipuladores e mentores",
    category: "discipulado",
    courseIds: ["7"],
    estimatedHours: 14,
    status: "inactive",
    createdAt: "2023-04-05",
  },
]

export function CourseTracksManagement() {
  const [courseTracks, setCourseTracks] = useState<CourseTrack[]>(mockCourseTracks)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isCoursesDialogOpen, setIsCoursesDialogOpen] = useState(false)
  const [editingTrack, setEditingTrack] = useState<CourseTrack | null>(null)
  const [managingCoursesTrack, setManagingCoursesTrack] = useState<CourseTrack | null>(null)
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([])
  const [newTrack, setNewTrack] = useState({
    name: "",
    description: "",
    category: "lideranca" as const,
    courseIds: [] as string[],
    estimatedHours: 0,
  })

  const filteredTracks = courseTracks.filter(
    (track) =>
      track.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      track.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      track.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getCoursesByIds = (courseIds: string[]) => {
    return availableCourses.filter((course) => courseIds.includes(course.id))
  }

  const calculateTotalHours = (courseIds: string[]) => {
    return getCoursesByIds(courseIds).reduce((sum, course) => sum + course.estimatedHours, 0)
  }

  const handleAddTrack = () => {
    const track: CourseTrack = {
      id: Date.now().toString(),
      ...newTrack,
      estimatedHours: calculateTotalHours(newTrack.courseIds),
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
    }
    setCourseTracks([...courseTracks, track])
    setNewTrack({
      name: "",
      description: "",
      category: "lideranca",
      courseIds: [],
      estimatedHours: 0,
    })
    setIsAddDialogOpen(false)
  }

  const handleEditTrack = (track: CourseTrack) => {
    setEditingTrack(track)
    setNewTrack({
      name: track.name,
      description: track.description,
      category: track.category,
      courseIds: track.courseIds,
      estimatedHours: track.estimatedHours,
    })
  }

  const handleUpdateTrack = () => {
    if (!editingTrack) return

    setCourseTracks(courseTracks.map((track) =>
      track.id === editingTrack.id
        ? {
            ...track,
            ...newTrack,
            estimatedHours: calculateTotalHours(newTrack.courseIds),
          }
        : track
    ))
    setEditingTrack(null)
    setNewTrack({
      name: "",
      description: "",
      category: "lideranca",
      courseIds: [],
      estimatedHours: 0,
    })
  }

  const handleDeleteTrack = (trackId: string) => {
    setCourseTracks(courseTracks.filter((track) => track.id !== trackId))
  }

  const handleManageCourses = (track: CourseTrack) => {
    setManagingCoursesTrack(track)
    setSelectedCourseIds(track.courseIds)
    setIsCoursesDialogOpen(true)
  }

  const handleSaveCourses = () => {
    if (!managingCoursesTrack) return

    setCourseTracks(courseTracks.map((track) =>
      track.id === managingCoursesTrack.id
        ? {
            ...track,
            courseIds: selectedCourseIds,
            estimatedHours: calculateTotalHours(selectedCourseIds),
          }
        : track
    ))
    setIsCoursesDialogOpen(false)
    setManagingCoursesTrack(null)
    setSelectedCourseIds([])
  }

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    )
  }

  const getCategoryBadge = (category: string) => {
    const variants = {
      lideranca: { variant: "default" as const, text: "Lideranca" },
      ministerio: { variant: "secondary" as const, text: "Ministerio" },
      teologia: { variant: "outline" as const, text: "Teologia" },
      discipulado: { variant: "destructive" as const, text: "Discipulado" },
    }

    const config = variants[category as keyof typeof variants]
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === "active" ? "default" : "secondary"}>{status === "active" ? "Ativo" : "Inativo"}</Badge>
    )
  }

  const totalHours = courseTracks.reduce((sum, track) => sum + track.estimatedHours, 0)
  const activeTracks = courseTracks.filter((track) => track.status === "active").length

  const TrackForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label htmlFor={isEdit ? "edit-name" : "name"}>Nome da Trilha</Label>
        <Input
          id={isEdit ? "edit-name" : "name"}
          value={newTrack.name}
          onChange={(e) => setNewTrack({ ...newTrack, name: e.target.value })}
          placeholder="Nome da trilha"
        />
      </div>
      <div className="col-span-2">
        <Label htmlFor={isEdit ? "edit-description" : "description"}>Descricao</Label>
        <Textarea
          id={isEdit ? "edit-description" : "description"}
          value={newTrack.description}
          onChange={(e) => setNewTrack({ ...newTrack, description: e.target.value })}
          placeholder="Descricao da trilha"
          rows={3}
        />
      </div>
      <div>
        <Label htmlFor={isEdit ? "edit-category" : "category"}>Categoria</Label>
        <select
          id={isEdit ? "edit-category" : "category"}
          value={newTrack.category}
          onChange={(e) => setNewTrack({ ...newTrack, category: e.target.value as CourseTrack["category"] })}
          className="w-full p-2 border border-input rounded-md bg-background"
        >
          <option value="lideranca">Lideranca</option>
          <option value="ministerio">Ministerio</option>
          <option value="teologia">Teologia</option>
          <option value="discipulado">Discipulado</option>
        </select>
      </div>
      <div>
        <Label htmlFor={isEdit ? "edit-estimatedHours" : "estimatedHours"}>Horas Estimadas</Label>
        <Input
          id={isEdit ? "edit-estimatedHours" : "estimatedHours"}
          type="number"
          value={newTrack.estimatedHours || calculateTotalHours(newTrack.courseIds)}
          onChange={(e) => setNewTrack({ ...newTrack, estimatedHours: Number.parseInt(e.target.value) || 0 })}
          placeholder="Auto-calculado pelos cursos"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Se nao informado, sera a soma das horas dos cursos
        </p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Trilhos de Cursos</h1>
        <p className="text-muted-foreground">Gerencie as trilhas de formacao da igreja</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Trilhas</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courseTracks.length}</div>
            <p className="text-xs text-muted-foreground">{activeTracks} ativas</p>
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
            <CardTitle className="text-sm font-medium">Taxa de Ativacao</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((activeTracks / courseTracks.length) * 100)}%</div>
            <p className="text-xs text-muted-foreground">Trilhas ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cursos por Trilha</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(courseTracks.reduce((sum, track) => sum + track.courseIds.length, 0) / courseTracks.length)}
            </div>
            <p className="text-xs text-muted-foreground">Media de cursos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Trilhas</CardTitle>
              <CardDescription>{filteredTracks.length} trilha(s) encontrada(s)</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Trilha
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Nova Trilha</DialogTitle>
                  <DialogDescription>Preencha os dados da nova trilha de cursos</DialogDescription>
                </DialogHeader>
                <TrackForm />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddTrack}>Criar Trilha</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trilha</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Cursos</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTracks.map((track) => (
                <TableRow key={track.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{track.name}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-xs">{track.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getCategoryBadge(track.category)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{track.courseIds.length} cursos</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {getCoursesByIds(track.courseIds).slice(0, 2).map((course) => (
                          <Badge key={course.id} variant="outline" className="text-xs">
                            {course.title}
                          </Badge>
                        ))}
                        {track.courseIds.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{track.courseIds.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{track.estimatedHours}h</TableCell>
                  <TableCell>{getStatusBadge(track.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleManageCourses(track)}>
                          <LinkIcon className="mr-2 h-4 w-4" />
                          Gerenciar Cursos
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditTrack(track)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteTrack(track.id)} className="text-destructive">
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

      {/* Edit Track Dialog */}
      <Dialog open={!!editingTrack} onOpenChange={() => setEditingTrack(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Trilha</DialogTitle>
            <DialogDescription>Atualize os dados da trilha</DialogDescription>
          </DialogHeader>
          <TrackForm isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTrack(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateTrack}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Courses Dialog */}
      <Dialog open={isCoursesDialogOpen} onOpenChange={setIsCoursesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Gerenciar Cursos - {managingCoursesTrack?.name}</DialogTitle>
            <DialogDescription>
              Selecione os cursos que fazem parte desta trilha.
              Total de horas selecionadas: {calculateTotalHours(selectedCourseIds)}h
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[50vh] space-y-2">
            {availableCourses.map((course) => (
              <div
                key={course.id}
                className={`flex items-center space-x-3 p-3 rounded-lg border ${
                  selectedCourseIds.includes(course.id)
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <Checkbox
                  id={`course-${course.id}`}
                  checked={selectedCourseIds.includes(course.id)}
                  onCheckedChange={() => toggleCourseSelection(course.id)}
                />
                <div className="flex-1">
                  <label
                    htmlFor={`course-${course.id}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {course.title}
                  </label>
                  <p className="text-xs text-muted-foreground">{course.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {course.estimatedHours}h
                    </Badge>
                    {getCategoryBadge(course.category)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCoursesDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCourses}>
              Salvar ({selectedCourseIds.length} cursos)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
