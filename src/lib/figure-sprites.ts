import type { Act } from './easter-eggs'

/**
 * Pixel art for the easter-egg figure: an original dancer in a trench coat with a red quiff.
 * Every part is drawn on the same 20-pixel-wide grid; `.` is transparent, other letters index PALETTE.
 */
export const FIGURE_WIDTH = 20
export const FIGURE_HEIGHT = 32

export const PALETTE: Record<string, string> = {
  H: '#c4532b', // hair
  h: '#9c3a1c', // hair shadow
  l: '#e2763f', // hair highlight
  S: '#f2c29c', // skin
  s: '#d69a72', // skin shadow
  E: '#2a2024', // eyes
  M: '#b0594a', // mouth
  T: '#2c2830', // turtleneck
  C: '#d2b07c', // coat
  c: '#ad8c5a', // coat shadow
  k: '#8a6c44', // coat seam and belt
  P: '#3a3542', // trousers
  p: '#28242e', // trousers shadow
  F: '#17151a', // shoes
}

export interface Part {
  y: number
  rows: string[]
}

export interface Frame {
  parts: Part[]
  /** Whole-figure shift in grid pixels: the sway and bounce of the dance. */
  dx: number
  dy: number
}

export const mirror = (rows: string[]): string[] => rows.map((r) => [...r].reverse().join(''))

const BODY: Part = {
  y: 0,
  rows: [
    '........HHHH........',
    '.......HllHHH.......',
    '......HllHHHHh......',
    '.....HHlHHHHHHh.....',
    '.....hHHHHHHHHh.....',
    '.....hHSSSSSSHh.....',
    '.....hSSSSSSSSh.....',
    '.....hSESSSSESh.....',
    '......SSSSsSSS......',
    '......SSSMMSSS......',
    '.......sSSSSs.......',
    '....cCCCTTTTCCCc....',
    '....CCCcTTTTcCCC....',
    '....CCCCcTTcCCCC....',
    '....cCCCCccCCCCc....',
    '.....cCCCkCCCCc.....',
    '.....kkkkkkkkkk.....',
    '.....cCCCkCCCCc.....',
    '....cCCCCkCCCCCc....',
    '....cCCCCkCCCCCc....',
    '....cCCCCkCCCCCc....',
    '....ccccckcccccc....',
  ],
}

const LEGS_STAND: Part = {
  y: 22,
  rows: [...Array<string>(9).fill('......PPp..pPP......'), '.....FFFF..FFFF.....'],
}

const LEGS_STEP_ROWS = [
  '......PPp..pPP......',
  '......PPp..pPP......',
  '......PPp..pPP......',
  '......PPp...pPP.....',
  '......PPp...pPP.....',
  '......PPp...pPP.....',
  '......PPp..pPP......',
  '......PPp..FFFF.....',
  '......PPp...........',
  '.....FFFF...........',
]

/** Elbows bent, fists in front at the waist. */
const ARMS_TUCKED: Part = {
  y: 11,
  rows: [
    '...CC..........CC...',
    '..cCC..........CCc..',
    '..cCC..........CCc..',
    '..cCC..........CCc..',
    '..cCSS........SSCc..',
    '...sS..........Ss...',
  ],
}

/** Both forearms swung to the viewer's left, the right one across the chest. */
const ARMS_SWING_ROWS = [
  '...CC..........CC...',
  '..cCC..........CCc..',
  '..cCC..........CCc..',
  'SSCCC...SSCCCCCCCc..',
  'sScccc..sScccccccc..',
]

/** Palms up, the viewer's left hand high: weighing six against seven. */
const ARMS_WEIGH_ROWS = [
  'SSS.................',
  'cCCCC...............',
  'cCCCC..........CC...',
  '...............CC...',
  '...............CCc..',
  '...............CCSSS',
  '...............CCCCc',
  '...............cccc.',
]

const ARMS_WAVE: Part = {
  y: 8,
  rows: [
    '................SS..',
    '................SS..',
    '...............CCc..',
    '...CC..........CC...',
    '..cCC...............',
    '..cCC...............',
    '..cCC...............',
    '..sSS...............',
  ],
}

const frame = (arms: Part, legs: Part, dx = 0, dy = 0): Frame => ({ parts: [BODY, legs, arms], dx, dy })

export const FRAMES: Record<Act, Frame[]> = {
  // Sway left, bounce up, sway right, bounce up: one step of the side-to-side dance.
  rick: [
    frame({ y: 11, rows: ARMS_SWING_ROWS }, { y: 22, rows: LEGS_STEP_ROWS }, -1, 0),
    frame(ARMS_TUCKED, LEGS_STAND, 0, -1),
    frame({ y: 11, rows: mirror(ARMS_SWING_ROWS) }, { y: 22, rows: mirror(LEGS_STEP_ROWS) }, 1, 0),
    frame(ARMS_TUCKED, LEGS_STAND, 0, -1),
  ],
  'six-seven': [
    frame({ y: 9, rows: ARMS_WEIGH_ROWS }, LEGS_STAND),
    frame({ y: 9, rows: mirror(ARMS_WEIGH_ROWS) }, LEGS_STAND),
  ],
}

/** The still pose shown when motion is reduced. */
export const WAVE: Frame = frame(ARMS_WAVE, LEGS_STAND)

export interface Run {
  x: number
  y: number
  width: number
  fill: string
}

/** Turns pixel rows into one rect per horizontal run of a colour, starting at grid row `y`. */
export function pixelRuns(rows: string[], y: number): Run[] {
  const runs: Run[] = []
  rows.forEach((row, dy) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      let end = x + 1
      while (row[end] === ch) end++
      if (ch !== '.') runs.push({ x, y: y + dy, width: end - x, fill: PALETTE[ch] })
      x = end
    }
  })
  return runs
}
