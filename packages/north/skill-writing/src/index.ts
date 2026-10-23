/** Bundled Chinese office-writing skills for the North distribution. */

import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { isAbsolute, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { BUNDLED_SKILL_RANK, type SkillCandidate, type SkillProvider } from '@deepseek-ai/dsh-skill'
import { parse as parseYaml } from 'yaml'
import { registerNorthSkillsRoute } from './folder.ts'

export type * from './shared.ts'

/** Skill folders under the assets root, in catalog order. */
export const SKILL_NAMES = [
  'weekly-report', 'meeting-minutes', 'official-notice', 'email-draft', 'translation', 'long-summary',
] as const

/** Writing skill resource location and the user skill folder the settings section lists. */
export interface Config {
  /** Absolute assets directory containing skill folders; defaults to packaged assets. */
  assetRoot?: string
  /**
   * Absolute user skill folder served by `GET /north-skills` once the Host
   * provides `webServer` and `connection`; omitted, no route is registered.
   */
  userSkillRoot?: string
}

/** Validated resource configuration. */
export const Config: z<Config> = z.object({
  assetRoot: z.string().min(1),
  userSkillRoot: z.string().min(1),
})

/** Cordis plugin identity. */
export const name = 'skill-north-writing'
/** Registry used by the bundled provider. */
export const inject = ['skills']

const PROVIDER = 'north-writing'

function parseSkill(raw: string, path: string): { description: string; content: string } {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(raw)
  if (frontmatter?.[1] === undefined) throw new Error(`skill-north-writing: ${path} has no YAML frontmatter`)
  const metadata: unknown = parseYaml(frontmatter[1])
  const description = typeof metadata === 'object' && metadata !== null && 'description' in metadata
    ? metadata.description : undefined
  if (typeof description !== 'string' || description.length === 0) throw new Error(`skill-north-writing: ${path} has no description`)
  return { description, content: raw.slice(frontmatter[0].length).trim() }
}

/**
 * Register the writing skills as one bundled provider and, when configured, the skills listing route.
 * @param ctx - Context carrying the skill registry.
 * @param config - Optional external assets directory and user skill folder.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const assetRoot = config.assetRoot ?? fileURLToPath(new URL('../assets/', import.meta.url))
  if (!isAbsolute(assetRoot)) throw new Error('skill-north-writing: assetRoot must be an absolute directory')
  const userSkillRoot = config.userSkillRoot
  if (userSkillRoot !== undefined) {
    if (!isAbsolute(userSkillRoot)) throw new Error('skill-north-writing: userSkillRoot must be an absolute directory')
    ctx.inject(['webServer', 'connection'], (scope) => {
      registerNorthSkillsRoute(scope, { assetRoot, bundledNames: SKILL_NAMES, userSkillRoot })
    })
  }
  const candidates: SkillCandidate[] = SKILL_NAMES.map((skillName) => {
    const directory = join(assetRoot, skillName)
    const path = join(directory, 'SKILL.md')
    const { description } = parseSkill(readFileSync(path, 'utf8'), path)
    return {
      name: skillName, description,
      invocation: { modelInvocable: true, userInvocable: true },
      provider: PROVIDER, source: 'bundled', rank: BUNDLED_SKILL_RANK,
      resourceBase: { kind: 'directory', path: directory.split(sep).join('/') }, locator: path,
    }
  })
  const provider: SkillProvider = {
    name: PROVIDER,
    list: () => Promise.resolve(candidates),
    async get(candidate, options) {
      const { rank: _rank, locator, ...summary } = candidate
      const raw = await readFile(locator as string, { encoding: 'utf8', signal: options.signal })
      return { ...summary, content: parseSkill(raw, locator as string).content }
    },
  }
  ctx.skills.registerProvider(() => provider)
}
