import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FieldChart } from './FieldChart'
import type { CustomField, FieldValue } from '../../lib/database.types'

vi.mock('recharts', async importOriginal => ({
  ...(await importOriginal<typeof import('recharts')>()),
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div style={{ width: 400, height: 200 }}>{children}</div>
  ),
}))

const field = (over: Partial<CustomField>): CustomField => ({
  id: 'f1', user_id: 'u1', name: 'Stress', type: 'slider',
  config: { min: 1, max: 10 }, sort_order: 0, active: true,
  show_in_charts: true, created_at: '', ...over,
})
const value = (over: Partial<FieldValue>): FieldValue => ({
  id: 'v1', user_id: 'u1', field_id: 'f1', date: '2026-07-01', value: 5, created_at: '', ...over,
})

describe('FieldChart', () => {
  it('renders a titled card for a slider field', () => {
    render(<FieldChart field={field({})} values={[value({})]} />)
    expect(screen.getByText('Stress')).toBeInTheDocument()
  })

  it('shows a days count header for toggle fields', () => {
    const f = field({ type: 'toggle', config: {}, name: 'Meditated' })
    const vals = [
      value({ id: 'v1', date: '2026-07-01', value: true }),
      value({ id: 'v2', date: '2026-07-02', value: false }),
    ]
    render(<FieldChart field={f} values={vals} />)
    expect(screen.getByText('1/2 days')).toBeInTheDocument()
  })

  it('renders tag frequencies for tags fields', () => {
    const f = field({ type: 'tags', config: { options: ['work', 'family'] }, name: 'Triggers' })
    const vals = [
      value({ id: 'v1', date: '2026-07-01', value: ['work'] }),
      value({ id: 'v2', date: '2026-07-02', value: ['work', 'family'] }),
    ]
    render(<FieldChart field={f} values={vals} />)
    expect(screen.getByText('work')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders nothing for text fields and empty data', () => {
    const { container: a } = render(
      <FieldChart field={field({ type: 'text', config: {} })} values={[value({ value: 'x' })]} />
    )
    expect(a).toBeEmptyDOMElement()
    const { container: b } = render(<FieldChart field={field({})} values={[]} />)
    expect(b).toBeEmptyDOMElement()
  })
})
