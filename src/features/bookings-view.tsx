import { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { CellError, CellInput, CellText, EmptyRow, ROW_CLASS, RowActions, Td, Th, ViewHeader } from '@/components/edit-table'
import { playEasterEgg } from '@/components/easter-egg'
import { SaveBar } from '@/components/save-bar'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDraftRows } from '@/hooks/use-draft-rows'
import { CLASS_LABEL, classOf, todayIso, type Account, type AccountClass, type Booking } from '@/lib/accounting'
import type { ApiClient } from '@/lib/api'
import { bookingToDraft, bookingUpdates, parseAmount, validateBookings } from '@/lib/drafts'
import { actForSavedAmounts } from '@/lib/easter-eggs'
import { cn } from '@/lib/utils'

const keyOf = (b: Booking) => `booking-${b.number}`

interface Props {
  accounts: Account[]
  bookings: Booking[]
  client: ApiClient
  active: boolean
  onSaved: () => Promise<void>
  onDirtyChange: (dirty: number) => void
  onOpenAccounts: () => void
}

export function BookingsView({ accounts, bookings, client, active, onSaved, onDirtyChange, onOpenAccounts }: Props) {
  const table = useDraftRows(bookings, bookingToDraft, keyOf)
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const errors = validateBookings(table.rows)

  useEffect(() => onDirtyChange(table.dirty), [table.dirty, onDirtyChange])

  async function save() {
    if (errors.size) {
      setShowErrors(true)
      toast.error('Bitte die markierten Felder korrigieren.')
      return
    }
    setSaving(true)
    try {
      const updates = bookingUpdates(table.rows)
      await client.saveBookings(updates)
      await onSaved()
      setShowErrors(false)
      toast.success('Buchungsjournal gespeichert.')
      const act = actForSavedAmounts(updates.map((u) => u.amount))
      if (act) playEasterEgg(act, 'rise')
    } catch (err) {
      toast.error('Nicht gespeichert', { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setSaving(false)
    }
  }

  // A new entry starts on the date of the entry above it: receipts are usually entered in batches.
  const add = () => {
    const date = table.rows.at(-1)?.draft.date || todayIso()
    let key = ''
    // flushSync renders the new row right away so it can take the focus.
    flushSync(() => (key = table.add({ number: '', date, text: '', debit: '', credit: '', amount: '' })))
    const input = document.getElementById(`${key}-text`)
    input?.focus()
    input?.scrollIntoView({ block: 'nearest' })
  }

  const noAccounts = accounts.length === 0

  return (
    <section>
      <ViewHeader
        title="Buchungsjournal"
        description="Soll an Haben: Der Betrag geht auf das Sollkonto und kommt vom Habenkonto. Neue Buchungen ohne Nummer erhalten die nächste freie."
      >
        <Button variant="outline" onClick={add} disabled={noAccounts} className="bg-card">
          <PlusIcon data-icon="inline-start" />
          Buchung hinzufügen
        </Button>
      </ViewHeader>

      <div className="surface overflow-x-auto rounded-xl bg-card">
        <table className="w-full min-w-[1040px] table-fixed text-sm">
          <thead className="border-b">
            <tr>
              <Th className="w-20">Nr.</Th>
              <Th className="w-40">Datum</Th>
              <Th>Text</Th>
              <Th className="w-52">Soll</Th>
              <Th className="w-52">Haben</Th>
              <Th className="w-32 text-right">Betrag CHF</Th>
              <Th className="w-36">
                <span className="sr-only">Status und Aktionen</span>
              </Th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {table.rows.length === 0 && (
              <EmptyRow colSpan={7}>
                {noAccounts ? (
                  <>
                    <p className="font-medium text-foreground">Zuerst braucht es Konten</p>
                    <p>Jede Buchung bewegt einen Betrag zwischen zwei Konten. Lege sie im Kontenplan an.</p>
                    <Button variant="outline" onClick={onOpenAccounts} className="mt-1">
                      Zum Kontenplan
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-foreground">Noch keine Buchungen</p>
                    <p>Erfasse den ersten Beleg, zum Beispiel «Mitgliederbeitrag bar»: Soll 1000 Kasse an Haben 3000 Mitgliederbeiträge.</p>
                    <Button variant="outline" onClick={add} className="mt-1">
                      <PlusIcon data-icon="inline-start" />
                      Erste Buchung erfassen
                    </Button>
                  </>
                )}
              </EmptyRow>
            )}
            {table.rows.map((row) => {
              const status = table.statuses.get(row.key)!
              const e = showErrors ? errors.get(row.key) : undefined
              const deleted = status === 'deleted'
              const label = row.saved ? `Buchung ${row.saved.number}` : 'Neue Buchung'
              return (
                <tr key={row.key} className={cn('transition-colors duration-150', ROW_CLASS[status])}>
                  <Td>
                    {row.saved ? (
                      <CellText className="tabular-nums text-muted-foreground">{row.saved.number}</CellText>
                    ) : (
                      <CellInput
                        aria-label="Buchungsnummer (leer = automatisch)"
                        inputMode="numeric"
                        placeholder="auto"
                        value={row.draft.number}
                        onChange={(ev) => table.update(row.key, { number: ev.target.value })}
                        error={e?.number}
                        className="tabular-nums"
                      />
                    )}
                  </Td>
                  <Td>
                    <CellInput
                      type="date"
                      aria-label={`Datum ${label}`}
                      value={row.draft.date}
                      disabled={deleted}
                      onChange={(ev) => table.update(row.key, { date: ev.target.value })}
                      error={e?.date}
                      className="tabular-nums"
                    />
                  </Td>
                  <Td>
                    <CellInput
                      id={`${row.key}-text`}
                      aria-label={`Text ${label}`}
                      placeholder="Buchungstext"
                      value={row.draft.text}
                      disabled={deleted}
                      onChange={(ev) => table.update(row.key, { text: ev.target.value })}
                      error={e?.text}
                    />
                  </Td>
                  <Td>
                    <AccountSelect
                      accounts={accounts}
                      label={`Sollkonto ${label}`}
                      value={row.draft.debit}
                      disabled={deleted}
                      error={e?.debit}
                      onChange={(debit) => table.update(row.key, { debit })}
                    />
                  </Td>
                  <Td>
                    <AccountSelect
                      accounts={accounts}
                      label={`Habenkonto ${label}`}
                      value={row.draft.credit}
                      disabled={deleted}
                      error={e?.credit}
                      onChange={(credit) => table.update(row.key, { credit })}
                    />
                  </Td>
                  <Td>
                    <CellInput
                      aria-label={`Betrag in CHF ${label}`}
                      inputMode="decimal"
                      placeholder="0.00"
                      value={row.draft.amount}
                      disabled={deleted}
                      onChange={(ev) => table.update(row.key, { amount: ev.target.value })}
                      onBlur={(ev) => {
                        const amount = parseAmount(ev.target.value)
                        if (amount !== null) table.update(row.key, { amount: amount.toFixed(2) })
                      }}
                      error={e?.amount}
                      className="text-right font-medium tabular-nums"
                    />
                  </Td>
                  <Td className="pr-3">
                    <RowActions status={status} label={label} onToggleDelete={() => table.toggleDelete(row.key)} />
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <SaveBar
        counts={table.counts}
        invalidRows={showErrors ? errors.size : 0}
        saving={saving}
        active={active}
        onSave={save}
        onDiscard={() => {
          table.discard()
          setShowErrors(false)
        }}
      />
    </section>
  )
}

const CLASS_ORDER: AccountClass[] = ['asset', 'liability', 'revenue', 'expense', 'other']

function AccountSelect({
  accounts,
  label,
  value,
  disabled,
  error,
  onChange,
}: {
  accounts: Account[]
  label: string
  value: string
  disabled?: boolean
  error?: string
  onChange: (value: string) => void
}) {
  const items = useMemo(() => accounts.map((a) => ({ value: String(a.number), label: `${a.number} ${a.name}` })), [accounts])
  const groups = useMemo(
    () =>
      CLASS_ORDER.map((cls) => ({ cls, accounts: accounts.filter((a) => classOf(a.number) === cls) })).filter(
        (g) => g.accounts.length,
      ),
    [accounts],
  )

  return (
    <div>
      <Select items={items} value={value || null} onValueChange={(v) => onChange(v ? String(v) : '')} disabled={disabled}>
        <SelectTrigger
          aria-label={label}
          aria-invalid={error ? true : undefined}
          className="h-8 w-full rounded-md border-transparent bg-transparent px-1.5 tabular-nums shadow-none hover:border-input focus-visible:bg-card aria-invalid:bg-card"
        >
          <SelectValue placeholder="Konto wählen" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} className="min-w-64">
          {groups.map((g) => (
            <SelectGroup key={g.cls}>
              <SelectLabel>{CLASS_LABEL[g.cls]}</SelectLabel>
              {g.accounts.map((a) => (
                <SelectItem key={a.number} value={String(a.number)}>
                  <span className="w-10 tabular-nums text-muted-foreground">{a.number}</span>
                  {a.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <CellError message={error} />
    </div>
  )
}
