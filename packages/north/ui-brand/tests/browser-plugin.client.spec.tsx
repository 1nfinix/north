// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi, onTestFinished } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { ThemeRuntime } from '@deepseek-ai/dsh-client-ui-theme/client'
import { stubConfigForm } from '@deepseek-ai/dsh-client-test-runtime'
import type { ThemeSettings } from '@deepseek-ai/dsh-client-ui-theme/client'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject, NS } from '../src/client/index.ts'
import { HeroMark, NorthName, SidebarMark } from '../src/client/Brand.tsx'
import { apply as hostApply } from '../src/index.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const HOLES = [
  'sidebar.brand.mark',
  'sidebar.brand.name',
  'conversation.hero.brand.mark',
] as const

async function bench(declare = true) {
  const ctx = new Context()
  onTestFinished(() => ctx.fiber.dispose())
  const theme = new ThemeRuntime(ctx, stubConfigForm<ThemeSettings>().scope)
  ctx.provide('theme', theme)
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('zh')
  ctx.provide('locale', locale)
  await ctx.plugin(SlotRegistry).await()
  const slots = ctx.get('slots') as SlotRegistry
  const declareHoles = () => slots.register({
    name: 'root',
    children: Object.fromEntries(HOLES.map(name => [name, { kind: 'single', scope: 'root' }])),
  } as never, () => null)
  const disposeHoles = declare ? declareHoles() : undefined
  return { ctx, theme, locale, slots, declareHoles, disposeHoles }
}

describe('North browser-brand plugin', () => {
  it('keeps the host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('declares the slot, theme and locale services it uses', () => {
    expect(inject).toEqual(['slots', 'theme', 'locale'])
  })

  it('serves the product name from its dictionary and withdraws it on unload', async () => {
    const { ctx, locale, slots } = await bench()
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(slots.entries('sidebar.brand.name')[0]!.locale).toBe(NS)
    expect(locale.bind(NS)('name')).toBe('North')
    expect(locale.bind(NS)('localName')).toBe('诺思')
    await fiber.dispose()
    expect(locale.bind(NS)('localName')).not.toBe('诺思')
  })

  it('fills every brand slot before or after declaration and removes every occupant on teardown', async () => {
    const before = await bench()
    const fiber = before.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    for (const hole of HOLES) expect(before.slots.entries(hole)).toHaveLength(1)

    before.disposeHoles?.()
    for (const hole of HOLES) expect(before.slots.entries(hole)).toHaveLength(0)
    before.declareHoles()
    await Promise.resolve()
    for (const hole of HOLES) expect(before.slots.entries(hole)).toHaveLength(1)

    await fiber.dispose()
    for (const hole of HOLES) expect(before.slots.entries(hole)).toHaveLength(0)

    const after = await bench(false)
    await after.ctx.plugin({ inject: [...inject], apply }).await()
    for (const hole of HOLES) expect(after.slots.entries(hole)).toHaveLength(0)
    after.declareHoles()
    await Promise.resolve()
    for (const hole of HOLES) expect(after.slots.entries(hole)).toHaveLength(1)
  })

  it('overrides both schemes without changing preferences and restores the base on unload', async () => {
    const { ctx, theme } = await bench()
    const base = theme.getTheme()
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(theme.getTheme().preference).toBe(base.preference)
    expect(theme.getTheme().active.tokens['--dsw-specific-sidebar-fill']).toBe('#F3F5F7')
    theme.setTheme('dark')
    expect(theme.getTheme().active.tokens['--dsw-alias-bg-base']).toBe('#17191D')
    expect(theme.getTheme().active.tokens['--dsw-alias-label-primary']).toBe('#F3F4F6')
    theme.setTheme('light')
    expect(theme.getTheme().active.tokens['--dsw-alias-link']).toBe('#1D4ED8')
    await fiber.dispose()
    expect(theme.getTheme().active.tokens).toEqual(base.active.tokens)
    expect(theme.getTheme().preference).toBe('light')
  })

  it('follows system changes while North is mounted', async () => {
    const listeners = new Set<() => void>()
    const media = {
      matches: false,
      addEventListener: (_: string, listener: () => void) => { listeners.add(listener) },
      removeEventListener: (_: string, listener: () => void) => { listeners.delete(listener) },
    }
    vi.stubGlobal('matchMedia', () => media)
    const { ctx, theme } = await bench()
    await ctx.plugin({ inject: [...inject], apply }).await()
    media.matches = true
    for (const listener of listeners) listener()
    expect(theme.getTheme().preference).toBe('system')
    expect(theme.getTheme().active.tokens['--dsw-alias-link']).toBe('#8AB4FF')
  })

  it('renders the mark at each requested edge with the hero class and the bilingual name', () => {
    const sidebar = render(<SidebarMark size={24} />)
    expect(sidebar.container.querySelector('svg')?.getAttribute('width')).toBe('24')
    expect(sidebar.container.querySelector('path')?.getAttribute('fill')).toBe('currentColor')
    sidebar.unmount()

    const hero = render(<HeroMark size={34} className="hero" />)
    expect(hero.container.querySelector('svg')?.getAttribute('width')).toBe('34')
    expect(hero.container.querySelector('svg')?.getAttribute('class')).toBe('hero')
    hero.unmount()

    const t = (key: 'name' | 'localName') => ({ name: 'North', localName: '诺思' })[key]
    expect(render(<NorthName t={t as never} />).container.textContent).toBe('North诺思')
  })
})

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
}

it('keeps normal text and keyboard focus readable on North surfaces', async () => {
  const { ctx, theme } = await bench()
  await ctx.plugin({ inject: [...inject], apply }).await()
  for (const scheme of ['light', 'dark']) {
    theme.setTheme(scheme)
    const tokens = theme.getTheme().active.tokens
    const contrast = (foreground: string, background: string) => {
      const a = luminance(tokens[foreground]!)
      const b = luminance(tokens[background]!)
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    }
    for (const surface of ['--dsw-alias-bg-base', '--dsw-specific-sidebar-fill', '--dsw-alias-bg-layer-1', '--dsw-alias-interactive-bg-active', '--dsw-alias-interactive-bg-hover']) {
      for (const label of ['--dsw-alias-label-primary', '--dsw-alias-label-secondary', '--dsw-alias-label-tertiary', '--dsw-alias-label-caption', '--dsw-alias-link']) {
        expect(contrast(label, surface), `${scheme}: ${label} on ${surface}`).toBeGreaterThanOrEqual(4.5)
      }
      expect(contrast('--dsw-focus-ring-color', surface)).toBeGreaterThanOrEqual(3)
    }
    for (const fill of ['--dsw-alias-button-primary-fill', '--dsw-alias-button-primary-hover']) {
      expect(contrast('--dsw-alias-label-primary-foreground', fill)).toBeGreaterThanOrEqual(4.5)
    }
  }
})
