/** Domain types as returned by the backend (see documentation/openapi.yaml). */
export interface Account {
  number: number
  name: string
}

export interface Booking {
  number: number
  date: string // ISO yyyy-mm-dd
  text: string
  debit: number
  credit: number
  amount: number
}

export type AccountClass = 'asset' | 'liability' | 'revenue' | 'expense' | 'other'

/** Swiss KMU chart of accounts: the first digit decides the class. */
export function classOf(number: number): AccountClass {
  switch (String(number)[0]) {
    case '1':
      return 'asset'
    case '2':
      return 'liability'
    case '3':
      return 'revenue'
    case '4':
      return 'expense'
    default:
      return 'other'
  }
}

export const CLASS_LABEL: Record<AccountClass, string> = {
  asset: 'Aktiven',
  liability: 'Passiven',
  revenue: 'Ertrag',
  expense: 'Aufwand',
  other: 'Übrige',
}

/** One account with its balance in cents (positive = normal side of its class). */
export interface Line {
  account: Account
  cents: number
}

export interface TwoSided {
  left: Line[]
  right: Line[]
  leftTotal: number
  rightTotal: number
}

const toCents = (amount: number) => Math.round(amount * 100)

/** Debit minus credit per account in cents, for bookings on or before `until`. */
function debitMinusCredit(bookings: Booking[], until: string): Map<number, number> {
  const result = new Map<number, number>()
  for (const b of bookings) {
    if (b.date > until) continue
    const cents = toCents(b.amount)
    result.set(b.debit, (result.get(b.debit) ?? 0) + cents)
    result.set(b.credit, (result.get(b.credit) ?? 0) - cents)
  }
  return result
}

function linesFor(accounts: Account[], cls: AccountClass, saldo: Map<number, number>, sign: 1 | -1): Line[] {
  return accounts
    .filter((a) => classOf(a.number) === cls)
    .sort((a, b) => a.number - b.number)
    .map((account) => ({ account, cents: sign * (saldo.get(account.number) ?? 0) }))
}

const sum = (lines: Line[]) => lines.reduce((total, l) => total + l.cents, 0)

export interface Statement extends TwoSided {
  /** Revenue minus expense in cents; positive = Gewinn, negative = Verlust. */
  profit: number
}

/** Erfolgsrechnung: Aufwand (debit side) against Ertrag (credit side) up to and including `until`. */
export function statement(accounts: Account[], bookings: Booking[], until: string): Statement {
  const saldo = debitMinusCredit(bookings, until)
  const left = linesFor(accounts, 'expense', saldo, 1)
  const right = linesFor(accounts, 'revenue', saldo, -1)
  const leftTotal = sum(left)
  const rightTotal = sum(right)
  return { left, right, leftTotal, rightTotal, profit: rightTotal - leftTotal }
}

export interface BalanceSheet extends TwoSided {
  profit: number
  /** Aktiven minus Passiven (incl. profit) in cents; 0 when the balance sheet balances. */
  difference: number
}

/**
 * Bilanz at `date`: Aktiven against Passiven. The profit of the income statement up to the same date is
 * carried to the Passiven, so a complete double-entry journal always balances.
 */
export function balanceSheet(accounts: Account[], bookings: Booking[], date: string): BalanceSheet {
  const saldo = debitMinusCredit(bookings, date)
  const left = linesFor(accounts, 'asset', saldo, 1)
  const right = linesFor(accounts, 'liability', saldo, -1)
  const { profit } = statement(accounts, bookings, date)
  const leftTotal = sum(left)
  const rightTotal = sum(right) + profit
  return { left, right, leftTotal, rightTotal, profit, difference: leftTotal - rightTotal }
}

const chf = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 123456 → "1’234.56" */
export function formatCents(cents: number): string {
  return chf.format((cents || 0) / 100) // `|| 0` turns -0 (e.g. -1 × 0) into 0, which would print as "-0.00"
}

export function todayIso(): string {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}
