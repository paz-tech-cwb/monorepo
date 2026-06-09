"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Plus, MoreHorizontal, Edit, Trash2, Calendar, MapPin, ChevronLeft, ChevronRight, List, CalendarDays, Clock } from "lucide-react"
import { ImageField } from "@/components/ui/image-field"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import {
  useAgenda,
  useCreateAgendaEvent,
  useUpdateAgendaEvent,
  useDeleteAgendaEvent,
} from "@/lib/hooks/use-agenda"
import { StatsCardSkeleton, CalendarSkeleton } from "@/components/ui/skeleton-components"
import { Skeleton } from "@/components/ui/skeleton"
import type { AgendaEvent, CreateAgendaEventRequest, UpdateAgendaEventRequest, Address } from "@/lib/api/types"
import type { RecurrenceType } from "@/lib/api/types/agenda"
import { useAgendaStats } from "@/lib/hooks/use-agenda"
import { format } from "date-fns"
import { AddressForm, type AddressFormData } from "@/components/ui/address-form"

// ── Constants ─────────────────────────────────────────────────────────────────

const CHURCH_ADDRESS: Address = {
  zip_code: "80410-000",
  country: "Brasil",
  state: "PR",
  city: "Curitiba",
  neighborhood: "Centro",
  street: "Rua Example",
  number: "123",
}

const EMPTY_FORM: CreateAgendaEventRequest = {
  title: "",
  description: "",
  initial_date: "",
  final_date: "",
  recurrence_type: undefined,
  image: "",
  address: {
    zip_code: "",
    country: "Brasil",
    state: "",
    city: "",
    neighborhood: "",
    street: "",
    number: "",
  },
}

// ── Top-level form component (must NOT be defined inside EventsManagement) ────

interface EventFormProps {
  formData: CreateAgendaEventRequest
  onChange: (data: CreateAgendaEventRequest) => void
  onUseChurchAddress: () => void
  idPrefix?: string
}

