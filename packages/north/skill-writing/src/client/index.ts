/**
 * North skills settings section, browser half: lists the built-in writing
 * skills and the user skill folder served by `GET /north-skills`, and opens
 * that folder in the platform file manager so users add skills by copying
 * folders into it.
 */

// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the settings shell's SlotMap merge (the 'settings.section' entry).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { loadNorthSkills, openFolder, type Fetch } from './controller.ts'
import { en, zh, type NorthSkillsLocaleKey } from './locales.ts'
import { NorthSkillsSection } from './SkillsSection.tsx'

export type { NorthSkillsSectionInjected, NorthSkillsSectionProps } from './SkillsSection.tsx'
export type { NorthSkillsLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** North skills settings section copy. */
    'north.skills': NorthSkillsLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'north.skills'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale']

/** Same-origin carrier; the Host authenticates the browser session. */
const browserFetch: Fetch = (input, init) => fetch(input, init)

/**
 * Mount the skills settings section.
 * @param ctx - The browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'north-skills: dictionaries')
  // One stable face: the section reloads whenever `load` changes identity.
  const injected = {
    load: () => loadNorthSkills(browserFetch),
    open: (directory: string) => openFolder(browserFetch, directory),
  }
  // Ordered after Agent presets (20): skills extend what a preset can do.
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'north-skills',
    order: 25,
    label: () => t('nav'),
    locale: NS,
    inject: () => injected,
  }, NorthSkillsSection))
}
