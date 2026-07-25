// Mirrors the @theme tokens in src/index.css. recharts needs real hexes for
// SVG fills, so keep this in lockstep with the CSS (the test pins the values).
export const CHART_COLORS = {
  series: ['#FF9E40', '#5FA8C7', '#D9A24A'] as const,
  grid: { light: '#E3E3DE', dark: '#262A31' },
  tick: { light: '#9A9C9F', dark: '#69707A' },
  barInactive: { light: '#E3E3DE', dark: '#262A31' },
  barActive: '#FF9E40',
  sleepHours: '#5FA8C7',
  sleepQuality: '#FF9E40',
}
