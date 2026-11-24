import { describe, expect, it } from 'vitest'
import { FIGURE_HEIGHT, FIGURE_WIDTH, FRAMES, mirror, PALETTE, pixelRuns, WAVE } from './figure-sprites'

const allFrames = [...FRAMES.rick, ...FRAMES['six-seven'], WAVE]

describe('figure sprites', () => {
  it('draws every part on the 20-wide grid with palette colours only', () => {
    for (const frame of allFrames)
      for (const part of frame.parts) {
        for (const row of part.rows) {
          expect(row).toHaveLength(FIGURE_WIDTH)
          for (const ch of row) expect(ch === '.' || ch in PALETTE, `unknown pixel "${ch}"`).toBe(true)
        }
        expect(part.y + part.rows.length).toBeLessThanOrEqual(FIGURE_HEIGHT)
      }
  })

  it('has four rick frames and two six-seven frames', () => {
    expect(FRAMES.rick).toHaveLength(4)
    expect(FRAMES['six-seven']).toHaveLength(2)
  })

  it('mirrors rows left to right', () => expect(mirror(['ab..', '.cd.'])).toEqual(['..ba', '.dc.']))

  it('merges horizontal runs of one colour', () =>
    expect(pixelRuns(['.HHS.'], 2)).toEqual([
      { x: 1, y: 2, width: 2, fill: PALETTE.H },
      { x: 3, y: 2, width: 1, fill: PALETTE.S },
    ]))
})
