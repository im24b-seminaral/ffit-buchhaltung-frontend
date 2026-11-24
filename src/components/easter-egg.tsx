import { useEffect, useSyncExternalStore, type CSSProperties } from 'react'
import { createKonamiMatcher, type Act } from '@/lib/easter-eggs'
import { FIGURE_HEIGHT, FIGURE_WIDTH, FRAMES, pixelRuns, WAVE, type Frame } from '@/lib/figure-sprites'

/** Where the figure performs: across the bottom edge, up from the bottom edge, or beside the login form. */
export type Place = 'stroll' | 'rise' | 'login'

interface Show {
  id: number
  act: Act
  place: Place
}

/** Must match the duration of the `ee-*` place animations in index.css. */
const DURATION_MS = 4000

// One show at a time, shared by every trigger; a new one replaces the running one.
let current: Show | null = null
let nextId = 1
const listeners = new Set<() => void>()

function setShow(next: Show | null) {
  current = next
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function playEasterEgg(act: Act, place: Place): void {
  setShow({ id: nextId++, act, place })
}

/** Keys typed into a field belong to the field, never to the Konami code. */
function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

/** Mounted once at the app root: plays whatever a trigger asked for and listens for the Konami code. */
export function EasterEggStage() {
  const show = useSyncExternalStore(subscribe, () => current)

  useEffect(() => {
    const matches = createKonamiMatcher()
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target) || !matches(e.key)) return
      playEasterEgg('rick', 'stroll')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Keyed on the show itself, so a replacement clears the previous show's timer.
  useEffect(() => {
    if (!show) return
    const timer = setTimeout(() => setShow(null), DURATION_MS)
    return () => clearTimeout(timer)
  }, [show])

  if (!show) return null
  return (
    <div key={show.id} aria-hidden="true" className={`ee-place ee-${show.place} pointer-events-none fixed z-50`}>
      <div className="pointer-events-auto flex cursor-pointer flex-col items-center" onClick={() => setShow(null)}>
        {show.act === 'six-seven' && (
          <p className="mb-1 text-3xl font-extrabold tracking-tight text-slip-ink tabular-nums">
            <span className="ee-six inline-block">6</span> … <span className="ee-seven inline-block">7</span>
          </p>
        )}
        <DancingFigure act={show.act} />
      </div>
    </div>
  )
}

/** One dance cycle; every act splits it evenly between its frames. */
const CYCLE_S = 0.6
const SCALE = 3

/** All frames are drawn on top of each other; CSS shows one at a time, or the still wave when motion is reduced. */
function DancingFigure({ act }: { act: Act }) {
  const frames = FRAMES[act]
  return (
    <svg
      viewBox={`0 -1 ${FIGURE_WIDTH} ${FIGURE_HEIGHT + 1}`}
      width={FIGURE_WIDTH * SCALE}
      height={(FIGURE_HEIGHT + 1) * SCALE}
      shapeRendering="crispEdges"
      className="overflow-visible"
    >
      {frames.map((frame, i) => (
        <FrameArt
          key={i}
          frame={frame}
          className="ee-frame"
          style={{
            animationName: `ee-frame-${frames.length}`,
            animationDuration: `${CYCLE_S}s`,
            animationDelay: `${-(((frames.length - i) % frames.length) * CYCLE_S) / frames.length}s`,
          }}
        />
      ))}
      <FrameArt frame={WAVE} className="ee-still" />
    </svg>
  )
}

function FrameArt({ frame, className, style }: { frame: Frame; className: string; style?: CSSProperties }) {
  return (
    <g className={className} style={style} transform={`translate(${frame.dx} ${frame.dy})`}>
      {frame.parts.flatMap((part, p) =>
        pixelRuns(part.rows, part.y).map((r, j) => <rect key={`${p}-${j}`} x={r.x} y={r.y} width={r.width} height={1} fill={r.fill} />),
      )}
    </g>
  )
}
