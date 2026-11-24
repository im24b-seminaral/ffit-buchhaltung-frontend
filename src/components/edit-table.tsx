import type { ComponentProps, ReactNode } from 'react'
import { RotateCcwIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { RowStatus } from '@/lib/drafts'
import { cn } from '@/lib/utils'

/** Row tint per state; the status label in the last column carries the same information in words. */
export const ROW_CLASS: Record<RowStatus, string> = {
  clean: 'hover:bg-muted/60',
  new: 'bg-row-new',
  modified: 'bg-row-modified',
  deleted: 'bg-muted/70 text-muted-foreground [&_input]:line-through [&_[data-slot=cell-text]]:line-through',
}

const STATUS_LABEL: Partial<Record<RowStatus, string>> = { new: 'Neu', modified: 'Geändert', deleted: 'Gelöscht' }
const STATUS_TONE: Partial<Record<RowStatus, string>> = {
  new: 'text-success',
  modified: 'text-slip-ink',
  deleted: 'text-muted-foreground',
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      className={cn('h-10 px-3 text-left align-middle text-xs font-semibold whitespace-nowrap text-slip-ink', className)}
      {...props}
    />
  )
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-1.5 py-1 align-top', className)} {...props} />
}

/** Static cell content aligned with the text inside the cell inputs. */
export function CellText({ className, ...props }: ComponentProps<'span'>) {
  return <span data-slot="cell-text" className={cn('block px-1.5 py-1.5 text-sm leading-5', className)} {...props} />
}

/** Spreadsheet-like input: no chrome until hovered or focused, error text below. */
export function CellInput({ error, className, ...props }: ComponentProps<'input'> & { error?: string }) {
  return (
    <div>
      <Input
        aria-invalid={error ? true : undefined}
        className={cn(
          'h-8 rounded-md border-transparent bg-transparent px-1.5 shadow-none hover:border-input focus-visible:bg-card',
          'aria-invalid:bg-card disabled:bg-transparent disabled:opacity-100',
          className,
        )}
        {...props}
      />
      <CellError message={error} />
    </div>
  )
}

export function CellError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="px-1.5 pt-0.5 pb-1 text-xs text-destructive">{message}</p>
}

/** Last column: what happened to the row, and the delete / restore action. */
export function RowActions({ status, label, onToggleDelete }: { status: RowStatus; label: string; onToggleDelete: () => void }) {
  const deleted = status === 'deleted'
  const action = deleted ? `${label} wiederherstellen` : status === 'new' ? `${label} entfernen` : `${label} löschen`
  return (
    <div className="flex h-8 items-center justify-end gap-2">
      {STATUS_LABEL[status] && (
        <span className={cn('text-xs font-semibold', STATUS_TONE[status])}>{STATUS_LABEL[status]}</span>
      )}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleDelete}
              aria-label={action}
              className={cn('text-muted-foreground', !deleted && 'hover:bg-destructive/10 hover:text-destructive')}
            />
          }
        >
          {deleted ? <RotateCcwIcon /> : <Trash2Icon />}
        </TooltipTrigger>
        <TooltipContent>{action}</TooltipContent>
      </Tooltip>
    </div>
  )
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-14 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-sm text-muted-foreground">{children}</div>
      </td>
    </tr>
  )
}

export function ViewHeader({ title, description, children }: { title: string; description: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
        <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">{description}</p>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
