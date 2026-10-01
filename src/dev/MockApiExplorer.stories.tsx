import { expect } from 'storybook/test'
import preview, { type NetworkParameter } from '../../.storybook/preview'
import { MockApiExplorer } from './MockApiExplorer'

const meta = preview.meta({
  title: 'Dev/Mock API',
  component: MockApiExplorer,
})

export const Default = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'List orders' }))
    // Latency is realistic (150–600ms), hence the timeouts.
    await expect(await canvas.findByText('200', {}, { timeout: 3000 })).toBeVisible()
    await expect(await canvas.findByText(/"id": "ORD-/, {}, { timeout: 3000 })).toBeVisible()
  },
})

/** Only the KPI endpoint fails; everything else works. Wins over the Network toolbar. */
export const KpisFailing = meta.story({
  parameters: { network: { failEndpoints: ['metrics.kpis'] } satisfies NetworkParameter },
})

export const Empty = meta.story({
  parameters: { network: { mode: 'empty' } satisfies NetworkParameter },
})
