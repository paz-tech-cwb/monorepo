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
import { Search, Plus, MoreHorizontal, Edit, Trash2, Route, BookOpen, Users, Target } from "lucide-react"

interface CourseTrack {
  id: string
  name: string
  description: string
  category: "lideranca" | "ministerio" | "teologia" | "discipulado"
  courses: string[]
  duration: string
  level: "iniciante" | "intermediario" | "avancado"
  enrolled: number
  maxStudents: number
  status: "active" | "inactive"
  createdAt: string
}

const mockCourseTracks: CourseTrack[] = [
  {
    id: "1",
    name: "Trilha de Liderança",
    description: "Formação completa para líderes da igreja",
    category: "lideranca",
    courses: ["Fundamentos da Liderança", "Gestão de Equipes", "Comunicação Eficaz", "Tomada de Decisões"],
    duration: "6 meses",
    level: "intermediario",
    enrolled: 18,
    maxStudents: 25,
    status: "active",
    createdAt: "2023-01-15",
  },
  {
    id: "2",
    name: "Trilha Teológica",
    description: "Estudo aprofundado das escrituras e teologia",
    category: "teologia",
    courses: ["Hermenêutica", "Teologia Sistemática", "História da Igreja", "Apologética"],
    duration: "12 meses",
    level: "avancado",
    enrolled: 12,
    maxStudents: 20,
    status: "active",
    createdAt: "2023-02-20",
  },
  {
    id: "3",
    name: "Trilha de Ministério",
    description: "Preparação para diferentes ministérios da igreja",
    category: "ministerio",
    courses: ["Ministério de Louvor", "Ministério Infantil", "Ministério de Jovens", "Evangelismo"],
    duration: "4 meses",
    level: "iniciante",
    enrolled: 22,
    maxStudents: 30,
    status: "active",
    createdAt: "2023-03-10",
  },
  {
    id: "4",
    name: "Trilha de Discipulado",
    description: "Formação de discipuladores e mentores",
    category: "discipulado",
    courses: ["Fundamentos do Discipulado", "Mentoria Cristã", "Crescimento Espiritual", "Multiplicação"],
    duration: "8 meses",
    level: "intermediario",
    enrolled: 8,
    maxStudents: 15,
    status: "inactive",
    createdAt: "2023-04-05",
  },
]

