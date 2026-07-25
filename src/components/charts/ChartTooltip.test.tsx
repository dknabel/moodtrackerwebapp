import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ChartTooltip } from './ChartTooltip'

describe('ChartTooltip', () => {
  it('renders nothing when inactive', () => {
    const { container } = render(<ChartTooltip active={false} payload={[{ name: 'Mood', value: 7 }]} label="07-20" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders label and mono values when active', () => {
    render(<ChartTooltip active payload={[{ name: 'Mood', value: 7, color: '#FF9E40' }]} label="07-20" />)
    expect(screen.getByText('07-20')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Mood')).toBeInTheDocument()
  })

  it('appends the unit when given', () => {
    render(<ChartTooltip active unit="h" payload={[{ name: 'Hours', value: 7.5 }]} />)
    expect(screen.getByText('7.5h')).toBeInTheDocument()
  })
})
