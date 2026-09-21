"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { FormDrawer } from "@/components/ui/form-drawer"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, MoreHorizontal, Edit, Trash2, Milestone, ListChecks } from "lucide-react"
import {
  useJourneyTracks,
  useCreateJourneyTrack,
  useUpdateJourneyTrack,
  useDeleteJourneyTrack,
} from "@/lib/hooks/use-journey-tracks"
import type { CreateJourneyTrackRequest, JourneyTrack, UpdateJourneyTrackRequest } from "@/lib/api/types/journey-tracks"

const EMPTY_FORM = {
  key: "",
  title: "",
  description: "",
  eligibility_text: "",
}

export function JourneyTracksManagement() {
  const { data: tracks = [], isLoading, error } = useJourneyTracks()
  const createMutation = useCreateJourneyTrack()
  const updateMutation = useUpdateJourneyTrack()
  const deleteMutation = useDeleteJourneyTrack()

  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false)
  const [editingTrack, setEditingTrack] = useState<JourneyTrack | null>(null)
  const [deletingTrackId, setDeletingTrackId] = useState<number | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)

  const resetForm = () => setFormData(EMPTY_FORM)

  const handleCreate = async () => {
    const data: CreateJourneyTrackRequest = {
      key: formData.key,
      title: formData.title,
      description: formData.description || null,
      eligibility_text: formData.eligibility_text || null,
    }
    try {
      await createMutation.mutateAsync(data)
      resetForm()
      setIsAddDrawerOpen(false)
    } catch (err) {
      console.error("Failed to create journey track:", err)
    }
  }

  const handleEdit = (track: JourneyTrack) => {
    setEditingTrack(track)
    setFormData({
      key: track.key,
      title: track.title,
      description: track.description ?? "",
      eligibility_text: track.eligibility_text ?? "",
    })
  }

  const handleUpdate = async () => {
    if (!editingTrack) return
    const data: UpdateJourneyTrackRequest = {
      title: formData.title,
      description: formData.description || null,
      eligibility_text: formData.eligibility_text || null,
    }
    try {
      await updateMutation.mutateAsync({ id: editingTrack.id, data })
      setEditingTrack(null)
      resetForm()
    } catch (err) {
      console.error("Failed to update journey track:", err)
    }
  }

  const handleToggleActive = async (track: JourneyTrack, isActive: boolean) => {
    try {
      await updateMutation.mutateAsync({ id: track.id, data: { is_active: isActive } })
    } catch (err) {
      console.error("Failed to toggle journey track:", err)
    }
  }

  const handleDelete = async (trackId: number) => {
    try {
      await deleteMutation.mutateAsync(trackId)
      setDeletingTrackId(null)
    } catch (err) {
      console.error("Failed to delete journey track:", err)
    }
  }

  const TrackFormFields = ({ isCreate }: { isCreate: boolean }) => (
    <div className="grid gap-4">
      {isCreate && (
        <div className="space-y-1.5">
          <Label htmlFor="track-key">Chave (key)</Label>
          <Input
            id="track-key"
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value })}
            placeholder="ex: discipler_track"
          />
          <p className="text-xs text-muted-foreground">
            Apenas letras minúsculas, números e underscore. Não pode ser alterada depois.
          </p>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="track-title">Título</Label>
        <Input
          id="track-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Título do trilho"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="track-description">Descrição</Label>
        <Textarea
          id="track-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição do trilho"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="track-eligibility">Critério de elegibilidade</Label>
        <Textarea
          id="track-eligibility"
          value={formData.eligibility_text}
          onChange={(e) => setFormData({ ...formData, eligibility_text: e.target.value })}
          placeholder="Quem pode iniciar este trilho"
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Trilhos do Membro</h1>
          <p className="text-muted-foreground">Configure os trilhos de jornada e suas etapas</p>
        </div>
        <Button onClick={() => setIsAddDrawerOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Criar Trilho
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="text-destructive text-center py-8">Erro ao carregar trilhos. Tente novamente mais tarde.</p>
      ) : tracks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Nenhum trilho cadastrado.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tracks.map((track) => (
            <Card key={track.id} className="border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{track.title}</CardTitle>
                      {!track.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    {track.description && <CardDescription className="mt-1">{track.description}</CardDescription>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={track.is_active}
                      onCheckedChange={(checked) => handleToggleActive(track, checked)}
                      disabled={updateMutation.isPending}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTimeout(() => handleEdit(track), 0)}>
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
              <CardContent className="flex items-center justify-between pt-0">
                <Badge variant="outline" className="gap-1.5">
                  <ListChecks className="h-3.5 w-3.5" />
                  {track.steps.length} etapa(s)
                </Badge>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/journey-tracks/${track.id}`}>
                    <Milestone className="mr-1.5 h-3.5 w-3.5" />
                    Gerenciar etapas
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FormDrawer
        open={isAddDrawerOpen}
        onOpenChange={(open) => {
          setIsAddDrawerOpen(open)
          if (!open) resetForm()
        }}
        title="Criar Trilho"
        description="Preencha os dados do trilho"
        isLoading={createMutation.isPending}
        onSubmit={handleCreate}
        submitLabel="Criar Trilho"
      >
        <TrackFormFields isCreate />
      </FormDrawer>

      <FormDrawer
        open={!!editingTrack}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTrack(null)
            resetForm()
          }
        }}
        title="Editar Trilho"
        description="Atualize os dados do trilho"
        isLoading={updateMutation.isPending}
        onSubmit={handleUpdate}
        submitLabel="Salvar"
      >
        <TrackFormFields isCreate={false} />
      </FormDrawer>

      <ConfirmDeleteDialog
        open={deletingTrackId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingTrackId(null)
        }}
        entityName="este trilho"
        onConfirm={() => {
          if (deletingTrackId !== null) handleDelete(deletingTrackId)
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
