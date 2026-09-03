"use client"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

interface FormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  isLoading?: boolean
  onSubmit: () => void
  submitLabel?: string
  children: React.ReactNode
}

export function FormDrawer({
  open,
  onOpenChange,
  title,
  description,
  isLoading = false,
  onSubmit,
  submitLabel = "Salvar",
  children,
}: FormDrawerProps) {
  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px]">
        <DrawerHeader className="border-b p-4">
          <DrawerTitle>{title}</DrawerTitle>
          {description && (
            <DrawerDescription>{description}</DrawerDescription>
          )}
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        <DrawerFooter className="border-t p-4">
          <div className="flex justify-end gap-2">
            <DrawerClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DrawerClose>
            <Button onClick={onSubmit} disabled={isLoading}>
              {isLoading ? "Salvando..." : submitLabel}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
