import { useId, useState, type ReactNode } from 'react'
import { CircleAlertIcon, CircleCheckIcon } from 'lucide-react'
import { ViewHeader } from '@/components/edit-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { balanceSheet, formatCents, statement, todayIso, type Account, type Booking, type Line } from '@/lib/accounting'
import { cn } from '@/lib/utils'

interface ReportProps {
  accounts: Account[]
  bookings: Booking[]
  pendingChanges: boolean
  onOpenAccounts: () => void
}

const dateLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('de-CH')

export function StatementView({ accounts, bookings, pendingChanges, onOpenAccounts }: ReportProps) {
  const [until, setUntil] = useState(todayIso)
  const s = statement(accounts, bookings, until)
  const result = s.profit >= 0 ? { label: 'Gewinn', cents: s.profit } : { label: 'Verlust', cents: -s.profit }
  const total = Math.max(s.leftTotal, s.rightTotal)

  return (
    <section>
      <ViewHeader
        title="Erfolgsrechnung"
        description={
          <>
            Aufwand und Ertrag aller Buchungen bis und mit {dateLabel(until)}.{' '}
            <span className="font-medium text-foreground">
              {result.label} CHF {formatCents(result.cents)}
            </span>
          </>
        }
      >
        <DateField label="Bis" value={until} onChange={setUntil} />
      </ViewHeader>
      <PendingNote show={pendingChanges} />
      {s.left.length + s.right.length === 0 ? (
        <NoAccounts kinds="Ertrag (3xxx) und Aufwand (4xxx)" onOpenAccounts={onOpenAccounts} />
      ) : (
        <TAccount
          leftTitle="Aufwand"
          rightTitle="Ertrag"
          left={s.left}
          right={s.right}
          // The result balances the account: a profit sits on the expense side, a loss on the revenue side.
          leftExtra={s.profit > 0 ? result : undefined}
          rightExtra={s.profit < 0 ? result : undefined}
          leftTotal={total}
          rightTotal={total}
        />
      )}
    </section>
  )
}

export function BalanceView({ accounts, bookings, pendingChanges, onOpenAccounts }: ReportProps) {
  const [date, setDate] = useState(todayIso)
  const b = balanceSheet(accounts, bookings, date)
  const balanced = b.difference === 0

  return (
    <section>
      <ViewHeader
        title="Bilanz"
        description={`Aktiven und Passiven am ${dateLabel(date)}. Der Gewinn oder Verlust der Erfolgsrechnung bis zu diesem Tag zählt zu den Passiven.`}
      >
        <DateField label="Stichtag" value={date} onChange={setDate} />
      </ViewHeader>
      <PendingNote show={pendingChanges} />
      {b.left.length + b.right.length === 0 ? (
        <NoAccounts kinds="Aktiven (1xxx) und Passiven (2xxx)" onOpenAccounts={onOpenAccounts} />
      ) : (
        <>
          <TAccount
            leftTitle="Aktiven"
            rightTitle="Passiven"
            left={b.left}
            right={b.right}
            rightExtra={{ label: b.profit >= 0 ? 'Gewinn' : 'Verlust', cents: b.profit }}
            leftTotal={b.leftTotal}
            rightTotal={b.rightTotal}
            totalLabel="Bilanzsumme"
            mismatch={!balanced}
          />
          <p
            role="status"
            className={cn(
              'mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm',
              balanced ? 'bg-success-soft text-success' : 'bg-destructive/10 text-destructive',
            )}
          >
            {balanced ? (
              <>
                <CircleCheckIcon className="mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="font-semibold">Bilanz ausgeglichen.</span> Aktiven und Passiven sind gleich gross.
                </span>
              </>
            ) : (
              <>
                <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="font-semibold">Differenz CHF {formatCents(Math.abs(b.difference))}.</span> Prüfe
                  Buchungen auf Konten ausserhalb der Kategorien 1 bis 4.
                </span>
              </>
            )}
          </p>
        </>
      )}
    </section>
  )
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs font-semibold text-slip-ink">
        {label}
      </label>
      <Input
        id={id}
        type="date"
        required
        value={value}
        // Clearing a date input yields ""; keep the last valid date instead of an empty report.
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="h-8 w-40 bg-card tabular-nums"
      />
    </div>
  )
}

