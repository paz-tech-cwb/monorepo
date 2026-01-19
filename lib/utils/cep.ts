export interface CEPResponse {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  ibge: string
  gia: string
  ddd: string
  siafi: string
  erro?: boolean
}

export interface AddressData {
  street: string
  city: string
  state: string
  country: string
}

export async function fetchAddressByCEP(cep: string): Promise<AddressData | null> {
  // Remove non-numeric characters
  const cleanCEP = cep.replace(/\D/g, "")

  // Validate CEP format (8 digits)
  if (cleanCEP.length !== 8) {
    throw new Error("CEP deve conter 8 dígitos")
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`)

    if (!response.ok) {
      throw new Error("Erro ao buscar CEP")
    }

    const data: CEPResponse = await response.json()

    if (data.erro) {
      throw new Error("CEP não encontrado")
    }

    return {
      street: data.logradouro,
      city: data.localidade,
      state: data.uf,
      country: "Brasil",
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Erro ao buscar CEP")
  }
}

export function formatCEP(cep: string): string {
  const cleanCEP = cep.replace(/\D/g, "")
  if (cleanCEP.length <= 5) {
    return cleanCEP
  }
  return `${cleanCEP.slice(0, 5)}-${cleanCEP.slice(5, 8)}`
}
