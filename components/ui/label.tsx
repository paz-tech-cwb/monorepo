"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "@/lib/utils"

function Label({
  className,
  required,
  children,
  htmlFor,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { required?: boolean }) {
  const [associatedControlRequired, setAssociatedControlRequired] = React.useState(false)

  React.useEffect(() => {
    if (!htmlFor || required !== undefined) return

    const control = document.getElementById(htmlFor)
    setAssociatedControlRequired(control?.hasAttribute("required") ?? false)
  }, [htmlFor, required])

  const showRequired = required ?? associatedControlRequired

  return (
    <LabelPrimitive.Root
      data-slot="label"
      htmlFor={htmlFor}
      className={cn(
        "mb-1.5 flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      {showRequired && (
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
      )}
    </LabelPrimitive.Root>
  )
}

export { Label }
