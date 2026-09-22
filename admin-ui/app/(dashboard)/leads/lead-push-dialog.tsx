"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCreateNotification } from "@/lib/hooks/use-notifications"
import type { Lead } from "@/lib/api/types"

interface LeadPushDialogProps {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeadPushDialog({ lead, open, onOpenChange }: LeadPushDialogProps) {
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const createMutation = useCreateNotification()

  const reset = () => {
    setTitle("")
    setMessage("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const handleSend = async () => {
    if (!lead) return

    try {
      await createMutation.mutateAsync({
        title,
        message,
        category: "member_journey",
        channels: ["push"],
        segment: {
          type: "filtered",
          filters: { user_ids: [lead.id] },
        },
      })
      toast.success("Notificação enviada!")
      reset()
      onOpenChange(false)
    } catch {
      toast.error("Erro ao enviar notificação. Tente novamente.")
    } finally {
      setIsConfirmOpen(false)
    }
  }

  if (!lead) return null

  const canSubmit = title.trim().length > 0 && message.trim().length > 0

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar notificação para {lead.name}</DialogTitle>
            <DialogDescription>
              Envia uma notificação push diretamente para este lead.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="lead-push-title">Título</Label>
              <Input
                id="lead-push-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da notificação"
              />
            </div>
            <div>
              <Label htmlFor="lead-push-message">Mensagem</Label>
              <Textarea
                id="lead-push-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Mensagem da notificação"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!canSubmit || createMutation.isPending}
              onClick={() => setIsConfirmOpen(true)}
            >
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar notificação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação enviará uma notificação push imediata e visível para {lead.name}. Não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={createMutation.isPending}>
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
