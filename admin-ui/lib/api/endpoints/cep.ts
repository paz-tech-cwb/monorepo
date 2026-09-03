export interface CepLookupResult {
  cep: string
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export async function lookupCep(cep: string): Promise<CepLookupResult | null> {
  const digits = cep.replace(/\D/g, "")
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    if (!res.ok) return null
    const data = (await res.json()) as CepLookupResult
    return data.erro ? null : data
  } catch {
    return null
  }
}
