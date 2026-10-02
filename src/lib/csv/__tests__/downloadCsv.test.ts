import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadCsv, exportFilename, localDate } from '../downloadCsv'

describe('exportFilename', () => {
  const date = new Date(2026, 9, 2, 23, 30) // local time: Oct 2, 2026, 11:30 PM

  it('names a selection export by its count', () => {
    expect(exportFilename('orders', { scope: 'selected', count: 12 }, date)).toBe(
      'orders-selected-12-2026-10-02.csv',
    )
  })

  it('names a page export by its page', () => {
    expect(exportFilename('orders', { scope: 'page', page: 3 }, date)).toBe(
      'orders-page-3-2026-10-02.csv',
    )
  })

  it('uses the local date, zero-padded', () => {
    expect(localDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('downloadCsv', () => {
  const created: Blob[] = []
  const revokeObjectURL = vi.fn()
  beforeEach(() => {
    vi.useFakeTimers()
    created.length = 0
    revokeObjectURL.mockClear()
    // jsdom has no object URLs.
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: (blob: Blob) => {
        created.push(blob)
        return 'blob:test-1'
      },
      revokeObjectURL,
    })
  })
  afterEach(() => vi.useRealTimers())

  it('downloads BOM + text as text/csv through a temporary link, then revokes the URL', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadCsv('A,B\r\nJosé,1\r\n', 'orders-page-1-2026-10-02.csv')

    expect(click).toHaveBeenCalledTimes(1)
    const link = click.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toBe('orders-page-1-2026-10-02.csv')
    expect(link.getAttribute('href')).toBe('blob:test-1')
    expect(link.isConnected).toBe(false) // removed again

    const blob = created[0]!
    expect(blob.type).toBe('text/csv;charset=utf-8')
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]) // the UTF-8 BOM
    expect(new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)).toBe('﻿A,B\r\nJosé,1\r\n')

    expect(revokeObjectURL).not.toHaveBeenCalled() // not synchronously…
    vi.runAllTimers()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-1') // …but on the next tick
  })
})
