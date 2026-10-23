/** What the browser half registers, that its face calls the Host routes, and that it all leaves with the fiber. */

import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveSlotLabel } from '@deepseek-ai/dsh-client-ui-slots'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject, NS, type NorthSkillsSectionInjected } from '../src/client/index.ts'

afterEach(() => { vi.unstubAllGlobals() })

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('zh')
  ctx.provide('locale', locale)
  const slots = ctx.get('slots') as SlotRegistry
  slots.register({ name: 'root', children: { 'settings.section': { kind: 'list', scope: 'root' } } } as never, () => null)
  return { ctx, slots, locale }
}

describe('north skills section apply', () => {
  it('declares the services it uses', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })

  it('registers one Skills section whose face reaches the Host routes, and removes it on dispose', async () => {
    const { ctx, slots, locale } = await bench()
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const section = slots.entries('settings.section')[0]!
    expect(section.options).toMatchObject({ id: 'north-skills', order: 25 })
    expect(resolveSlotLabel(section.options.label)).toBe('技能')
    expect(locale.bind(NS)('open')).toBe('打开文件夹')

    const fetch = vi.fn((input: string) => Promise.resolve(new Response(
      JSON.stringify(input === 'open-in-app/apps' ? { apps: [] } : { directory: '/s', bundled: [], folder: [], invalid: [] }),
      { status: 200 },
    )))
    vi.stubGlobal('fetch', fetch)
    const read: () => NorthSkillsSectionInjected = section.inject as never
    const face = read()
    expect(face).toBe(read())
    await expect(face.load()).resolves.toMatchObject({ directory: '/s' })
    await expect(face.open('/s')).resolves.toBe('unavailable')
    expect(fetch.mock.calls.map(call => call[0])).toEqual(['north-skills', 'open-in-app/apps'])

    await fiber.dispose()
    expect(slots.entries('settings.section')).toEqual([])
    await ctx.fiber.dispose()
  })
})
