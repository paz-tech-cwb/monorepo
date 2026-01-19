"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin } from "lucide-react"
import { fetchAddressByCEP, formatCEP } from "@/lib/utils/cep"

export interface AddressFormData {
  cep: string
  country: string
  state: string
  city: string
  street: string
  number: string
}

interface AddressFormProps {
  value: AddressFormData
  onChange: (data: AddressFormData) => void
  idPrefix?: string
  showUseChurchAddress?: boolean
  onUseChurchAddress?: () => void
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

  const handleCEPChange = (cep: string) => {
    const formatted = formatCEP(cep)
    onChange({ ...value, cep: formatted })
    setCepError(null)
  }

  const handleCEPBlur = async () => {
    const cleanCEP = value.cep.replace(/\D/g, "")

    if (cleanCEP.length !== 8) {
      return
    }

    setIsLoadingCEP(true)
    setCepError(null)

    try {
      const addressData = await fetchAddressByCEP(cleanCEP)

      if (addressData) {
        onChange({
          ...value,
          street: addressData.street,
          city: addressData.city,
          state: addressData.state,
          country: addressData.country,
        })
      }
    } catch (error) {
      setCepError(error instanceof Error ? error.message : "Erro ao buscar CEP")
    } finally {
      setIsLoadingCEP(false)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor={`${idPrefix}cep`}>CEP</Label>
        <div className="relative">
          <Input
            id={`${idPrefix}cep`}
            value={value.cep}
            onChange={(e) => handleCEPChange(e.target.value)}
            onBlur={handleCEPBlur}
            placeholder="00000-000"
            maxLength={9}
            className={cepError ? "border-destructive" : ""}
          />
          {isLoadingCEP && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {cepError && <p className="text-xs text-destructive mt-1">{cepError}</p>}
      </div>

      <div>
        <Label htmlFor={`${idPrefix}country`}>Pais</Label>
        <Input
          id={`${idPrefix}country`}
          value={value.country}
          onChange={(e) => onChange({ ...value, country: e.target.value })}
          placeholder="Brasil"
        />
      </div>

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
          placeholder="Sao Paulo"
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
        <Label htmlFor={`${idPrefix}number`}>Numero</Label>
        <Input
          id={`${idPrefix}number`}
          value={value.number}
          onChange={(e) => onChange({ ...value, number: e.target.value })}
          placeholder="123"
        />
      </div>

      {showUseChurchAddress && onUseChurchAddress && (
        <div className="col-span-2">
          <Button
            type="button"
            variant="outline"
            onClick={onUseChurchAddress}
            className="w-full"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Usar endereco da igreja
          </Button>
        </div>
      )}
    </div>
  )
}
