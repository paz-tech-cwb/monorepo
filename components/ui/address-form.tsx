"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin } from "lucide-react"
import { fetchAddressByCEP, formatCEP } from "@/lib/utils/cep"

export interface AddressFormData {
  zip_code: string
  country: string
  state: string
  city: string
  neighborhood: string
  street: string
  number: string
  complement?: string | null
  reference?: string | null
}

interface AddressFormProps {
  value: AddressFormData
  onChange: (data: AddressFormData) => void
  idPrefix?: string
  showUseChurchAddress?: boolean
  onUseChurchAddress?: () => void
}

const EMPTY_ADDRESS: AddressFormData = {
  zip_code: "",
  country: "Brasil",
  state: "",
  city: "",
  neighborhood: "",
  street: "",
  number: "",
  complement: null,
}

export function AddressForm({
  value,
  onChange,
  idPrefix = "",
  showUseChurchAddress = false,
  onUseChurchAddress,
}: AddressFormProps) {
  const [isLoadingCEP, setIsLoadingCEP] = useState(false)
  const [cepError, setCepError] = useState<string | null>(null)
  // Whether full address fields are visible (true once CEP resolves or church address used)
  const [usingChurchAddress, setUsingChurchAddress] = useState(false)

  const hasFullAddress = value.street.trim().length > 0

  const handleCEPChange = (cep: string) => {
    const formatted = formatCEP(cep)
    onChange({ ...EMPTY_ADDRESS, zip_code: formatted })
    setCepError(null)
    setUsingChurchAddress(false)
  }

  const handleCEPBlur = async () => {
    const clean = value.zip_code.replace(/\D/g, "")
    if (clean.length !== 8) return

    setIsLoadingCEP(true)
    setCepError(null)
    try {
      const data = await fetchAddressByCEP(clean)
      if (data) {
        onChange({
          ...value,
          street: data.street,
          neighborhood: data.neighborhood || value.neighborhood,
          city: data.city,
          state: data.state,
          country: data.country,
        })
      }
    } catch (err) {
      setCepError(err instanceof Error ? err.message : "Erro ao buscar CEP")
    } finally {
      setIsLoadingCEP(false)
    }
  }

  const handleUseChurch = () => {
    setUsingChurchAddress(true)
    setCepError(null)
    onChange(EMPTY_ADDRESS)
    onUseChurchAddress?.()
  }

  const handleClearChurch = () => {
    setUsingChurchAddress(false)
    onChange(EMPTY_ADDRESS)
  }

  if (usingChurchAddress) {
    return (
      <div>
        <Button type="button" variant="outline" onClick={handleClearChurch} className="w-full">
          <MapPin className="mr-2 h-4 w-4" />
          Endereço da igreja selecionado — clique para alterar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* CEP row + church button */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Label htmlFor={`${idPrefix}zip_code`}>CEP</Label>
          <div className="relative">
            <Input
              id={`${idPrefix}zip_code`}
              value={value.zip_code}
              onChange={(e) => handleCEPChange(e.target.value)}
              onBlur={handleCEPBlur}
              placeholder="00000-000"
              maxLength={9}
              className={cepError ? "border-destructive" : ""}
            />
            {isLoadingCEP && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {cepError && <p className="text-xs text-destructive mt-1">{cepError}</p>}
        </div>

        {showUseChurchAddress && (
          <Button type="button" variant="outline" onClick={handleUseChurch} className="shrink-0">
            <MapPin className="mr-2 h-4 w-4" />
            Usar endereço da igreja
          </Button>
        )}
      </div>

      {/* Full address — only shown once CEP resolves */}
      {hasFullAddress && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`${idPrefix}state`}>Estado</Label>
            <Input
              id={`${idPrefix}state`}
              value={value.state}
              onChange={(e) => onChange({ ...value, state: e.target.value })}
              placeholder="SP"
              maxLength={2}
            />
          </div>

          <div>
            <Label htmlFor={`${idPrefix}city`}>Cidade</Label>
            <Input
              id={`${idPrefix}city`}
              value={value.city}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
              placeholder="São Paulo"
            />
          </div>

          <div>
            <Label htmlFor={`${idPrefix}neighborhood`}>Bairro</Label>
            <Input
              id={`${idPrefix}neighborhood`}
              value={value.neighborhood}
              onChange={(e) => onChange({ ...value, neighborhood: e.target.value })}
              placeholder="Centro"
            />
          </div>

          <div>
            <Label htmlFor={`${idPrefix}street`}>Rua</Label>
            <Input
              id={`${idPrefix}street`}
              value={value.street}
              onChange={(e) => onChange({ ...value, street: e.target.value })}
              placeholder="Rua das Flores"
            />
          </div>

          <div>
            <Label htmlFor={`${idPrefix}number`}>Número</Label>
            <Input
              id={`${idPrefix}number`}
              value={value.number}
              onChange={(e) => onChange({ ...value, number: e.target.value })}
              placeholder="123"
            />
          </div>

          <div>
            <Label htmlFor={`${idPrefix}complement`}>Complemento</Label>
            <Input
              id={`${idPrefix}complement`}
              value={value.complement || ""}
              onChange={(e) => onChange({ ...value, complement: e.target.value || null })}
              placeholder="Apto 101"
            />
          </div>
        </div>
      )}
    </div>
  )
}
