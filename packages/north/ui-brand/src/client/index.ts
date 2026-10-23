/** North occupants for the generic browser-brand slots. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { northTheme } from './theme.ts'
import { HeroMark, NorthName, SidebarMark } from './Brand.tsx'
import { en, zh, type NorthBrandLocaleKey } from './locales.ts'

export type { NorthBrandLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** North product name. */
    'north.brand': NorthBrandLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'north.brand'

/** Required services: the UI slot registry, theme override registry, and locale dictionaries. */
export const inject = ['slots', 'theme', 'locale']

/**
 * Fill the sidebar and conversation-hero brand slots as one declaration-aware
 * registration set, independent of the client build profile.
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.theme.overrideTokens('@deepseek-ai/dsh-north-ui-brand', northTheme))
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'north-brand: dictionaries')
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.inject('sidebar.brand.name', () =>
      ctx.slots.inject('conversation.hero.brand.mark', function* () {
        yield ctx.slots.register({ name: 'sidebar.brand.mark' }, SidebarMark)
        yield ctx.slots.register({ name: 'sidebar.brand.name', locale: NS }, NorthName)
        yield ctx.slots.register({ name: 'conversation.hero.brand.mark' }, HeroMark)
      })))
}
