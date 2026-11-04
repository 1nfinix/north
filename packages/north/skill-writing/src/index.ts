/** Bundled Chinese office-writing skills for the North distribution. */

import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { isAbsolute, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { BUNDLED_SKILL_RANK, type SkillCandidate, type SkillProvider } from '@deepseek-ai/dsh-skill'
import { parseSkillFrontmatter, type SkillFrontmatter } from '@deepseek-ai/dsh-skill-filesystem'
import { registerNorthSkillsRoute } from './folder.ts'
import { NORTH_WRITING_PROVIDER, SKILL_NAMES } from './shared.ts'

export type * from './shared.ts'

export { NORTH_WRITING_PROVIDER, SKILL_NAMES }

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

/**
 * Parse one bundled skill with the filesystem skill provider's rules, the
 * same rules the settings section applies to user skills.
 * @throws when the file breaks a rule or declares a name other than its folder.
 */
function parseSkill(raw: string, path: string, folder: string): { frontmatter: SkillFrontmatter; content: string } {
  const parsed = parseSkillFrontmatter(raw)
  if (!parsed.ok) throw new Error(`skill-north-writing: ${path}: ${parsed.message}`)
  if (parsed.frontmatter.name !== folder) {
    throw new Error(`skill-north-writing: ${path} declares name "${parsed.frontmatter.name}"; it must match its folder "${folder}"`)
  }
  return { frontmatter: parsed.frontmatter, content: parsed.body.trim() }
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
      registerNorthSkillsRoute(scope, { userSkillRoot })
    })
  }
  const candidates: SkillCandidate[] = SKILL_NAMES.map((skillName) => {
    const directory = join(assetRoot, skillName)
    const path = join(directory, 'SKILL.md')
    const { name: _name, metadata, ...frontmatter } = parseSkill(readFileSync(path, 'utf8'), path, skillName).frontmatter
    return {
      name: skillName, ...frontmatter,
      provider: NORTH_WRITING_PROVIDER, source: 'bundled', rank: BUNDLED_SKILL_RANK,
      resourceBase: { kind: 'directory', path: directory.split(sep).join('/') }, locator: path,
      ...metadata === undefined ? {} : { metadata },
    }
  })
  const provider: SkillProvider = {
    name: NORTH_WRITING_PROVIDER,
    list: () => Promise.resolve(candidates),
    async get(candidate, options) {
      const { rank: _rank, locator, ...summary } = candidate
      const raw = await readFile(locator as string, { encoding: 'utf8', signal: options.signal })
      const { frontmatter, content } = parseSkill(raw, locator as string, candidate.name)
      return { ...summary, invocation: frontmatter.invocation, content }
    },
  }
  ctx.skills.registerProvider(() => provider)
}
