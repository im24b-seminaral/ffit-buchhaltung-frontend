import type { Account, Booking } from './accounting'
import type { AccountUpdate, BookingUpdate } from './api'

export type RowStatus = 'clean' | 'new' | 'modified' | 'deleted'

/**
 * An editable table row: the saved version (null for a new row) and the values in the inputs.
 * Only saved rows can be marked `deleted`; a new row is removed instead.
 */
export interface DraftRow<T, D extends object> {
  key: string
  saved: T | null
  draft: D
  deleted: boolean
}

export function statusOf<T, D extends object>(row: DraftRow<T, D>, toDraft: (saved: T) => D): RowStatus {
  if (!row.saved) return 'new'
  if (row.deleted) return 'deleted'
  const saved = toDraft(row.saved)
  return (Object.keys(saved) as (keyof D)[]).some((k) => saved[k] !== row.draft[k]) ? 'modified' : 'clean'
}

export type FieldErrors<D> = Partial<Record<keyof D, string>>

/** Accepts "1'234.50", "1’234,5" or "12"; returns null for anything else. */
export function parseAmount(input: string): number | null {
  const value = input.replace(/['’\s]/g, '').replace(',', '.')
  if (!/^\d+(\.\d{0,2})?$/.test(value)) return null
  return Number(value)
}

function parsePositiveInt(input: string): number | null {
  return /^\d+$/.test(input.trim()) && Number(input) > 0 ? Number(input) : null
}

// --- Kontenplan ---------------------------------------------------------------------------------

export interface AccountDraft {
  number: string
  name: string
}

export type AccountRow = DraftRow<Account, AccountDraft>

export const accountToDraft = (a: Account): AccountDraft => ({ number: String(a.number), name: a.name })

export function validateAccounts(rows: AccountRow[]): Map<string, FieldErrors<AccountDraft>> {
  const errors = new Map<string, FieldErrors<AccountDraft>>()
  const live = rows.filter((r) => !r.deleted)
  const count = new Map<number, number>()
  for (const r of live) {
    const n = parsePositiveInt(r.draft.number)
    if (n !== null) count.set(n, (count.get(n) ?? 0) + 1)
  }
  for (const r of live) {
    if (statusOf(r, accountToDraft) === 'clean') continue
    const e: FieldErrors<AccountDraft> = {}
    const n = parsePositiveInt(r.draft.number)
    if (n === null) e.number = 'Ganze Zahl grösser 0'
    else if ((count.get(n) ?? 0) > 1) e.number = `Nummer ${n} gibt es schon`
    if (!r.draft.name.trim()) e.name = 'Name fehlt'
    if (Object.keys(e).length) errors.set(r.key, e)
  }
  return errors
}

/** Existing accounts keep their number (it is the key in the API); only new rows choose one. */
export function accountUpdates(rows: AccountRow[]): AccountUpdate[] {
  return rows.flatMap((r): AccountUpdate[] => {
    switch (statusOf(r, accountToDraft)) {
      case 'new':
        return [{ number: Number(r.draft.number), name: r.draft.name.trim() }]
      case 'modified':
        return [{ number: r.saved!.number, name: r.draft.name.trim() }]
      case 'deleted':
        return [{ number: r.saved!.number, name: null }]
      default:
        return []
    }
  })
}

// --- Buchungsjournal ----------------------------------------------------------------------------

export interface BookingDraft {
  number: string
  date: string
  text: string
  debit: string
  credit: string
  amount: string
}

export type BookingRow = DraftRow<Booking, BookingDraft>

export const bookingToDraft = (b: Booking): BookingDraft => ({
  number: String(b.number),
  date: b.date,
  text: b.text,
  debit: String(b.debit),
  credit: String(b.credit),
  amount: b.amount.toFixed(2),
})

export function validateBookings(rows: BookingRow[]): Map<string, FieldErrors<BookingDraft>> {
  const errors = new Map<string, FieldErrors<BookingDraft>>()
  const takenNumbers = new Set(rows.filter((r) => r.saved).map((r) => r.saved!.number))
  const newNumbers = new Map<number, number>()
  for (const r of rows) {
    const n = r.saved ? null : parsePositiveInt(r.draft.number)
    if (n !== null) newNumbers.set(n, (newNumbers.get(n) ?? 0) + 1)
  }
  for (const r of rows) {
    const status = statusOf(r, bookingToDraft)
    if (status === 'clean' || status === 'deleted') continue
    const d = r.draft
    const e: FieldErrors<BookingDraft> = {}
    if (!r.saved && d.number.trim()) {
      const n = parsePositiveInt(d.number)
      if (n === null) e.number = 'Ganze Zahl oder leer'
      else if (takenNumbers.has(n) || (newNumbers.get(n) ?? 0) > 1) e.number = `Nr. ${n} ist vergeben`
    }
    if (!d.date) e.date = 'Datum fehlt'
    if (!d.text.trim()) e.text = 'Buchungstext fehlt'
    if (!d.debit) e.debit = 'Sollkonto wählen'
    if (!d.credit) e.credit = 'Habenkonto wählen'
    else if (d.credit === d.debit) e.credit = 'Soll und Haben sind gleich'
    const amount = parseAmount(d.amount)
    if (amount === null || amount <= 0) e.amount = 'Betrag grösser 0, z.B. 120.50'
    if (Object.keys(e).length) errors.set(r.key, e)
  }
  return errors
}

export function bookingUpdates(rows: BookingRow[]): BookingUpdate[] {
  return rows.flatMap((r): BookingUpdate[] => {
    const status = statusOf(r, bookingToDraft)
    if (status === 'clean') return []
    const id = r.saved ? r.saved.number : (parsePositiveInt(r.draft.number) ?? 0)
    if (status === 'deleted') return [{ id, date: null, text: null, debit: null, credit: null, amount: null }]
    const d = r.draft
    return [
      {
        id,
        date: d.date,
        text: d.text.trim(),
        debit: Number(d.debit),
        credit: Number(d.credit),
        amount: parseAmount(d.amount),
      },
    ]
  })
}