function EventForm({ formData, onChange, onUseChurchAddress, idPrefix = "" }: EventFormProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor={`${idPrefix}title`}>Titulo</Label>
          <Input
            id={`${idPrefix}title`}
            value={formData.title}
            onChange={(e) => onChange({ ...formData, title: e.target.value })}
            placeholder="Nome do evento"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor={`${idPrefix}description`}>Descricao</Label>
          <Textarea
            id={`${idPrefix}description`}
            value={formData.description}
            onChange={(e) => onChange({ ...formData, description: e.target.value })}
            placeholder="Descricao do evento"
            rows={3}
          />
        </div>

        <div className="col-span-2">
          <DateTimePicker
            label="Data Inicial"
            value={formData.initial_date}
            onChange={(iso) => onChange({ ...formData, initial_date: iso })}
          />
        </div>
        <div className="col-span-2">
          <DateTimePicker
            label="Data Final"
            value={formData.final_date || ""}
            onChange={(iso) => onChange({ ...formData, final_date: iso })}
            optional
          />
        </div>

        <div>
          <Label htmlFor={`${idPrefix}recurrence_type`}>Recorrencia</Label>
          <Select
            value={formData.recurrence_type || "none"}
            onValueChange={(v) =>
              onChange({
                ...formData,
                recurrence_type: v === "none" ? undefined : (v as RecurrenceType),
              })
            }
          >
            <SelectTrigger id={`${idPrefix}recurrence_type`}>
              <SelectValue placeholder="Sem recorrencia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem recorrencia</SelectItem>
              <SelectItem value="WEEKLY">Semanal</SelectItem>
              <SelectItem value="MONTHLY">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <ImageField
            value={formData.image ?? ""}
            onChange={(url) => onChange({ ...formData, image: url })}
            category="events"
            label="Imagem (opcional)"
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
          onChange={(address) => onChange({ ...formData, address })}
          idPrefix={idPrefix}
          showUseChurchAddress
          onUseChurchAddress={onUseChurchAddress}
        />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function EventsManagement() {
  const { data: events = [], isLoading, error } = useAgenda()
  const { data: stats } = useAgendaStats()
  const createMutation = useCreateAgendaEvent()
  const updateMutation = useUpdateAgendaEvent()
  const deleteMutation = useDeleteAgendaEvent()

  const [searchTerm, setSearchTerm] = useState("")
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null)
  const [deletingEvent, setDeletingEvent] = useState<AgendaEvent | null>(null)
  const [formData, setFormData] = useState<CreateAgendaEventRequest>(EMPTY_FORM)

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const filteredEvents = events.filter(
    (event) =>
      event != null &&
      (event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false))
  )

  const resetForm = () => setFormData(EMPTY_FORM)

  const handleUseChurchAddress = () => {
    setFormData((prev) => ({ ...prev, address: { ...CHURCH_ADDRESS } }))
  }

  const handleOpenAdd = () => {
    resetForm()
    setIsAddSheetOpen(true)
  }

  const handleAddEvent = async () => {
    if (!formData.title.trim() || !formData.initial_date) return
    await createMutation.mutateAsync(formData)
    resetForm()
    setIsAddSheetOpen(false)
  }

  const handleEditEvent = (event: AgendaEvent) => {
    setFormData({
      title: event.title,
      description: event.description || "",
      initial_date: event.initial_date,
      final_date: event.final_date || "",
      recurrence_type: event.recurrence_type,
      image: event.image || "",
      address: event.address ?? EMPTY_FORM.address,
    })
    setEditingEvent(event)
  }

  const handleUpdateEvent = async () => {
    if (!editingEvent) return
    await updateMutation.mutateAsync({ id: editingEvent.id, data: formData as UpdateAgendaEventRequest })
    setEditingEvent(null)
    resetForm()
  }

  const handleDeleteEvent = async () => {
    if (!deletingEvent) return
    await deleteMutation.mutateAsync(deletingEvent.id)
    setDeletingEvent(null)
  }

  const getRecurrenceBadge = (recurrenceType?: string | null) => {
    if (!recurrenceType) return null
    const labels: Record<string, string> = {
      WEEKLY: "Semanal", MONTHLY: "Mensal", weekly: "Semanal", monthly: "Mensal",
    }
    return <Badge variant="outline">{labels[recurrenceType] || recurrenceType}</Badge>
  }

  const formatDate = (dateString: string) => {
    try { return format(new Date(dateString), "dd/MM/yyyy HH:mm") } catch { return dateString }
  }

  // ── Calendar helpers ─────────────────────────────────────────────────────────

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  const formatCalendarDate = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

  const getEventsForDate = (dateString: string) =>
    events.filter((event) => {
      if (event == null) return false
      const eventDay = event.initial_date.split("T")[0]
      if (eventDay === dateString) return true
      if (!event.recurrence_type) return false
      const start = new Date(event.initial_date)
      const target = new Date(dateString + "T00:00:00")
      if (target <= start) return false
      const type = event.recurrence_type.toUpperCase()
      if (type === "WEEKLY") return start.getDay() === target.getDay()
      if (type === "MONTHLY") return start.getDate() === target.getDate()
      return false
    })

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      d.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1))
      return d
    })
  }

  const getTypeColor = (recurrenceType?: string | null) => {
    if (!recurrenceType) return "#d97706"
    const colors: Record<string, string> = {
      WEEKLY: "#15803d", MONTHLY: "#3b82f6", weekly: "#15803d", monthly: "#3b82f6",
    }
    return colors[recurrenceType] || "#6b7280"
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-border" />)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatCalendarDate(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dayEvents = getEventsForDate(dateString)
      const isSelected = selectedDate === dateString

      days.push(
        <div
          key={day}
          className={`h-24 border border-border p-1 cursor-pointer hover:bg-muted/50 ${isSelected ? "bg-primary/10 border-primary" : ""}`}
          onClick={() => setSelectedDate(dateString)}
        >
          <div className="text-sm font-medium mb-1">{day}</div>
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map((event) => (
              <div
                key={event.id}
                className="text-xs p-1 rounded text-white truncate"
                style={{ backgroundColor: getTypeColor(event.recurrence_type) }}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-muted-foreground">+{dayEvents.length - 2} mais</div>
            )}
          </div>
        </div>,
      )
    }
    return days
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  // ── Loading / error states ────────────────────────────────────────────────────

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
                <CardHeader><Skeleton className="h-6 w-[200px]" /></CardHeader>
                <CardContent><CalendarSkeleton /></CardContent>
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

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Eventos</h1>
          <p className="text-muted-foreground">Organize e gerencie os eventos da igreja</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Criar Evento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_events ?? events.length}</div>
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
              {stats?.recurring_events ?? events.filter((e) => e.recurrence_type).length}
            </div>
            <p className="text-xs text-muted-foreground">Com recorrencia</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
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

        {/* Calendar tab */}
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
                            {getRecurrenceBadge(event.recurrence_type)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(event.initial_date), "HH:mm")}
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
                              onClick={() => setDeletingEvent(event)}
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

        {/* List tab */}
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
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {event.title.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">{event.description}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(event.initial_date)}</TableCell>
                      <TableCell>{event.final_date ? formatDate(event.final_date) : "-"}</TableCell>
                      <TableCell>{getRecurrenceBadge(event.recurrence_type) || "-"}</TableCell>
                      <TableCell>
                        {/* modal={false} prevents DropdownMenu from blocking AlertDialog overlay */}
                        <DropdownMenu modal={false}>
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
                              onClick={() => setDeletingEvent(event)}
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

      {/* Create drawer */}
      <Drawer direction="right" open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
        <DrawerContent className="flex flex-col h-full sm:max-w-[640px]">
          <DrawerHeader className="text-left px-6">
            <DrawerTitle>Criar Novo Evento</DrawerTitle>
            <DrawerDescription>Preencha os dados do evento</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-2">
            <EventForm
              formData={formData}
              onChange={setFormData}
              onUseChurchAddress={handleUseChurchAddress}
              idPrefix="add-"
            />
          </div>
          <DrawerFooter className="flex-row justify-end gap-2 px-6">
            <Button variant="outline" onClick={() => setIsAddSheetOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddEvent} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Evento"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Edit drawer */}
      <Drawer direction="right" open={!!editingEvent} onOpenChange={(open) => { if (!open) { setEditingEvent(null); resetForm() } }}>
        <DrawerContent className="flex flex-col h-full sm:max-w-[640px]">
          <DrawerHeader className="text-left px-6">
            <DrawerTitle>Editar Evento</DrawerTitle>
            <DrawerDescription>Atualize os dados do evento</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-2">
            <EventForm
              formData={formData}
              onChange={setFormData}
              onUseChurchAddress={handleUseChurchAddress}
              idPrefix="edit-"
            />
          </div>
          <DrawerFooter className="flex-row justify-end gap-2 px-6">
            <Button variant="outline" onClick={() => { setEditingEvent(null); resetForm() }}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateEvent} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingEvent}
        onOpenChange={(open) => { if (!open) setDeletingEvent(null) }}
      >
        <AlertDialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. O evento
              {deletingEvent ? ` "${deletingEvent.title}"` : ""} sera removido permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteEvent}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
