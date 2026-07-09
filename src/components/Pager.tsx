'use client'
import { Button } from './ui/button'

/**
 * Minimal client-side pager. Given the current page and total count, renders
 * Prev / Next controls and a "Page X of Y" label. Hidden when everything fits
 * on one page.
 */
export function Pager({
  page,
  total,
  pageSize,
  onPage,
  label = 'items',
}: {
  page: number
  total: number
  pageSize: number
  onPage: (next: number) => void
  label?: string
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">
        {from}–{to} of {total} {label}
      </span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          Page {page} of {pageCount}
        </span>
        <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}

/** Slice an array for the current page. */
export function paginate<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return rows.slice(start, start + pageSize)
}
