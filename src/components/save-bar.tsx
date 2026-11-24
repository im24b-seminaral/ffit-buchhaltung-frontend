import { useEffect } from 'react'
import { SaveIcon, Undo2Icon } from 'lucide-react'
import { Perforation } from '@/components/slip'
import { Button } from '@/components/ui/button'
import type { RowStatus } from '@/lib/drafts'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

interface Props {
  counts: Record<RowStatus, number>
  invalidRows: number
  saving: boolean
  /** Only the visible view reacts to ⌘S / Ctrl+S. */
  active: boolean
  onSave: () => void
  onDiscard: () => void
}

/** The pending part of the slip: everything below the perforation is not yet with the backend. */
export function SaveBar({ counts, invalidRows, saving, active, onSave, onDiscard }: Props) {
  const dirty = counts.new + counts.modified + counts.deleted

  useEffect(() => {
    if (!active || !dirty) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!saving) onSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, dirty, saving, onSave])

  if (!dirty) return null

  const parts = [
    counts.new && `${counts.new} neu`,
    counts.modified && `${counts.modified} geändert`,
    counts.deleted && `${counts.deleted} gelöscht`,
  ].filter(Boolean)

  return (
    <div
      role="region"
      aria-label="Ungespeicherte Änderungen"
      className="sticky bottom-4 z-10 mt-4 rounded-xl bg-slip shadow-[0_0_0_1px_oklch(0.45_0.08_40/0.12),0_12px_32px_-12px_oklch(0.4_0.08_40/0.35)] transition-[opacity,translate] duration-200 ease-out-strong starting:translate-y-2 starting:opacity-0"
    >
      <div className="px-4 pt-3">
        <Perforation />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-2.5 pb-3">
        <p className="text-sm" aria-live="polite">
          <span className="font-semibold">
            {dirty} {dirty === 1 ? 'Änderung' : 'Änderungen'} nicht gespeichert
          </span>
          <span className="text-muted-foreground"> · {parts.join(' · ')}</span>
          {invalidRows > 0 && (
            <span className="font-medium text-destructive">
              {' '}
              · {invalidRows} {invalidRows === 1 ? 'Zeile' : 'Zeilen'} unvollständig
            </span>
          )}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" onClick={onDiscard} disabled={saving}>
            <Undo2Icon data-icon="inline-start" />
            Verwerfen
          </Button>
          <Button onClick={onSave} disabled={saving}>
            <SaveIcon data-icon="inline-start" />
            {saving ? 'Speichert …' : 'Speichern'}
            <kbd className="ml-1 hidden rounded bg-primary-foreground/15 px-1 text-[11px] font-medium sm:inline">
              {isMac ? '⌘S' : 'Ctrl S'}
            </kbd>
          </Button>
        </div>
      </div>
    </div>
  )
}
