import { describe, expect, it } from 'vitest'
import { balanceSheet, formatCents, statement, type Account, type Booking } from './accounting'
import { accountUpdates, bookingUpdates, parseAmount, validateBookings, type BookingRow } from './drafts'

const accounts: Account[] = [
  { number: 1000, name: 'Kasse' },
  { number: 1020, name: 'Bank' },
  { number: 2800, name: 'Eigenkapital' },
  { number: 3000, name: 'Mitgliederbeiträge' },
  { number: 4000, name: 'Material' },
]

const booking = (number: number, date: string, debit: number, credit: number, amount: number): Booking => ({
  number,
  date,
  text: `Buchung ${number}`,
  debit,
  credit,
  amount,
})

const bookings: Booking[] = [
  booking(1, '2026-01-01', 1020, 2800, 1000),
  booking(2, '2026-02-01', 1000, 3000, 450.1),
  booking(3, '2026-03-01', 4000, 1000, 120.05),
  booking(4, '2026-12-31', 4000, 1020, 0.1),
]

describe('statement', () => {
  it('sums expenses and revenue up to the date and computes the profit', () => {
    const s = statement(accounts, bookings, '2026-06-30')
    expect(s.left).toEqual([{ account: accounts[4], cents: 12005 }])
    expect(s.right).toEqual([{ account: accounts[3], cents: 45010 }])
    expect(s.profit).toBe(33005)
  })
})

describe('balanceSheet', () => {
  it('balances once the profit is carried to the liabilities', () => {
    const b = balanceSheet(accounts, bookings, '2026-12-31')
    expect(b.leftTotal).toBe(100000 + 45010 - 12005 - 10)
    expect(b.rightTotal).toBe(b.leftTotal)
    expect(b.difference).toBe(0)
  })

  it('reports a difference when a booking touches an account outside classes 1-4', () => {
    const b = balanceSheet([...accounts, { number: 9000, name: 'Abschluss' }], [booking(5, '2026-01-01', 1000, 9000, 5)], '2026-12-31')
    expect(b.difference).toBe(500)
  })
})

describe('parseAmount', () => {
  it('accepts Swiss formatting', () => {
    expect(parseAmount("1'234.50")).toBe(1234.5)
    expect(parseAmount('12,5')).toBe(12.5)
    expect(parseAmount('1.234')).toBeNull()
    expect(parseAmount('-3')).toBeNull()
  })
})

describe('accountUpdates', () => {
  it('creates, renames and deletes by number', () => {
    const updates = accountUpdates([
      { key: 'a', saved: accounts[0], draft: { number: '1000', name: 'Kasse' }, deleted: false },
      { key: 'b', saved: accounts[1], draft: { number: '1020', name: 'Postfinance' }, deleted: false },
      { key: 'c', saved: accounts[2], draft: { number: '2800', name: 'Eigenkapital' }, deleted: true },
      { key: 'd', saved: null, draft: { number: '1100', name: ' Debitoren ' }, deleted: false },
    ])
    expect(updates).toEqual([
      { number: 1020, name: 'Postfinance' },
      { number: 2800, name: null },
      { number: 1100, name: 'Debitoren' },
    ])
  })
})

describe('bookings', () => {
  const saved = bookings[0]
  const rows: BookingRow[] = [
    { key: '1', saved, draft: { number: '1', date: saved.date, text: 'Neu', debit: '1020', credit: '2800', amount: '1000.00' }, deleted: false },
    { key: '2', saved: bookings[1], draft: { number: '2', date: '', text: '', debit: '', credit: '', amount: '' }, deleted: true },
    { key: 'n', saved: null, draft: { number: '', date: '2026-04-01', text: 'Beitrag', debit: '1000', credit: '3000', amount: "1'000" }, deleted: false },
  ]

  it('sends updates, deletions (all fields null) and new entries with id 0', () => {
    expect(bookingUpdates(rows)).toEqual([
      { id: 1, date: '2026-01-01', text: 'Neu', debit: 1020, credit: 2800, amount: 1000 },
      { id: 2, date: null, text: null, debit: null, credit: null, amount: null },
      { id: 0, date: '2026-04-01', text: 'Beitrag', debit: 1000, credit: 3000, amount: 1000 },
    ])
  })

  it('flags incomplete new entries and taken numbers', () => {
    const errors = validateBookings([
      ...rows,
      { key: 'x', saved: null, draft: { number: '1', date: '', text: ' ', debit: '1000', credit: '1000', amount: '0' }, deleted: false },
    ])
    expect(errors.get('x')).toEqual({
      number: 'Nr. 1 ist vergeben',
      date: 'Datum fehlt',
      text: 'Buchungstext fehlt',
      credit: 'Soll und Haben sind gleich',
      amount: 'Betrag grösser 0, z.B. 120.50',
    })
    expect(errors.has('n')).toBe(false)
  })
})

describe('formatCents', () => {
  it('uses Swiss grouping', () => {
    expect(formatCents(123456)).toMatch(/^1['’]234\.56$/) // ICU versions differ in the apostrophe
    expect(formatCents(-0)).toBe('0.00')
  })
})
