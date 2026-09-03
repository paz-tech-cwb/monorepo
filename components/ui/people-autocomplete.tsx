"use client"

import { useMemo, useState } from "react"
import { format, isValid, parseISO } from "date-fns"
import { Loader2, Search, UserCheck, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useUserSearch } from "@/lib/hooks/use-users"
import type { UserSearchResult } from "@/lib/api/types"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

function formatBirthDate(value?: string | null) {
  if (!value) return null
  const date = parseISO(value)
  if (!isValid(date)) return null
  return format(date, "dd/MM/yyyy")
}

interface PeopleAutocompleteProps {
  /** Current text value of the underlying name field. */
  value: string
  /** Called on every keystroke, same as a controlled input. */
  onChange: (value: string) => void
  /** Called when the admin picks an existing person from the results. */
  onSelect: (person: UserSearchResult) => void
  id?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * Name input with a debounced "existing people" typeahead.
 *
 * As the admin types, it searches existing users by name (and email/phone)
 * so a match can be selected instead of accidentally creating a duplicate
 * person record. Selecting a suggestion fires `onSelect`; the parent form
 * decides which fields to prefill. Typing further, or clicking the "x",
 * dismisses the suggestion so a brand-new person can be created.
 */
export function PeopleAutocomplete({
  value,
  onChange,
  onSelect,
  id,
  placeholder = "Nome completo",
  disabled,
  className,
}: PeopleAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<UserSearchResult | null>(null)

  const { data: results = [], isFetching } = useUserSearch(value)

  const showDropdown = isOpen && !selectedPerson && value.trim().length >= 2

  const items = useMemo(() => results.slice(0, 10), [results])

  const handleChange = (next: string) => {
    onChange(next)
    if (selectedPerson) setSelectedPerson(null)
    setIsOpen(true)
  }

  const handleSelect = (person: UserSearchResult) => {
    setSelectedPerson(person)
    setIsOpen(false)
    onChange(person.name)
    onSelect(person)
  }

  const handleClearSelection = () => {
    setSelectedPerson(null)
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Popover open={showDropdown} onOpenChange={setIsOpen}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={id}
              value={value}
              disabled={disabled}
              placeholder={placeholder}
              autoComplete="off"
              className={cn("pl-9", selectedPerson && "pr-9")}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => setIsOpen(true)}
              onBlur={() => {
                // Allow click on a CommandItem to register before closing.
                setTimeout(() => setIsOpen(false), 150)
              }}
            />
            {isFetching && !selectedPerson && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
            {selectedPerson && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground"
                aria-label="Ignorar sugestao e cadastrar nova pessoa"
                title="Ignorar sugestao e cadastrar nova pessoa"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList>
              {items.length === 0 ? (
                <CommandEmpty>
                  {isFetching ? "Buscando..." : "Nenhuma pessoa encontrada. Sera cadastrada uma nova."}
                </CommandEmpty>
              ) : (
                <CommandGroup heading="Pessoas ja cadastradas">
                  {items.map((person) => {
                    const birthDate = formatBirthDate(person.birth_date)
                    return (
                      <CommandItem
                        key={person.id}
                        value={String(person.id)}
                        onSelect={() => handleSelect(person)}
                        className="flex flex-col items-start gap-0.5"
                      >
                        <span className="font-medium">
                          {person.name}
                          {birthDate ? ` — ${birthDate}` : ""}
                        </span>
                        {(person.email || person.phone) && (
                          <span className="text-xs text-muted-foreground">
                            {[person.email, person.phone].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedPerson && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserCheck className="h-3.5 w-3.5 text-primary" />
          Dados preenchidos a partir do cadastro de {selectedPerson.name}. Clique no{" "}
          <X className="inline h-3 w-3" /> para cadastrar uma pessoa nova em vez disso.
        </p>
      )}
    </div>
  )
}
