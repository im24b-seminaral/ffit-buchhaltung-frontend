export interface BackendPreset {
  label: string
  url: string
}

export const PRESETS: BackendPreset[] = [
  { label: 'Lokal · HTTP', url: 'http://localhost:8080' },
  { label: 'Lokal · HTTPS', url: 'https://localhost:8443' },
]

const BACKEND_KEY = 'buchhaltung.backend'
const SESSION_KEY = 'buchhaltung.session'

/** Trims whitespace and trailing slashes; returns null for anything that is not an http(s) URL. */
export function normalizeUrl(input: string): string | null {
  const value = input.trim().replace(/\/+$/, '')
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null
  } catch {
    return null
  }
}

export function loadBackend(): string {
  return localStorage.getItem(BACKEND_KEY) ?? PRESETS[0].url
}

export function storeBackend(url: string) {
  localStorage.setItem(BACKEND_KEY, url)
}

export interface Session {
  backendUrl: string
  projectName: string
  token: string
}

/** Seconds since epoch at which the JWT expires, or null if the token carries no readable `exp`. */
function tokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

/** The stored session, if it belongs to `backendUrl` and its token has not expired. */
export function loadSession(backendUrl: string): Session | null {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Session | null
    if (!session || session.backendUrl !== backendUrl) return null
    const exp = tokenExpiry(session.token)
    return exp !== null && exp * 1000 < Date.now() ? null : session
  } catch {
    return null
  }
}

export function storeSession(session: Session | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
}

export type Reachability = 'checking' | 'online' | 'offline'

/**
 * Whether anything answers at `url`. `no-cors` resolves with an opaque response for any HTTP answer and
 * rejects only when nothing is listening, DNS fails, or the TLS certificate is not trusted.
 */
export async function probe(url: string): Promise<'online' | 'offline'> {
  try {
    await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(4000) })
    return 'online'
  } catch {
    return 'offline'
  }
}
