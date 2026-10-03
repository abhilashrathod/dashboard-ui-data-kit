import { datePresetRange, type ViewPreset } from '@/components'

/**
 * The Orders table's built-in views. "Needs attention" is a function: its
 * date range is computed from the local today whenever the views menu renders.
 */
export const ORDER_VIEW_PRESETS: readonly ViewPreset[] = [
  { id: 'all', name: 'All orders', params: {} },
  {
    id: 'needs-attention',
    name: 'Needs attention',
    params: () => ({
      filters: [
        { field: 'status', op: 'in', value: ['pending'] },
        { field: 'createdAt', op: 'between', value: datePresetRange('last7') },
      ],
    }),
  },
  {
    id: 'high-value',
    name: 'High value',
    params: { filters: [{ field: 'amount', op: 'gt', value: 1000 }], sort: '-amount' },
  },
  {
    id: 'refunds',
    name: 'Refunds',
    params: { filters: [{ field: 'status', op: 'in', value: ['refunded'] }], sort: '-createdAt' },
  },
]
