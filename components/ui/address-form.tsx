"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin } from "lucide-react"
import { fetchAddressByCEP, formatCEP } from "@/lib/utils/cep"

export interface AddressFormData {
  zipCode: string
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
    onChange({ ...value, zipCode: formatted })
    setCepError(null)
  }

  const handleCEPBlur = async () => {
    const cleanCEP = value.zipCode.replace(/\D/g, "")

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
          neighborhood: addressData.neighborhood || value.neighborhood,
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
        <Label htmlFor={`${idPrefix}zipCode`}>CEP</Label>
        <div className="relative">
          <Input
            id={`${idPrefix}zipCode`}
            value={value.zipCode}
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
        <Label htmlFor={`${idPrefix}number`}>Numero</Label>
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
