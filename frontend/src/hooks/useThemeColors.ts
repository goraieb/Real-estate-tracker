import { useStore } from '../store/useStore';

const LIGHT_COLORS = {
  green: '#10b981',
  blue: '#3b82f6',
  orange: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1',
  indigoFill: '#e0e7ff',
  muted: '#64748b',
  grid: '#e2e8f0',
  text: '#334155',
  textMuted: '#64748b',
  refLine: '#10b981',
};

const DARK_COLORS = {
  green: '#50fa7b',
  blue: '#8be9fd',
  orange: '#ffb86c',
  red: '#ff5555',
  purple: '#bd93f9',
  pink: '#ff79c6',
  indigo: '#bd93f9',
  indigoFill: 'rgba(189, 147, 249, 0.2)',
  muted: '#6272a4',
  grid: '#44475a',
  text: '#e2e4f0',
  textMuted: '#8b8fad',
  refLine: '#50fa7b',
};

export type ThemeColors = typeof LIGHT_COLORS;

export function useThemeColors(): ThemeColors {
  const theme = useStore(s => s.theme);
  return theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
}

export function getChartColorArray(theme: 'light' | 'dark'): string[] {
  const c = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  return [c.green, c.orange, c.red, c.indigo, c.purple, c.pink];
}
