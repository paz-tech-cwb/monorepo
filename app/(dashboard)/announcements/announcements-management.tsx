"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MarkdownEditor } from "@/components/markdown-editor"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
    imageUrl: "",
    markdownContent: "",
    actionUrl: "",
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
      imageUrl: "",
      markdownContent: "",
      actionUrl: "",
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
      imageUrl: announcement.imageUrl,
      markdownContent: announcement.markdownContent,
      actionUrl: announcement.actionUrl || "",
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
              {announcements.filter((a) => a.imageUrl).length}
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
              {announcements.filter((a) => a.actionUrl).length}
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
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Aviso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Criar Novo Aviso</DialogTitle>
                  <DialogDescription>Preencha os dados do aviso</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto">
                  <div className="grid md:grid-cols-[1fr_2fr] gap-6 h-full">
                    {/* Metadata fields */}
                    <div className="grid gap-4 content-start">
                      <div>
                        <Label htmlFor="title">Titulo</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Titulo do aviso"
                        />
                      </div>
                      <div>
                        <Label htmlFor="subtitle">Subtitulo</Label>
                        <Input
                          id="subtitle"
                          value={formData.subtitle}
                          onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                          placeholder="Subtitulo do aviso"
                        />
                      </div>
                      <div>
                        <Label htmlFor="imageUrl">URL da Imagem</Label>
                        <Input
                          id="imageUrl"
                          value={formData.imageUrl}
                          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                          placeholder="https://exemplo.com/imagem.jpg"
                        />
                      </div>
                      <div>
                        <Label htmlFor="actionUrl">URL de Acao (opcional)</Label>
                        <Input
                          id="actionUrl"
                          value={formData.actionUrl}
                          onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                          placeholder="https://exemplo.com/acao"
                        />
                      </div>
                    </div>

                    {/* Markdown editor */}
                    <div className="flex flex-col min-h-[350px]">
                      <Label className="mb-2">Conteudo (Markdown)</Label>
                      <MarkdownEditor
                        value={formData.markdownContent}
                        onChange={(value) => setFormData({ ...formData, markdownContent: value })}
                        placeholder="Conteudo do aviso em Markdown"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddAnnouncement} disabled={!isFormValid || createMutation.isPending}>
                    {createMutation.isPending ? "Criando..." : "Criar Aviso"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                    {announcement.imageUrl ? (
                      <span className="text-green-600">Sim</span>
                    ) : (
                      <span className="text-muted-foreground">Nao</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {announcement.actionUrl ? (
                      <a
                        href={announcement.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate max-w-xs block"
                      >
                        {announcement.actionUrl}
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

      {/* Edit Announcement Dialog */}
      <Dialog open={!!editingAnnouncement} onOpenChange={() => setEditingAnnouncement(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Aviso</DialogTitle>
            <DialogDescription>Atualize os dados do aviso</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="grid md:grid-cols-[1fr_2fr] gap-6 h-full">
              {/* Metadata fields */}
              <div className="grid gap-4 content-start">
                <div>
                  <Label htmlFor="edit-title">Titulo</Label>
                  <Input
                    id="edit-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Titulo do aviso"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-subtitle">Subtitulo</Label>
                  <Input
                    id="edit-subtitle"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="Subtitulo do aviso"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-imageUrl">URL da Imagem</Label>
                  <Input
                    id="edit-imageUrl"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-actionUrl">URL de Acao (opcional)</Label>
                  <Input
                    id="edit-actionUrl"
                    value={formData.actionUrl}
                    onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                    placeholder="https://exemplo.com/acao"
                  />
                </div>
              </div>

              {/* Markdown editor */}
              <div className="flex flex-col min-h-[350px]">
                <Label className="mb-2">Conteudo (Markdown)</Label>
                <MarkdownEditor
                  value={formData.markdownContent}
                  onChange={(value) => setFormData({ ...formData, markdownContent: value })}
                  placeholder="Conteudo do aviso em Markdown"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAnnouncement(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateAnnouncement} disabled={!isFormValid || updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletingAnnouncementId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingAnnouncementId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este aviso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. O aviso sera removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingAnnouncementId !== null) {
                  handleDeleteAnnouncement(deletingAnnouncementId)
                }
              }}
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
