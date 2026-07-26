// recharts needs real hexes for SVG fills. `series` is the categorical palette
// for multi-series charts (Compare overlay): hue-separated steps tuned for the
// dark theme, [0] stays the brand signal. Other keys mirror the @theme tokens
// in src/index.css — keep them in lockstep (the test pins the values).
export const CHART_COLORS = {
  series: [
    '#FF9E40', // signal orange (brand)
    '#5FA8C7', // steel blue
    '#7BC98C', // green
    '#B493E8', // violet
    '#E06C7D', // rose
    '#4EC9B0', // teal
    '#E8D44D', // yellow
    '#E87AB8', // pink
  ] as const,
  grid: { light: '#E3E3DE', dark: '#262A31' },
  tick: { light: '#9A9C9F', dark: '#69707A' },
  barInactive: { light: '#E3E3DE', dark: '#262A31' },
  barActive: '#FF9E40',
  sleepHours: '#5FA8C7',
  sleepQuality: '#FF9E40',
}
