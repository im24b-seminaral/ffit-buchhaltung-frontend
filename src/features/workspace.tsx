import { useCallback, useEffect, useMemo, useState } from 'react'
import { LogOutIcon, RotateCwIcon } from 'lucide-react'
import { toast } from 'sonner'
import { BackendPicker, hostOf, StatusDot, useReachability } from '@/components/backend-picker'
import { Wordmark } from '@/components/slip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccountsView } from '@/features/accounts-view'
import { BookingsView } from '@/features/bookings-view'
import { BalanceView, StatementView } from '@/features/reports'
import type { Account, Booking } from '@/lib/accounting'
import { createClient } from '@/lib/api'
import type { Session } from '@/lib/backend'

type Tab = 'accounts' | 'bookings' | 'statement' | 'balance'

const TABS: { value: Tab; label: string }[] = [
  { value: 'accounts', label: 'Kontenplan' },
  { value: 'bookings', label: 'Buchungsjournal' },
  { value: 'statement', label: 'Erfolgsrechnung' },
  { value: 'balance', label: 'Bilanz' },
]

interface Props {
  session: Session
  onBackendChange: (url: string) => void
  onLogout: () => void
}

export function Workspace({ session, onBackendChange, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('accounts')
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dirty, setDirty] = useState({ accounts: 0, bookings: 0 })
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null)
  const [backendOpen, setBackendOpen] = useState(false)

  const client = useMemo(
    () =>
      createClient(session.backendUrl, session.token, () => {
        toast.error('Sitzung abgelaufen. Bitte neu anmelden.')
        onLogout()
      }),
    [session, onLogout],
  )

  const loadAccounts = useCallback(async () => setAccounts(await client.accounts()), [client])
  const loadBookings = useCallback(async () => setBookings(await client.bookings()), [client])
  const loadAll = useCallback(() => {
    Promise.all([loadAccounts(), loadBookings()]).catch((err) => setLoadError(err.message))
  }, [loadAccounts, loadBookings])

  useEffect(loadAll, [loadAll])

  const anyDirty = dirty.accounts + dirty.bookings > 0
  useEffect(() => {
    if (!anyDirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [anyDirty])

  const setAccountsDirty = useCallback((n: number) => setDirty((d) => ({ ...d, accounts: n })), [])
  const setBookingsDirty = useCallback((n: number) => setDirty((d) => ({ ...d, bookings: n })), [])

  /** Leaving the project drops unsaved drafts, so ask first when there are any. */
  const leave = (action: () => void) => (anyDirty ? setPendingLeave(() => action) : action())

  const tabDirty: Partial<Record<Tab, number>> = { accounts: dirty.accounts, bookings: dirty.bookings }
  const ready = accounts !== null && bookings !== null

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="min-h-dvh gap-0">
      <header className="border-b border-slip-line bg-slip">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-14 items-center gap-3">
            <Wordmark />
            <p className="min-w-0 truncate text-sm">
              <span className="hidden font-semibold sm:inline">Vereinsbuchhaltung</span>
              <span className="hidden text-muted-foreground sm:inline"> / </span>
              <span className="font-medium">{session.projectName}</span>
            </p>
            <div className="ml-auto flex items-center gap-1">
              <Popover open={backendOpen} onOpenChange={setBackendOpen}>
                <PopoverTrigger render={<BackendChip url={session.backendUrl} />} />
                <PopoverContent align="end" className="w-80 bg-slip p-4">
                  <p className="mb-3 text-xs text-muted-foreground">
                    Beim Wechsel des Backends wirst du abgemeldet; Projekte gibt es pro Backend.
                  </p>
                  <BackendPicker
                    value={session.backendUrl}
                    onChange={(url) => {
                      if (url === session.backendUrl) return
                      setBackendOpen(false)
                      leave(() => onBackendChange(url))
                    }}
                  />
                </PopoverContent>
              </Popover>
              <Button variant="ghost" onClick={() => leave(onLogout)} aria-label="Abmelden" className="hover:bg-card/60">
                <LogOutIcon data-icon="inline-start" />
                <span aria-hidden="true" className="hidden sm:inline">
                  Abmelden
                </span>
              </Button>
            </div>
          </div>
          <TabsList variant="line" className="-mb-px h-11! w-full justify-start gap-4 overflow-x-auto p-0">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="h-full flex-none rounded-none px-0.5 text-foreground/70 after:bottom-0! data-active:text-foreground"
              >
                {t.label}
                {!!tabDirty[t.value] && (
                  <span className="size-1.5 rounded-full bg-slip-ink" aria-label={`${tabDirty[t.value]} ungespeichert`} />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {loadError ? (
          <div role="alert" className="surface flex flex-col items-start gap-3 rounded-xl bg-card p-6 text-sm">
            <p className="font-semibold text-destructive">Daten konnten nicht geladen werden</p>
            <p className="text-muted-foreground">{loadError}</p>
            <Button
              variant="outline"
              onClick={() => {
                setLoadError(null)
                loadAll()
              }}
            >
              <RotateCwIcon data-icon="inline-start" />
              Erneut versuchen
            </Button>
          </div>
        ) : !ready ? (
          <LoadingTable />
        ) : (
          <>
            <TabsContent value="accounts" keepMounted>
              <AccountsView
                accounts={accounts}
                client={client}
                active={tab === 'accounts'}
                onSaved={loadAccounts}
                onDirtyChange={setAccountsDirty}
              />
            </TabsContent>
            <TabsContent value="bookings" keepMounted>
              <BookingsView
                accounts={accounts}
                bookings={bookings}
                client={client}
                active={tab === 'bookings'}
                onSaved={loadBookings}
                onDirtyChange={setBookingsDirty}
                onOpenAccounts={() => setTab('accounts')}
              />
            </TabsContent>
            <TabsContent value="statement">
              <StatementView
                accounts={accounts}
                bookings={bookings}
                pendingChanges={anyDirty}
                onOpenAccounts={() => setTab('accounts')}
              />
            </TabsContent>
            <TabsContent value="balance">
              <BalanceView
                accounts={accounts}
                bookings={bookings}
                pendingChanges={anyDirty}
                onOpenAccounts={() => setTab('accounts')}
              />
            </TabsContent>
          </>
        )}
      </main>

      <AlertDialog open={pendingLeave !== null} onOpenChange={(open) => !open && setPendingLeave(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ungespeicherte Änderungen verwerfen?</AlertDialogTitle>
            <AlertDialogDescription>
              Im {[dirty.accounts && 'Kontenplan', dirty.bookings && 'Buchungsjournal'].filter(Boolean).join(' und im ')}{' '}
              gibt es Änderungen, die noch nicht gespeichert sind. Sie gehen verloren.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zurück</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                pendingLeave?.()
                setPendingLeave(null)
              }}
            >
              Verwerfen und fortfahren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  )
}

function BackendChip({ url, ...props }: { url: string } & React.ComponentProps<'button'>) {
  const { status } = useReachability(url)
  return (
    <Button variant="ghost" {...props} className="max-w-56 hover:bg-card/60 aria-expanded:bg-card/60">
      <StatusDot status={status} />
      <span className="truncate tabular-nums">{hostOf(url)}</span>
      <span className="sr-only">, Backend wechseln</span>
    </Button>
  )
}

function LoadingTable() {
  return (
    <div aria-busy="true" aria-label="Lädt">
      <Skeleton className="mb-2 h-7 w-48 bg-slip" />
      <Skeleton className="mb-6 h-4 w-96 max-w-full bg-slip" />
      <div className="surface flex flex-col gap-3 rounded-xl bg-card p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-7 bg-muted" />
        ))}
      </div>
    </div>
  )
}