export function CourseTracksManagement() {
  const [courseTracks, setCourseTracks] = useState<CourseTrack[]>(mockCourseTracks)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingTrack, setEditingTrack] = useState<CourseTrack | null>(null)
  const [newTrack, setNewTrack] = useState({
    name: "",
    description: "",
    category: "lideranca" as const,
    courses: [] as string[],
    duration: "",
    level: "iniciante" as const,
    maxStudents: 20,
  })

  const filteredTracks = courseTracks.filter(
    (track) =>
      track.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      track.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      track.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddTrack = () => {
    const track: CourseTrack = {
      id: Date.now().toString(),
      ...newTrack,
      enrolled: 0,
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
    }
    setCourseTracks([...courseTracks, track])
    setNewTrack({
      name: "",
      description: "",
      category: "lideranca",
      courses: [],
      duration: "",
      level: "iniciante",
      maxStudents: 20,
    })
    setIsAddDialogOpen(false)
  }

  const handleEditTrack = (track: CourseTrack) => {
    setEditingTrack(track)
    setNewTrack({
      name: track.name,
      description: track.description,
      category: track.category,
      courses: track.courses,
      duration: track.duration,
      level: track.level,
      maxStudents: track.maxStudents,
    })
  }

  const handleUpdateTrack = () => {
    if (!editingTrack) return

    setCourseTracks(courseTracks.map((track) => (track.id === editingTrack.id ? { ...track, ...newTrack } : track)))
    setEditingTrack(null)
    setNewTrack({
      name: "",
      description: "",
      category: "lideranca",
      courses: [],
      duration: "",
      level: "iniciante",
      maxStudents: 20,
    })
  }

  const handleDeleteTrack = (trackId: string) => {
    setCourseTracks(courseTracks.filter((track) => track.id !== trackId))
  }

  const getCategoryBadge = (category: string) => {
    const variants = {
      lideranca: { variant: "default" as const, text: "Liderança" },
      ministerio: { variant: "secondary" as const, text: "Ministério" },
      teologia: { variant: "outline" as const, text: "Teologia" },
      discipulado: { variant: "destructive" as const, text: "Discipulado" },
    }

    const config = variants[category as keyof typeof variants]
    return <Badge variant={config.variant}>{config.text}</Badge>
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

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === "active" ? "default" : "secondary"}>{status === "active" ? "Ativo" : "Inativo"}</Badge>
    )
  }

  const totalStudents = courseTracks.reduce((sum, track) => sum + track.enrolled, 0)
  const totalCapacity = courseTracks.reduce((sum, track) => sum + track.maxStudents, 0)
  const activeTracks = courseTracks.filter((track) => track.status === "active").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Trilhos de Cursos</h1>
        <p className="text-muted-foreground">Gerencie as trilhas de formação da igreja</p>
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
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((totalStudents / totalCapacity) * 100)}%</div>
            <p className="text-xs text-muted-foreground">Vagas preenchidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cursos por Trilha</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(courseTracks.reduce((sum, track) => sum + track.courses.length, 0) / courseTracks.length)}
            </div>
            <p className="text-xs text-muted-foreground">Média de cursos</p>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="name">Nome da Trilha</Label>
                    <Input
                      id="name"
                      value={newTrack.name}
                      onChange={(e) => setNewTrack({ ...newTrack, name: e.target.value })}
                      placeholder="Nome da trilha"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={newTrack.description}
                      onChange={(e) => setNewTrack({ ...newTrack, description: e.target.value })}
                      placeholder="Descrição da trilha"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <select
                      id="category"
                      value={newTrack.category}
                      onChange={(e) => setNewTrack({ ...newTrack, category: e.target.value as any })}
                      className="w-full p-2 border border-input rounded-md bg-background"
                    >
                      <option value="lideranca">Liderança</option>
                      <option value="ministerio">Ministério</option>
                      <option value="teologia">Teologia</option>
                      <option value="discipulado">Discipulado</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="level">Nível</Label>
                    <select
                      id="level"
                      value={newTrack.level}
                      onChange={(e) => setNewTrack({ ...newTrack, level: e.target.value as any })}
                      className="w-full p-2 border border-input rounded-md bg-background"
                    >
                      <option value="iniciante">Iniciante</option>
                      <option value="intermediario">Intermediário</option>
                      <option value="avancado">Avançado</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="duration">Duração</Label>
                    <Input
                      id="duration"
                      value={newTrack.duration}
                      onChange={(e) => setNewTrack({ ...newTrack, duration: e.target.value })}
                      placeholder="6 meses"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxStudents">Máximo de Alunos</Label>
                    <Input
                      id="maxStudents"
                      type="number"
                      value={newTrack.maxStudents}
                      onChange={(e) => setNewTrack({ ...newTrack, maxStudents: Number.parseInt(e.target.value) || 20 })}
                      placeholder="20"
                    />
                  </div>
                </div>
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
                <TableHead>Nível</TableHead>
                <TableHead>Cursos</TableHead>
                <TableHead>Alunos</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Ações</TableHead>
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
                  <TableCell>{getLevelBadge(track.level)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{track.courses.length} cursos</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {track.courses.slice(0, 2).map((course, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {course}
                          </Badge>
                        ))}
                        {track.courses.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{track.courses.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">
                        {track.enrolled}/{track.maxStudents}
                      </p>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                        <div
                          className="bg-primary h-1.5 rounded-full"
                          style={{ width: `${(track.enrolled / track.maxStudents) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{track.duration}</TableCell>
                  <TableCell>{getStatusBadge(track.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="edit-name">Nome da Trilha</Label>
              <Input
                id="edit-name"
                value={newTrack.name}
                onChange={(e) => setNewTrack({ ...newTrack, name: e.target.value })}
                placeholder="Nome da trilha"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={newTrack.description}
                onChange={(e) => setNewTrack({ ...newTrack, description: e.target.value })}
                placeholder="Descrição da trilha"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-category">Categoria</Label>
              <select
                id="edit-category"
                value={newTrack.category}
                onChange={(e) => setNewTrack({ ...newTrack, category: e.target.value as any })}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="lideranca">Liderança</option>
                <option value="ministerio">Ministério</option>
                <option value="teologia">Teologia</option>
                <option value="discipulado">Discipulado</option>
              </select>
            </div>
            <div>
              <Label htmlFor="edit-level">Nível</Label>
              <select
                id="edit-level"
                value={newTrack.level}
                onChange={(e) => setNewTrack({ ...newTrack, level: e.target.value as any })}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="iniciante">Iniciante</option>
                <option value="intermediario">Intermediário</option>
                <option value="avancado">Avançado</option>
              </select>
            </div>
            <div>
              <Label htmlFor="edit-duration">Duração</Label>
              <Input
                id="edit-duration"
                value={newTrack.duration}
                onChange={(e) => setNewTrack({ ...newTrack, duration: e.target.value })}
                placeholder="6 meses"
              />
            </div>
            <div>
              <Label htmlFor="edit-maxStudents">Máximo de Alunos</Label>
              <Input
                id="edit-maxStudents"
                type="number"
                value={newTrack.maxStudents}
                onChange={(e) => setNewTrack({ ...newTrack, maxStudents: Number.parseInt(e.target.value) || 20 })}
                placeholder="20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTrack(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateTrack}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
