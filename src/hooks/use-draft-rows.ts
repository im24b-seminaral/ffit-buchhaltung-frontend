import { useMemo, useState } from 'react'
import { statusOf, type DraftRow, type RowStatus } from '@/lib/drafts'

let nextKey = 0
const newKey = () => `new-${++nextKey}`

/**
 * Editable copy of `saved` for an inline-edited table. The drafts reset whenever `saved` changes identity,
 * i.e. after the collection was (re)loaded from the backend.
 */
export function useDraftRows<T, D extends object>(saved: T[], toDraft: (row: T) => D, keyOf: (row: T) => string) {
  const fromSaved = () => saved.map((row) => ({ key: keyOf(row), saved: row, draft: toDraft(row), deleted: false }))
  const [state, setState] = useState(() => ({ source: saved, rows: fromSaved() as DraftRow<T, D>[] }))

  // Reset during render (not in an effect) so a reload never flashes stale drafts.
  let rows = state.rows
  if (state.source !== saved) {
    rows = fromSaved()
    setState({ source: saved, rows })
  }

  const statuses = useMemo(() => new Map(rows.map((r) => [r.key, statusOf(r, toDraft)])), [rows, toDraft])
  const counts = useMemo(() => {
    const c: Record<RowStatus, number> = { clean: 0, new: 0, modified: 0, deleted: 0 }
    for (const s of statuses.values()) c[s]++
    return c
  }, [statuses])

  const setRows = (update: (rows: DraftRow<T, D>[]) => DraftRow<T, D>[]) =>
    setState((s) => ({ ...s, rows: update(s.rows) }))

  return {
    rows,
    statuses,
    counts,
    dirty: counts.new + counts.modified + counts.deleted,
    update(key: string, patch: Partial<D>) {
      setRows((rs) => rs.map((r) => (r.key === key ? { ...r, draft: { ...r.draft, ...patch } } : r)))
    },
    /** Appends a new row and returns its key. */
    add(blank: D): string {
      const key = newKey()
      setRows((rs) => [...rs, { key, saved: null, draft: blank, deleted: false }])
      return key
    },
    /** Marks a saved row as deleted (or restores it); removes a new row. */
    toggleDelete(key: string) {
      setRows((rs) => rs.flatMap((r) => (r.key !== key ? [r] : r.saved ? [{ ...r, deleted: !r.deleted }] : [])))
    },
    discard() {
      setState({ source: saved, rows: fromSaved() })
    },
  }
}
