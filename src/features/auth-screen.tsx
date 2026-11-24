import { useRef, useState, type FormEvent } from 'react'
import { LogInIcon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { BackendPicker } from '@/components/backend-picker'
import { playEasterEgg } from '@/components/easter-egg'
import { Perforation, Wordmark } from '@/components/slip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { login, register } from '@/lib/api'
import { createClickCounter } from '@/lib/easter-eggs'

type Mode = 'login' | 'register'

interface Props {
  backendUrl: string
  onBackendChange: (url: string) => void
  onLoggedIn: (projectName: string, token: string) => void
}

/** The login is a payment slip: connection part, perforation, access part. */
export function AuthScreen({ backendUrl, onBackendChange, onLoggedIn }: Props) {
  const [mode, setMode] = useState<Mode>('login')
  const [projectName, setProjectName] = useState('')
  const [countWordmarkClick] = useState(createClickCounter)

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[880px]">
        <div className="mb-8 flex items-center gap-3">
          <span className="shrink-0 select-none" onClick={() => countWordmarkClick(Date.now()) && playEasterEgg('rick', 'login')}>
            <Wordmark className="h-6 w-9" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">Vereinsbuchhaltung</h1>
            <p className="text-sm text-muted-foreground">
              Kontenplan, Buchungsjournal, Erfolgsrechnung und Bilanz für deinen Verein.
            </p>
          </div>
        </div>

        <div className="surface flex flex-col overflow-hidden rounded-2xl bg-slip md:flex-row">
          <section aria-labelledby="connection-title" className="p-6 md:w-[300px] md:shrink-0">
            <h2 id="connection-title" className="mb-1 text-sm font-semibold text-slip-ink">
              Verbindung
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">Mit welchem Backend arbeitest du?</p>
            <BackendPicker value={backendUrl} onChange={onBackendChange} />
          </section>

          <Perforation orientation="vertical" className="hidden md:block" />
          <Perforation className="md:hidden" />

          <section aria-label="Zugang" className="flex-1 p-6">
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList variant="line" className="mb-5 -ml-1.5">
                <TabsTrigger value="login">Anmelden</TabsTrigger>
                <TabsTrigger value="register">Neues Projekt</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <AccessForm
                  key={`login-${projectName}`}
                  mode="login"
                  backendUrl={backendUrl}
                  initialProjectName={projectName}
                  onDone={(name, token) => onLoggedIn(name, token!)}
                />
              </TabsContent>
              <TabsContent value="register">
                <AccessForm
                  mode="register"
                  backendUrl={backendUrl}
                  initialProjectName=""
                  onDone={(name) => {
                    toast.success(`Projekt «${name}» erstellt. Melde dich jetzt an.`)
                    setProjectName(name)
                    setMode('login')
                  }}
                />
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>
    </div>
  )
}

function AccessForm({
  mode,
  backendUrl,
  initialProjectName,
  onDone,
}: {
  mode: Mode
  backendUrl: string
  initialProjectName: string
  onDone: (projectName: string, token?: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const isLogin = mode === 'login'

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const name = String(data.get('project')).trim()
    const password = String(data.get('password'))
    setBusy(true)
    setError(null)
    try {
      if (isLogin) onDone(name, await login(backendUrl, name, password))
      else {
        await register(backendUrl, name, password)
        onDone(name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      passwordRef.current?.select()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {isLogin
          ? 'Jedes Projekt ist eine eigene Buchhaltung mit Passwort.'
          : 'Lege eine neue, leere Buchhaltung an. Den Namen brauchst du später zum Anmelden.'}
      </p>
      <Field label="Projektname">
        <Input
          name="project"
          required
          defaultValue={initialProjectName}
          autoFocus={isLogin && !initialProjectName}
          autoComplete="username"
          placeholder="z.B. FC_Seldwyla"
          className="h-10 bg-card"
        />
      </Field>
      <Field label="Passwort">
        <Input
          ref={passwordRef}
          name="password"
          type="password"
          required
          autoFocus={isLogin && !!initialProjectName}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          className="h-10 bg-card"
        />
      </Field>
      {error && (
        <p role="alert" className="rounded-lg bg-card px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={busy} className="mt-1 h-10 self-start px-4">
        {isLogin ? <LogInIcon data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
        {busy ? (isLogin ? 'Anmelden …' : 'Erstellen …') : isLogin ? 'Anmelden' : 'Projekt erstellen'}
      </Button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-slip-ink">{label}</span>
      {children}
    </label>
  )
}
