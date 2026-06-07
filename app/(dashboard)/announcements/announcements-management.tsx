"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MarkdownEditor } from "@/components/markdown-editor"
import { FormDrawer } from "@/components/ui/form-drawer"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Plus, MoreHorizontal, Edit, Trash2, Megaphone, Image, Link } from "lucide-react"
import {
  useAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
} from "@/lib/hooks/use-announcements"
import { StatsCardSkeleton, TableSkeleton } from "@/components/ui/skeleton-components"
import { Skeleton } from "@/components/ui/skeleton"
import type { Announcement, CreateAnnouncementRequest, UpdateAnnouncementRequest } from "@/lib/api/types"

export function AnnouncementsManagement() {
  const { data: announcements = [], isLoading, error } = useAnnouncements()
  const createMutation = useCreateAnnouncement()
  const updateMutation = useUpdateAnnouncement()
  const deleteMutation = useDeleteAnnouncement()

  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<number | null>(null)
  const [formData, setFormData] = useState<CreateAnnouncementRequest>({
    title: "",
    subtitle: "",
    image_url: "",
    markdown_content: "",
    action_url: "",
    is_active: true,
  })

  const isFormValid = formData.title.trim() !== "" && formData.subtitle.trim() !== ""

  const filteredAnnouncements = announcements.filter(
    (announcement) =>
      announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      announcement.subtitle.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const resetForm = () => {
    setFormData({
      title: "",
      subtitle: "",
      image_url: "",
      markdown_content: "",
      action_url: "",
      is_active: true,
    })
  }

  const handleAddAnnouncement = async () => {
    try {
      await createMutation.mutateAsync(formData)
      toast.success("Aviso criado com sucesso!")
      resetForm()
      setIsAddDialogOpen(false)
    } catch {
      toast.error("Erro ao criar aviso. Tente novamente.")
    }
  }

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      subtitle: announcement.subtitle,
      image_url: announcement.image_url,
      markdown_content: announcement.markdown_content,
      action_url: announcement.action_url || "",
      is_active: announcement.is_active ?? true,
    })
  }

  const handleUpdateAnnouncement = async () => {
    if (!editingAnnouncement) return

    try {
      await updateMutation.mutateAsync({
        id: editingAnnouncement.id,
        data: formData as UpdateAnnouncementRequest,
      })
      toast.success("Aviso atualizado com sucesso!")
      setEditingAnnouncement(null)
      resetForm()
    } catch {
      toast.error("Erro ao atualizar aviso. Tente novamente.")
    }
  }

  const handleDeleteAnnouncement = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Aviso excluido com sucesso!")
    } catch {
      toast.error("Erro ao excluir aviso. Tente novamente.")
    } finally {
      setDeletingAnnouncementId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Avisos</h1>
          <p className="text-muted-foreground">Carregando avisos...</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-6 w-[140px] mb-2" />
                <Skeleton className="h-4 w-[180px]" />
              </div>
              <Skeleton className="h-10 w-[130px]" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-[250px] mb-4" />
            <TableSkeleton rows={5} columns={4} />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Avisos</h1>
          <p className="text-destructive">Erro ao carregar avisos. Tente novamente mais tarde.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gerenciar Avisos</h1>
        <p className="text-muted-foreground">Crie e gerencie os avisos da igreja</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Avisos</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{announcements.length}</div>
            <p className="text-xs text-muted-foreground">Avisos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Imagem</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {announcements.filter((a) => a.image_url).length}
            </div>
            <p className="text-xs text-muted-foreground">Avisos com imagem</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Link</CardTitle>
            <Link className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {announcements.filter((a) => a.action_url).length}
            </div>
            <p className="text-xs text-muted-foreground">Avisos com link de acao</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Avisos</CardTitle>
              <CardDescription>{filteredAnnouncements.length} aviso(s) encontrado(s)</CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Aviso
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar avisos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aviso</TableHead>
                <TableHead>Imagem</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="w-[70px]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnnouncements.map((announcement) => (
                <TableRow key={announcement.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{announcement.title}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-xs">
                        {announcement.subtitle}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {announcement.image_url ? (
                      <Badge variant="secondary">Com imagem</Badge>
                    ) : (
                      <Badge variant="outline">Sem imagem</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {announcement.action_url ? (
                      <a
                        href={announcement.action_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate max-w-xs block"
                      >
                        {announcement.action_url}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditAnnouncement(announcement)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingAnnouncementId(announcement.id)}
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

      {/* Add Announcement Drawer */}
      <FormDrawer
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title="Criar Novo Aviso"
        description="Preencha os dados do aviso"
        isLoading={createMutation.isPending}
        onSubmit={handleAddAnnouncement}
        submitLabel="Criar Aviso"
      >
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Título do aviso" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subtitle">Subtítulo</Label>
            <Input id="subtitle" value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} placeholder="Subtítulo do aviso" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="image_url">URL da Imagem</Label>
            <Input id="image_url" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://exemplo.com/imagem.jpg" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="action_url">URL de Ação (opcional)</Label>
            <Input id="action_url" value={formData.action_url} onChange={(e) => setFormData({ ...formData, action_url: e.target.value })} placeholder="https://exemplo.com/acao" />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label>Conteúdo (Markdown)</Label>
            <MarkdownEditor value={formData.markdown_content} onChange={(value) => setFormData({ ...formData, markdown_content: value })} placeholder="Conteúdo do aviso em Markdown" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Aviso ativo</Label>
            <Switch id="is_active" checked={formData.is_active ?? true} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
          </div>
        </div>
      </FormDrawer>

      {/* Edit Announcement Drawer */}
      <FormDrawer
        open={!!editingAnnouncement}
        onOpenChange={() => { setEditingAnnouncement(null); resetForm() }}
        title="Editar Aviso"
        description="Atualize os dados do aviso"
        isLoading={updateMutation.isPending}
        onSubmit={handleUpdateAnnouncement}
        submitLabel="Salvar"
      >
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Título</Label>
            <Input id="edit-title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Título do aviso" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-subtitle">Subtítulo</Label>
            <Input id="edit-subtitle" value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} placeholder="Subtítulo do aviso" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-image_url">URL da Imagem</Label>
            <Input id="edit-image_url" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://exemplo.com/imagem.jpg" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-action_url">URL de Ação (opcional)</Label>
            <Input id="edit-action_url" value={formData.action_url} onChange={(e) => setFormData({ ...formData, action_url: e.target.value })} placeholder="https://exemplo.com/acao" />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label>Conteúdo (Markdown)</Label>
            <MarkdownEditor value={formData.markdown_content} onChange={(value) => setFormData({ ...formData, markdown_content: value })} placeholder="Conteúdo do aviso em Markdown" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="edit-is_active">Aviso ativo</Label>
            <Switch id="edit-is_active" checked={formData.is_active ?? true} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
          </div>
        </div>
      </FormDrawer>

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deletingAnnouncementId !== null}
        onOpenChange={(open) => { if (!open) setDeletingAnnouncementId(null) }}
        entityName="este aviso"
        onConfirm={() => { if (deletingAnnouncementId !== null) handleDeleteAnnouncement(deletingAnnouncementId) }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
