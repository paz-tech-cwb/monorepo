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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, MoreHorizontal, Edit, Trash2, Calendar, MapPin, ChevronLeft, ChevronRight, List, CalendarDays, Clock } from "lucide-react"
import {
  useAgenda,
  useCreateAgendaEvent,
  useUpdateAgendaEvent,
  useDeleteAgendaEvent,
} from "@/lib/hooks/use-agenda"
import { StatsCardSkeleton, TableSkeleton, CalendarSkeleton } from "@/components/ui/skeleton-components"
import { Skeleton } from "@/components/ui/skeleton"
import type { AgendaEvent, CreateAgendaEventRequest, UpdateAgendaEventRequest, Address } from "@/lib/api/types"
import { format } from "date-fns"
import { AddressForm, type AddressFormData } from "@/components/ui/address-form"

// Church default address
const CHURCH_ADDRESS: Address = {
  cep: "80410-000",
  country: "Brasil",
  state: "PR",
  city: "Curitiba",
  street: "Rua Example",
  number: "123",
}

export function EventsManagement() {
  const { data: events = [], isLoading, error } = useAgenda()
  const createMutation = useCreateAgendaEvent()
  const updateMutation = useUpdateAgendaEvent()
  const deleteMutation = useDeleteAgendaEvent()

  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null)
  const [formData, setFormData] = useState<CreateAgendaEventRequest>({
    title: "",
    description: "",
    initialDate: "",
    finalDate: "",
    recurrenceType: undefined,
    image: "",
    address: {
      cep: "",
      country: "Brasil",
      state: "",
      city: "",
      street: "",
      number: "",
    },
  })

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const filteredEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  )

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      initialDate: "",
      finalDate: "",
      recurrenceType: undefined,
      image: "",
      address: {
        cep: "",
        country: "Brasil",
        state: "",
        city: "",
        street: "",
        number: "",
      },
    })
  }

  const handleAddEvent = async () => {
    await createMutation.mutateAsync(formData)
    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEditEvent = (event: AgendaEvent) => {
    setEditingEvent(event)
    setFormData({
      title: event.title,
      description: event.description || "",
      initialDate: event.initialDate,
      finalDate: event.finalDate || "",
      recurrenceType: event.recurrenceType,
      image: event.image || "",
      address: event.address || {
        cep: "",
        country: "Brasil",
        state: "",
        city: "",
        street: "",
        number: "",
      },
    })
  }

  const handleUpdateEvent = async () => {
    if (!editingEvent) return

    await updateMutation.mutateAsync({
      id: editingEvent.id,
      data: formData as UpdateAgendaEventRequest,
    })
    setEditingEvent(null)
    resetForm()
  }

  const handleDeleteEvent = async (eventId: number) => {
    await deleteMutation.mutateAsync(eventId)
  }

  const handleUseChurchAddress = () => {
    setFormData({
      ...formData,
      address: { ...CHURCH_ADDRESS },
    })
  }

  const getRecurrenceBadge = (recurrenceType?: string) => {
    if (!recurrenceType) return null
    const labels = {
      weekly: "Semanal",
      monthly: "Mensal",
    }
    return <Badge variant="outline">{labels[recurrenceType as keyof typeof labels]}</Badge>
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm")
    } catch {
      return dateString
    }
  }

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatCalendarDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  const getEventsForDate = (dateString: string) => {
    return events.filter((event) => {
      const eventDate = event.initialDate.split("T")[0]
      return eventDate === dateString
    })
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const getTypeColor = (recurrenceType?: string) => {
    if (!recurrenceType) return "#d97706"
    const colors = {
      weekly: "#15803d",
      monthly: "#3b82f6",
    }
    return colors[recurrenceType as keyof typeof colors] || "#6b7280"
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-border"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatCalendarDate(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dayEvents = getEventsForDate(dateString)
      const isSelected = selectedDate === dateString

      days.push(
        <div
          key={day}
          className={`h-24 border border-border p-1 cursor-pointer hover:bg-muted/50 ${
            isSelected ? "bg-primary/10 border-primary" : ""
          }`}
          onClick={() => setSelectedDate(dateString)}
        >
          <div className="text-sm font-medium mb-1">{day}</div>
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map((event) => (
              <div
                key={event.id}
                className="text-xs p-1 rounded text-white truncate"
                style={{ backgroundColor: getTypeColor(event.recurrenceType) }}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 2 && <div className="text-xs text-muted-foreground">+{dayEvents.length - 2} mais</div>}
          </div>
        </div>,
      )
    }

    return days
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciar Eventos</h1>
            <p className="text-muted-foreground">Carregando eventos...</p>
          </div>
          <Skeleton className="h-10 w-[140px]" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[120px]" />
            <Skeleton className="h-10 w-[120px]" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-[200px]" />
                </CardHeader>
                <CardContent>
                  <CalendarSkeleton />
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-[180px] mb-2" />
                  <Skeleton className="h-4 w-[140px]" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                        <Skeleton className="h-5 w-[140px]" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-[100px]" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Tabs>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Eventos</h1>
          <p className="text-destructive">Erro ao carregar eventos. Tente novamente mais tarde.</p>
        </div>
      </div>
    )
  }

  const EventForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor={isEdit ? "edit-title" : "title"}>Titulo</Label>
          <Input
            id={isEdit ? "edit-title" : "title"}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Nome do evento"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor={isEdit ? "edit-description" : "description"}>Descricao</Label>
          <Textarea
            id={isEdit ? "edit-description" : "description"}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descricao do evento"
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor={isEdit ? "edit-initialDate" : "initialDate"}>Data Inicial</Label>
          <Input
            id={isEdit ? "edit-initialDate" : "initialDate"}
            type="datetime-local"
            value={formData.initialDate}
            onChange={(e) => setFormData({ ...formData, initialDate: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor={isEdit ? "edit-finalDate" : "finalDate"}>Data Final (opcional)</Label>
          <Input
            id={isEdit ? "edit-finalDate" : "finalDate"}
            type="datetime-local"
            value={formData.finalDate}
            onChange={(e) => setFormData({ ...formData, finalDate: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor={isEdit ? "edit-recurrenceType" : "recurrenceType"}>Recorrencia</Label>
          <select
            id={isEdit ? "edit-recurrenceType" : "recurrenceType"}
            value={formData.recurrenceType || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                recurrenceType: e.target.value as "weekly" | "monthly" | undefined || undefined,
              })
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Sem recorrencia</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
          </select>
        </div>
        <div>
          <Label htmlFor={isEdit ? "edit-image" : "image"}>URL da Imagem (opcional)</Label>
          <Input
            id={isEdit ? "edit-image" : "image"}
            value={formData.image}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            placeholder="https://exemplo.com/imagem.jpg"
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Endereco do Evento
        </h3>
        <AddressForm
          value={formData.address as AddressFormData}
          onChange={(address) => setFormData({ ...formData, address })}
          idPrefix={isEdit ? "edit-" : ""}
          showUseChurchAddress={true}
          onUseChurchAddress={handleUseChurchAddress}
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Eventos</h1>
          <p className="text-muted-foreground">Organize e gerencie os eventos da igreja</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Criar Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Evento</DialogTitle>
              <DialogDescription>Preencha os dados do evento</DialogDescription>
            </DialogHeader>
            <EventForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddEvent} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando..." : "Criar Evento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-xs text-muted-foreground">Eventos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Recorrentes</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter((e) => e.recurrenceType).length}
            </div>
            <p className="text-xs text-muted-foreground">Com recorrencia</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-0 mb-2">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0">{renderCalendar()}</div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedDate
                      ? `Eventos - ${new Date(selectedDate + "T00:00:00").toLocaleDateString("pt-BR")}`
                      : "Selecione uma data"}
                  </CardTitle>
                  <CardDescription>
                    {selectedDate
                      ? `${selectedDateEvents.length} evento(s) encontrado(s)`
                      : "Clique em uma data para ver os eventos"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedDateEvents.length > 0 ? (
                    <div className="space-y-3">
                      {selectedDateEvents.map((event) => (
                        <div key={event.id} className="border border-border rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">{event.title}</h4>
                            {getRecurrenceBadge(event.recurrenceType)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(event.initialDate), "HH:mm")}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditEvent(event)}>
                              <Edit className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteEvent(event.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selectedDate ? (
                    <p className="text-sm text-muted-foreground">Nenhum evento nesta data.</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Selecione uma data no calendario para ver os eventos.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lista de Eventos</CardTitle>
                  <CardDescription>{filteredEvents.length} evento(s) encontrado(s)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar eventos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Data Inicial</TableHead>
                    <TableHead>Data Final</TableHead>
                    <TableHead>Recorrencia</TableHead>
                    <TableHead className="w-[70px]">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {event.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(event.initialDate)}</TableCell>
                      <TableCell>
                        {event.finalDate ? formatDate(event.finalDate) : "-"}
                      </TableCell>
                      <TableCell>{getRecurrenceBadge(event.recurrenceType) || "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditEvent(event)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteEvent(event.id)}
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
        </TabsContent>
      </Tabs>

      {/* Edit Event Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>Atualize os dados do evento</DialogDescription>
          </DialogHeader>
          <EventForm isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEvent(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateEvent} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
