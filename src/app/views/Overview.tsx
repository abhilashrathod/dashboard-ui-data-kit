import { Plus } from 'lucide-react'
import { Button, Select } from '@/components'
import { MetricsRange } from '@/contracts'
import { useDashRange } from '../navigation'
import { KPI_IDS, KpiCard } from '../widgets/KpiCard'
import { RecentOrders } from '../widgets/RecentOrders'
import { RevenueChart } from '../widgets/RevenueChart'
import { StatusBreakdown } from '../widgets/StatusBreakdown'

const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

const todayLabel = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function OverviewView() {
  const [range, setRange] = useDashRange()
  const now = new Date()

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-xl font-semibold">{greeting(now.getHours())}</h2>
          <p className="text-fg-muted">{todayLabel.format(now)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Period"
            value={range}
            onValueChange={(value) => {
              const parsed = MetricsRange.safeParse(value)
              if (parsed.success) setRange(parsed.data)
            }}
            options={RANGE_OPTIONS}
            className="w-40"
          />
          {/* TODO: open the new-order drawer (a later chunk). */}
          <Button leftIcon={<Plus />} onClick={() => {}}>
            New order
          </Button>
        </div>
      </div>

      <section aria-label="Key metrics" className="grid grid-cols-1 gap-grid sm:grid-cols-2 xl:grid-cols-4">
        {KPI_IDS.map((id) => (
          <KpiCard key={id} id={id} range={range} />
        ))}
      </section>

      <div className="grid grid-cols-1 gap-grid lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7 xl:col-span-8">
          <RevenueChart range={range} />
        </div>
        <div className="min-w-0 lg:col-span-5 xl:col-span-4">
          <StatusBreakdown range={range} />
        </div>
      </div>

      <RecentOrders />
    </>
  )
}
