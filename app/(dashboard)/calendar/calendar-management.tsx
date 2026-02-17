"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react"
import { useAgenda, useCreateAgendaEvent } from "@/lib/hooks/use-agenda"
import type { AgendaEvent, RecurrenceType } from "@/lib/api/types"

export function CalendarManagement() {
  const { data: events = [], isLoading } = useAgenda()
  const createMutation = useCreateAgendaEvent()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    initial_date: "",
    initial_time: "",
    final_date: "",
    recurrence_type: "" as RecurrenceType | "",
  })

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  const getEventsForDate = (dateString: string) => {
    return events.filter((event) => {
      const eventDate = event.initial_date.split("T")[0]
      return eventDate === dateString
    })
  }

  const handleAddEvent = async () => {
    try {
      const initial_date = newEvent.initial_time
        ? `${newEvent.initial_date}T${newEvent.initial_time}:00Z`
        : `${newEvent.initial_date}T00:00:00Z`

      await createMutation.mutateAsync({
        title: newEvent.title,
        description: newEvent.description || undefined,
        initial_date,
        final_date: newEvent.final_date ? `${newEvent.final_date}T23:59:59Z` : undefined,
        recurrence_type: (newEvent.recurrence_type as RecurrenceType) || null,
      })
      toast.success("Evento criado com sucesso!")
      setNewEvent({ title: "", description: "", initial_date: "", initial_time: "", final_date: "", recurrence_type: "" })
      setIsAddDialogOpen(false)
    } catch {
      toast.error("Erro ao criar evento. Tente novamente.")
    }
  }

  const getRecurrenceBadge = (type?: RecurrenceType | null) => {
    if (!type) return null
    const labels: Record<RecurrenceType, string> = { WEEKLY: "Semanal", MONTHLY: "Mensal" }
    return <Badge variant="outline" className="text-xs">{labels[type]}</Badge>
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

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-border" />)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day)
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
                className="text-xs p-1 rounded text-white truncate bg-primary"
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Calendario</h1>
          <p className="text-muted-foreground">Visualize e gerencie os eventos da igreja</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Evento</DialogTitle>
              <DialogDescription>Adicione um evento ao calendario</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Titulo</Label>
                <Input
                  id="title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Nome do evento"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Descricao</Label>
                <Textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Descricao do evento"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="initial_date">Data de Inicio</Label>
                <Input
                  id="initial_date"
                  type="date"
                  value={newEvent.initial_date}
                  onChange={(e) => setNewEvent({ ...newEvent, initial_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="initial_time">Horario</Label>
                <Input
                  id="initial_time"
                  type="time"
                  value={newEvent.initial_time}
                  onChange={(e) => setNewEvent({ ...newEvent, initial_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="final_date">Data de Termino</Label>
                <Input
                  id="final_date"
                  type="date"
                  value={newEvent.final_date}
                  onChange={(e) => setNewEvent({ ...newEvent, final_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="recurrence_type">Recorrencia</Label>
                <select
                  id="recurrence_type"
                  value={newEvent.recurrence_type}
                  onChange={(e) => setNewEvent({ ...newEvent, recurrence_type: e.target.value as RecurrenceType | "" })}
                  className="w-full p-2 border border-input rounded-md bg-background"
                >
                  <option value="">Sem recorrencia</option>
                  <option value="WEEKLY">Semanal</option>
                  <option value="MONTHLY">Mensal</option>
                </select>
              </div>
            </div>
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
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-0 mb-2">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0">{renderCalendar()}</div>
                </>
              )}
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
                      {event.description && (
                        <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(event.initial_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        {event.address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.address.city}
                          </div>
                        )}
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
    </div>
  )
}
