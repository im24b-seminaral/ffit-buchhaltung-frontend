import type { Account, Booking } from './accounting'

export interface AccountUpdate {
  number: number
  /** `null` deletes the account. */
  name: string | null
}

export interface BookingUpdate {
  /** Booking number; 0 creates a booking with the next free number. All other fields `null` deletes it. */
  id: number
  date: string | null
  text: string | null
  debit: number | null
  credit: number | null
  amount: number | null
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Spring sends `{ status, error, message, path }`; `message` carries the reason of a 400. */
async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null)
  const message = body && typeof body.message === 'string' ? body.message.trim() : ''
  return message || fallback
}

async function request(baseUrl: string, path: string, init: RequestInit, token?: string): Promise<Response> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
    // Skips ngrok's interstitial page for tunnelled backends (sent where the reference frontend sends it).
    headers.set('ngrok-skip-browser-warning', '1')
  }
  try {
    return await fetch(`${baseUrl}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(
      0,
      `Keine Verbindung zu ${baseUrl}. Läuft das Backend, und erlaubt es Anfragen von ${window.location.origin} (CORS)?`,
    )
  }
}

export async function register(baseUrl: string, projectName: string, password: string): Promise<void> {
  const response = await request(baseUrl, '/projects', {
    method: 'POST',
    body: JSON.stringify({ project_name: projectName, password }),
  })
  if (!response.ok) {
    throw new ApiError(
      response.status,
      await errorMessage(response, 'Projekt konnte nicht erstellt werden. Gibt es den Namen schon?'),
    )
  }
}

export async function login(baseUrl: string, projectName: string, password: string): Promise<string> {
  const response = await request(baseUrl, '/login', {
    method: 'POST',
    body: JSON.stringify({ project_name: projectName, password }),
  })
  if (response.status === 401) throw new ApiError(401, 'Projektname oder Passwort ist falsch.')
  if (!response.ok) throw new ApiError(response.status, await errorMessage(response, 'Anmeldung fehlgeschlagen.'))
  const body = await response.json().catch(() => null)
  if (!body || typeof body.access_token !== 'string') {
    throw new ApiError(response.status, 'Das Backend hat kein Zugriffstoken geliefert.')
  }
  return body.access_token
}

/** Authenticated client for one project; `onUnauthorized` runs when the token is rejected (e.g. expired). */
export function createClient(baseUrl: string, token: string, onUnauthorized: () => void) {
  async function call(path: string, init: RequestInit, failure: string): Promise<Response> {
    const response = await request(baseUrl, path, init, token)
    if (response.status === 401) {
      onUnauthorized()
      throw new ApiError(401, 'Sitzung abgelaufen. Bitte neu anmelden.')
    }
    if (!response.ok) throw new ApiError(response.status, await errorMessage(response, failure))
    return response
  }

  return {
    async accounts(): Promise<Account[]> {
      return (await call('/accounts', {}, 'Kontenplan konnte nicht geladen werden.')).json()
    },
    async bookings(): Promise<Booking[]> {
      return (await call('/bookings', {}, 'Buchungsjournal konnte nicht geladen werden.')).json()
    },
    async saveAccounts(accounts: AccountUpdate[]): Promise<void> {
      await call('/accounts', { method: 'PUT', body: JSON.stringify({ accounts }) }, 'Speichern fehlgeschlagen.')
    },
    async saveBookings(entries: BookingUpdate[]): Promise<void> {
      await call('/bookings', { method: 'PUT', body: JSON.stringify({ entries }) }, 'Speichern fehlgeschlagen.')
    },
  }
}

export type ApiClient = ReturnType<typeof createClient>
