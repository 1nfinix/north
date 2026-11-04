/** North-only colour overrides; shared menu materials and semantic status colours remain theme-owned. */
import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'

/** Paired light/dark values applied for the lifetime of the North brand plugin. */
export const northTheme: ThemeTokenOverrides = {
  '--dsw-alias-button-send-fill': { light: '#111827', dark: '#E5E7EB' },
  '--dsw-alias-button-send-hover': { light: '#263244', dark: '#CBD5E1' },
  '--dsw-alias-button-send-label': { light: '#FFFFFF', dark: '#111827' },
  '--dsw-alias-bg-base': { light: '#FFFFFF', dark: '#17191D' },
  '--dsw-alias-bg-layer-1': { light: '#FFFFFF', dark: '#22252B' },
  '--dsw-alias-bg-layer-2': { light: '#FFFFFF', dark: '#22252B' },
  '--dsw-alias-bg-layer-3': { light: '#FFFFFF', dark: '#22252B' },
  '--dsw-specific-sidebar-fill': { light: '#F3F5F7', dark: '#121418' },
  '--dsw-specific-input-major': { light: '#FFFFFF', dark: '#22252B' },
  '--dsw-alias-label-primary': { light: '#111827', dark: '#F3F4F6' },
  '--dsw-alias-label-secondary': { light: '#475569', dark: '#B4BDC9' },
  '--dsw-alias-label-tertiary': { light: '#475569', dark: '#B4BDC9' },
  // Captions include the composer placeholder; both schemes keep 4.5:1 on every North surface.
  '--dsw-alias-label-caption': { light: '#5F6B7A', dark: '#959DAA' },
  '--dsw-alias-border-l2': { light: '#D9DEE7', dark: '#3A414C' },
  '--dsw-alias-button-primary-fill': { light: '#111827', dark: '#E5E7EB' },
  '--dsw-alias-button-primary-hover': { light: '#263244', dark: '#CBD5E1' },
  '--dsw-alias-label-primary-foreground': { light: '#FFFFFF', dark: '#111827' },
  '--dsw-alias-label-primary-inverted': { light: '#FFFFFF', dark: '#111827' },
  '--dsw-alias-link': { light: '#1D4ED8', dark: '#8AB4FF' },
  '--dsw-focus-ring-color': { light: '#1D4ED8', dark: '#8AB4FF' },
  '--dsw-alias-interactive-bg-hover': { light: '#E8ECF1', dark: '#2B3038' },
  '--dsw-alias-interactive-bg-hover-solid': { light: '#E8ECF1', dark: '#2B3038' },
  '--dsw-specific-sidebar-nav-item-hover': { light: '#E8ECF1', dark: '#2B3038' },
  '--dsw-specific-sidebar-nav-item-active': { light: '#EAF0FC', dark: '#24344D' },
  '--dsw-specific-sidebar-nav-item-active-accent': { light: '#EAF0FC', dark: '#24344D' },
  '--dsw-alias-interactive-bg-active': { light: '#EAF0FC', dark: '#24344D' },
}
