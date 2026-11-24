/** Which routine the dancing figure performs. */
export type Act = 'rick' | 'six-seven'

const RICK_CENTS = 198700
const SIX_SEVEN_CENTS = 6700

/** The act a save earns: Rick for 1'987.00 (the song's year), 6-7 for 67.00. Deleted rows carry `null`. */
export function actForSavedAmounts(amounts: (number | null)[]): Act | null {
  const cents = amounts.flatMap((a) => (a === null ? [] : [Math.round(a * 100)]))
  if (cents.includes(RICK_CENTS)) return 'rick'
  if (cents.includes(SIX_SEVEN_CENTS)) return 'six-seven'
  return null
}

const KONAMI = 'arrowup arrowup arrowdown arrowdown arrowleft arrowright arrowleft arrowright b a'
const KONAMI_LENGTH = KONAMI.split(' ').length

/** Feed it `KeyboardEvent.key`; returns true when the last keys were ↑↑↓↓←→←→BA. */
export function createKonamiMatcher(): (key: string) => boolean {
  let recent: string[] = []
  return (key) => {
    recent = [...recent, key.toLowerCase()].slice(-KONAMI_LENGTH)
    if (recent.join(' ') !== KONAMI) return false
    recent = []
    return true
  }
}

/** Feed it click timestamps; returns true on the `target`-th click within `windowMs` of the first one. */
export function createClickCounter(target = 7, windowMs = 3000): (now: number) => boolean {
  let count = 0
  let start = 0
  return (now) => {
    if (count === 0 || now - start > windowMs) {
      count = 0
      start = now
    }
    count++
    if (count < target) return false
    count = 0
    return true
  }
}
