import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { CellInput, CellText, EmptyRow, ROW_CLASS, RowActions, Td, Th, ViewHeader } from '@/components/edit-table'
import { SaveBar } from '@/components/save-bar'
import { Button } from '@/components/ui/button'
import { useDraftRows } from '@/hooks/use-draft-rows'
import { CLASS_LABEL, classOf, type Account } from '@/lib/accounting'
import type { ApiClient } from '@/lib/api'
import { accountToDraft, accountUpdates, validateAccounts } from '@/lib/drafts'
import { cn } from '@/lib/utils'

const keyOf = (a: Account) => `account-${a.number}`

interface Props {
  accounts: Account[]
  client: ApiClient
  active: boolean
  onSaved: () => Promise<void>
  onDirtyChange: (dirty: number) => void
}

export function AccountsView({ accounts, client, active, onSaved, onDirtyChange }: Props) {
  const table = useDraftRows(accounts, accountToDraft, keyOf)
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const errors = validateAccounts(table.rows)

  useEffect(() => onDirtyChange(table.dirty), [table.dirty, onDirtyChange])

  async function save() {
    if (errors.size) {
      setShowErrors(true)
      toast.error('Bitte die markierten Felder korrigieren.')
      return
    }
    setSaving(true)
    try {
      await client.saveAccounts(accountUpdates(table.rows))
      await onSaved()
      setShowErrors(false)
      toast.success('Kontenplan gespeichert.')
    } catch (err) {
      toast.error('Nicht gespeichert', { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setSaving(false)
    }
  }

  // flushSync renders the new row right away so it can take the focus.
  const add = () => {
    let key = ''
    flushSync(() => (key = table.add({ number: '', name: '' })))
    document.getElementById(`${key}-number`)?.focus()
  }

  return (
    <section>
      <ViewHeader
        title="Kontenplan"
        description="Die erste Ziffer bestimmt die Kategorie: 1 Aktiven, 2 Passiven, 3 Ertrag, 4 Aufwand. Gespeicherte Nummern sind fest; zum Umnummerieren ein neues Konto anlegen und das alte löschen."
      >
        <Button variant="outline" onClick={add} className="bg-card">
          <PlusIcon data-icon="inline-start" />
          Konto hinzufügen
        </Button>
      </ViewHeader>

      <div className="surface overflow-x-auto rounded-xl bg-card">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b">
            <tr>
              <Th className="w-32">Nummer</Th>
              <Th>Name</Th>
              <Th className="w-36">Kategorie</Th>
              <Th className="w-44 text-right">
                <span className="sr-only">Status und Aktionen</span>
              </Th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {table.rows.length === 0 && (
              <EmptyRow colSpan={4}>
                <p className="font-medium text-foreground">Noch keine Konten</p>
                <p>Lege die Konten deines Vereins an, zum Beispiel 1000 Kasse, 1020 Bank, 2800 Eigenkapital, 3000 Mitgliederbeiträge und 4000 Material.</p>
                <Button variant="outline" onClick={add} className="mt-1">
                  <PlusIcon data-icon="inline-start" />
                  Erstes Konto anlegen
                </Button>
              </EmptyRow>
            )}
            {table.rows.map((row) => {
              const status = table.statuses.get(row.key)!
              const e = showErrors ? errors.get(row.key) : undefined
              const number = Number(row.draft.number)
              const label = row.saved ? `Konto ${row.saved.number}` : 'Neues Konto'
              return (
                <tr key={row.key} className={cn('transition-colors duration-150', ROW_CLASS[status])}>
                  <Td>
                    {row.saved ? (
                      <CellText className="font-medium tabular-nums">{row.saved.number}</CellText>
                    ) : (
                      <CellInput
                        id={`${row.key}-number`}
                        aria-label="Kontonummer"
                        inputMode="numeric"
                        placeholder="z.B. 1020"
                        value={row.draft.number}
                        onChange={(ev) => table.update(row.key, { number: ev.target.value })}
                        error={e?.number}
                        className="font-medium tabular-nums"
                      />
                    )}
                  </Td>
                  <Td>
                    <CellInput
                      aria-label={`Name ${label}`}
                      placeholder="Kontoname"
                      value={row.draft.name}
                      disabled={status === 'deleted'}
                      onChange={(ev) => table.update(row.key, { name: ev.target.value })}
                      error={e?.name}
                    />
                  </Td>
                  <Td>
                    <CellText className="text-muted-foreground">
                      {row.draft.number && Number.isInteger(number) ? CLASS_LABEL[classOf(number)] : '–'}
                    </CellText>
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
