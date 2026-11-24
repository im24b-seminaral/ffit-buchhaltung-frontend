import { describe, expect, it } from 'vitest'
import { parseAmount } from './drafts'
import { actForSavedAmounts, createClickCounter, createKonamiMatcher } from './easter-eggs'

describe('actForSavedAmounts', () => {
  it('finds rick for 1987', () => expect(actForSavedAmounts([12, 1987])).toBe('rick'))
  it('finds six-seven for 67', () => expect(actForSavedAmounts([67])).toBe('six-seven'))
  it('prefers rick when both are saved', () => expect(actForSavedAmounts([67, 1987])).toBe('rick'))
  it('ignores deleted rows and near misses', () => expect(actForSavedAmounts([null, 67.01, 670, 19870, 1986.99])).toBeNull())
  it('matches parsed variants', () => {
    expect(actForSavedAmounts([parseAmount("1'987")])).toBe('rick')
    expect(actForSavedAmounts([parseAmount('67,00')])).toBe('six-seven')
    expect(actForSavedAmounts([parseAmount('1987.0')])).toBe('rick')
  })
})

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

describe('createKonamiMatcher', () => {
  it('fires on the last key only', () => {
    const m = createKonamiMatcher()
    expect(KONAMI.map((k) => m(k))).toEqual([...Array(9).fill(false), true])
  })
  it('accepts upper-case letters', () => {
    const m = createKonamiMatcher()
    expect([...KONAMI.slice(0, 8), 'B', 'A'].map((k) => m(k)).at(-1)).toBe(true)
  })
  it('restarts after a wrong key', () => {
    const m = createKonamiMatcher()
    expect(['x', ...KONAMI].map((k) => m(k)).at(-1)).toBe(true)
  })
  it.each([1, 2, 3])('fires after %i extra ArrowUp presses', (extra) => {
    const m = createKonamiMatcher()
    expect([...Array(extra).fill('ArrowUp'), ...KONAMI].map((k) => m(k)).at(-1)).toBe(true)
  })
  it('resets after firing', () => {
    const m = createKonamiMatcher()
    KONAMI.forEach((k) => m(k))
    expect(m('a')).toBe(false)
  })
})

describe('createClickCounter', () => {
  it('fires on the 7th click within 3 s', () => {
    const c = createClickCounter()
    expect([0, 100, 200, 300, 400, 500, 600].map((t) => c(t))).toEqual([false, false, false, false, false, false, true])
  })
  it('starts over when the window passes', () => {
    const c = createClickCounter()
    ;[0, 100, 200, 300, 400, 500].forEach((t) => c(t))
    expect(c(3500)).toBe(false)
  })
  it('resets after firing', () => {
    const c = createClickCounter()
    ;[0, 1, 2, 3, 4, 5, 6].forEach((t) => c(t))
    expect(c(7)).toBe(false)
  })
})
