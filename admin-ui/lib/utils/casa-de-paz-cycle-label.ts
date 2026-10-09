import type { CasaDePazCycle } from "@/lib/api/types"

// Portuguese ordinal words for the first 20 cycles — each cycle is exactly
// one calendar month (enforced server-side via a unique `month` constraint),
// so "1st Casa de Paz", "2nd Casa de Paz", etc. map directly to chronological
// order. Beyond this hardcoded set, labels are generated arithmetically.
const ORDINALS = [
  "Primeira",
  "Segunda",
  "Terceira",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sétima",
  "Oitava",
  "Nona",
  "Décima",
  "Décima Primeira",
  "Décima Segunda",
  "Décima Terceira",
  "Décima Quarta",
  "Décima Quinta",
  "Décima Sexta",
  "Décima Sétima",
  "Décima Oitava",
  "Décima Nona",
  "Vigésima",
]

function ordinalLabel(position: number): string {
  const word = ORDINALS[position - 1]
  return word ? `${word} Casa de Paz` : `${position}ª Casa de Paz`
}

/**
 * Derives an ordinal Portuguese label ("Primeira Casa de Paz", "Segunda
 * Casa de Paz", ...) per cycle based on chronological order (`month`
 * ascending) — computed client-side rather than stored, since a stored
 * ordinal would go stale if an earlier month is later backfilled.
 *
 * Returns a map of cycle id -> label, covering every cycle passed in
 * regardless of input order.
 */
export function getCasaDePazCycleLabels(
  cycles: CasaDePazCycle[]
): Map<string, string> {
  const sorted = [...cycles].sort((a, b) =>
    a.month < b.month ? -1 : a.month > b.month ? 1 : 0
  )
  const labels = new Map<string, string>()
  sorted.forEach((cycle, index) => {
    labels.set(cycle.id, ordinalLabel(index + 1))
  })
  return labels
}
