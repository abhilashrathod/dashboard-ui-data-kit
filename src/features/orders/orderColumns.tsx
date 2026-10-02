import { Badge, CustomerCell, createColumnHelper, dataColumn, AmountCell } from '@/components'
import { DateCell, StatusCell, TextCell } from '@/components'
import type { Channel, Order } from '@/contracts'
import { formatNumber } from '@/lib/format'

const CHANNEL_LABEL: Record<Channel, string> = {
  web: 'Web',
  mobile: 'Mobile',
  marketplace: 'Marketplace',
  pos: 'In store',
}

const helper = createColumnHelper<Order>()

/**
 * The Orders table's columns. Module scope, so the array (and every column)
 * keeps its identity across renders. All behavior lives in `meta`: the
 * header, sorting, alignment and widths are read from it (docs/data-table.md).
 */
export const orderColumns = helper.columns([
  dataColumn(helper, 'id', {
    meta: { label: 'Order', width: { min: 120, ideal: 132 } },
    cell: (info) => <TextCell value={info.getValue()} muted />,
  }),
  dataColumn(helper, (order) => order.customer.name, {
    id: 'customer',
    meta: {
      label: 'Customer',
      sortField: 'customer',
      width: { min: 240, grow: true },
      // One CSV column per table column, so the export matches the screen.
      csv: (order) => `${order.customer.name} <${order.customer.email}>`,
    },
    cell: (info) => (
      <CustomerCell
        name={info.row.original.customer.name}
        email={info.row.original.customer.email}
      />
    ),
  }),
  dataColumn(helper, 'status', {
    meta: { label: 'Status', sortField: 'status', width: { min: 128, ideal: 140 } },
    cell: (info) => <StatusCell status={info.getValue()} />,
  }),
  dataColumn(helper, 'channel', {
    meta: { label: 'Channel', width: { min: 132, ideal: 144 } },
    cell: (info) => (
      <Badge variant="outline" tone="neutral">
        {CHANNEL_LABEL[info.getValue()]}
      </Badge>
    ),
  }),
  dataColumn(helper, 'itemCount', {
    meta: { label: 'Items', align: 'end', width: { min: 80, ideal: 88 } },
    cell: (info) => <span className="tabular">{formatNumber(info.getValue())}</span>,
  }),
  dataColumn(helper, 'amount', {
    meta: {
      label: 'Amount',
      align: 'end',
      sortField: 'amount',
      width: { min: 120, ideal: 136 },
      // A plain number with 2 decimals, no symbol, so spreadsheets can sum it.
      csv: (order) => order.amount.toFixed(2),
    },
    cell: (info) => <AmountCell value={info.getValue()} />,
  }),
  dataColumn(helper, 'createdAt', {
    // CSV: the ISO timestamp (the accessor value), unambiguous in any locale.
    meta: { label: 'Created', sortField: 'createdAt', width: { min: 148, ideal: 168 } },
    cell: (info) => <DateCell value={info.getValue()} showTime />,
  }),
])

export const getOrderRowId = (order: Order) => order.id