function PendingNote({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <p className="mb-4 text-sm text-slip-ink">
      Es gibt ungespeicherte Änderungen. Die Auswertung zeigt nur gespeicherte Konten und Buchungen.
    </p>
  )
}

function NoAccounts({ kinds, onOpenAccounts }: { kinds: string; onOpenAccounts: () => void }) {
  return (
    <div className="surface flex flex-col items-center gap-3 rounded-xl bg-card px-6 py-14 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">Noch nichts auszuwerten</p>
      <p className="max-w-md">Hier erscheinen die Konten der Kategorien {kinds}, sobald es sie im Kontenplan gibt.</p>
      <Button variant="outline" onClick={onOpenAccounts} className="mt-1">
        Zum Kontenplan
      </Button>
    </div>
  )
}

interface Extra {
  label: string
  cents: number
}

/** Two-sided account statement; both reports share this exact layout so they read the same way. */
function TAccount(props: {
  leftTitle: string
  rightTitle: string
  left: Line[]
  right: Line[]
  leftExtra?: Extra
  rightExtra?: Extra
  leftTotal: number
  rightTotal: number
  totalLabel?: string
  mismatch?: boolean
}) {
  const { totalLabel = 'Total', mismatch = false } = props
  // Each side carries its own total; grid rows stretch both sides, so the totals line up on wide screens.
  return (
    <div className="surface grid overflow-hidden rounded-xl bg-card md:grid-cols-2">
      <Side
        title={props.leftTitle}
        lines={props.left}
        extra={props.leftExtra}
        total={{ label: `${totalLabel} ${props.leftTitle}`, cents: props.leftTotal }}
        mismatch={mismatch}
        className="max-md:border-b md:border-r"
      />
      <Side
        title={props.rightTitle}
        lines={props.right}
        extra={props.rightExtra}
        total={{ label: `${totalLabel} ${props.rightTitle}`, cents: props.rightTotal }}
        mismatch={mismatch}
      />
    </div>
  )
}

function Side({
  title,
  lines,
  extra,
  total,
  mismatch,
  className,
}: {
  title: string
  lines: Line[]
  extra?: Extra
  total: Extra
  mismatch: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-col', className)}>
      <h2 className="flex h-10 items-center justify-between border-b px-4 text-xs font-semibold text-slip-ink">
        <span>{title}</span>
        <span>CHF</span>
      </h2>
      <ul className="flex-1 divide-y">
        {lines.map((l) => (
          <Row key={l.account.number} number={l.account.number} name={l.account.name} cents={l.cents} />
        ))}
        {lines.length === 0 && <li className="px-4 py-2.5 text-sm text-muted-foreground">Keine Konten</li>}
      </ul>
      {extra && (
        <div className="flex items-baseline gap-3 border-t px-4 py-2.5 text-sm font-semibold text-slip-ink">
          <span className="w-12" />
          <span className="flex-1">{extra.label}</span>
          <Amount cents={extra.cents} />
        </div>
      )}
      <div className="flex items-baseline gap-3 border-t bg-muted/50 px-4 py-3 text-sm font-semibold">
        <span className="flex-1">{total.label}</span>
        <Amount cents={total.cents} className={cn('double-rule pb-0.5', mismatch && 'text-destructive')} />
      </div>
    </div>
  )
}

function Row({ number, name, cents }: { number: number; name: ReactNode; cents: number }) {
  return (
    <li className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
      <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{number}</span>
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <Amount cents={cents} className={cn(cents === 0 && 'text-muted-foreground')} />
    </li>
  )
}

function Amount({ cents, className }: { cents: number; className?: string }) {
  return <span className={cn('text-right tabular-nums', className)}>{formatCents(cents)}</span>
}
