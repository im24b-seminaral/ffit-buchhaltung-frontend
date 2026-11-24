import { useEffect, useId, useState, type FormEvent } from 'react'
import { ExternalLinkIcon, RotateCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { normalizeUrl, PRESETS, probe, type Reachability } from '@/lib/backend'
import { cn } from '@/lib/utils'

const CUSTOM = 'custom'

export function useReachability(url: string) {
  const [state, setState] = useState<{ url: string; status: Reachability }>({ url, status: 'checking' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    probe(url).then((status) => !cancelled && setState({ url, status }))
    return () => {
      cancelled = true
    }
  }, [url, attempt])

  const status: Reachability = state.url === url ? state.status : 'checking'
  return {
    status,
    recheck() {
      setState({ url, status: 'checking' })
      setAttempt((a) => a + 1)
    },
  }
}

export const hostOf = (url: string) => url.replace(/^https?:\/\//, '')

const STATUS_LABEL: Record<Reachability, string> = {
  checking: 'Prüfe Verbindung …',
  online: 'Erreichbar',
  offline: 'Nicht erreichbar',
}

export function StatusDot({ status, className }: { status: Reachability; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        status === 'online' && 'bg-success',
        status === 'offline' && 'bg-destructive',
        status === 'checking' && 'animate-pulse bg-muted-foreground/50',
        className,
      )}
    />
  )
}

/** Choose a preset or custom backend URL; shows whether anything answers there. */
export function BackendPicker({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const isPreset = PRESETS.some((p) => p.url === value)
  const [choice, setChoice] = useState(isPreset ? value : CUSTOM)
  const [custom, setCustom] = useState(isPreset ? '' : value)
  const [customError, setCustomError] = useState<string | null>(null)
  const { status, recheck } = useReachability(value)
  const inputId = useId()

  function choose(next: string) {
    setChoice(next)
    if (next !== CUSTOM) onChange(next)
  }

  function submitCustom(e: FormEvent) {
    e.preventDefault()
    const url = normalizeUrl(custom)
    if (!url) {
      setCustomError('Vollständige Adresse mit http:// oder https://')
      return
    }
    setCustomError(null)
    setCustom(url)
    onChange(url)
  }

  return (
    <div className="flex flex-col gap-4">
      <RadioGroup value={choice} onValueChange={(v) => choose(String(v))} aria-label="Backend" className="gap-1">
        {PRESETS.map((preset) => (
          <label
            key={preset.url}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-card/70"
          >
            <RadioGroupItem value={preset.url} className="border-muted-foreground/60 bg-card" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-sm font-medium">{preset.label}</span>
              <span className="truncate text-xs text-muted-foreground tabular-nums">{hostOf(preset.url)}</span>
            </span>
          </label>
        ))}
        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-card/70">
          <RadioGroupItem value={CUSTOM} className="border-muted-foreground/60 bg-card" />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-medium">Eigene Adresse</span>
            <span className="text-xs text-muted-foreground">z.B. ein Tunnel aus der Klasse</span>
          </span>
        </label>
      </RadioGroup>

      {choice === CUSTOM && (
        <form onSubmit={submitCustom} className="flex flex-col gap-1.5" noValidate>
          <label htmlFor={inputId} className="sr-only">
            Backend-Adresse
          </label>
          <div className="flex gap-2">
            <Input
              id={inputId}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="https://…trycloudflare.com"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              aria-invalid={customError ? true : undefined}
              className="bg-card"
            />
            <Button type="submit" variant="outline" className="bg-card">
              Verwenden
            </Button>
          </div>
          {customError && <p className="text-xs text-destructive">{customError}</p>}
        </form>
      )}

      <div className="flex flex-col gap-1.5 text-sm" aria-live="polite">
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <span className="min-w-0 truncate">
            <span className="font-medium">{STATUS_LABEL[status]}</span>
            <span className="text-muted-foreground tabular-nums"> · {hostOf(value)}</span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={recheck}
            aria-label="Verbindung erneut prüfen"
            className="ml-auto text-muted-foreground"
          >
            <RotateCwIcon />
          </Button>
        </div>
        {status === 'offline' && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {value.startsWith('https:') ? (
              <>
                Eigenes Zertifikat?{' '}
                <a
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 font-medium text-slip-ink underline underline-offset-2"
                >
                  Adresse öffnen <ExternalLinkIcon className="size-3" />
                </a>{' '}
                und dem Zertifikat vertrauen, dann erneut prüfen.
              </>
            ) : (
              'Läuft das Backend? Lokal startet es makedeck.'
            )}
          </p>
        )}
      </div>
    </div>
  )
}
