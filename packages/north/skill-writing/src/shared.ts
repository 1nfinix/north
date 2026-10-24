/** Wire contract of the North skills route, shared by the Host route and the browser settings section. */

/** Bundled skill folder names under the assets root, in catalog order. */
export const SKILL_NAMES = [
  'weekly-report', 'meeting-minutes', 'official-notice', 'email-draft', 'translation', 'long-summary',
] as const

/** One bundled skill's folder and frontmatter name. */
export type NorthBundledSkillName = typeof SKILL_NAMES[number]

/** Authenticated GET route listing the bundled skills and the user skill folder. */
export const NORTH_SKILLS_PATH = '/north-skills'

/** Resolved `disable-model-invocation` and `user-invocable` frontmatter keys, as the skill registry applies them. */
export interface NorthSkillInvocation {
  /** Whether the model may load the skill when its description matches a request. */
  readonly modelInvocable: boolean
  /** Whether the `/` command menu offers the skill; the session `skills/list` catalog drops it otherwise. */
  readonly userInvocable: boolean
}

/** One skill's catalog row. */
export interface NorthSkillSummary {
  /** Skill name from the frontmatter; users invoke it as `/<name>` only when `invocation.userInvocable`. */
  readonly name: string
  /** Frontmatter description the model matches requests against. */
  readonly description: string
  /** Who may invoke the skill. */
  readonly invocation: NorthSkillInvocation
}

/**
 * Why a user-folder entry is not a usable skill. `unreadable` covers an entry
 * the route cannot inspect, such as a symbolic link to a missing target.
 */
export type NorthSkillProblem = 'missing-skill-md' | 'invalid-frontmatter' | 'invalid-name' | 'invalid-invocation' | 'unreadable'

/** A user-folder entry the skill loader cannot use. */
export interface NorthSkillInvalidEntry {
  /** File or directory name inside the user skill folder. */
  readonly entry: string
  /** Reason the entry is skipped. */
  readonly problem: NorthSkillProblem
}

/** Provider name of the bundled writing skills in the skill registry. */
export const NORTH_WRITING_PROVIDER = 'north-writing'

/** Where the skill registry resolved a skill from. */
export interface NorthSkillOrigin {
  /** Registry source, such as `project-dsh`, `project-agents`, `custom`, `user-dsh`, `user-agents`, `runtime`, or `bundled`. */
  readonly source: string
  /** Name of the provider that supplied the skill, such as `filesystem` or {@link NORTH_WRITING_PROVIDER}. */
  readonly provider: string
  /** Absolute skill file path when the provider reports one. */
  readonly path?: string
}

/** One skill that wins its name in the registry, with its origin. */
export interface NorthEffectiveSkill extends NorthSkillSummary, NorthSkillOrigin {}

/** A usable user-folder skill that the registry does not resolve to this file. */
export interface NorthSkillInactiveEntry {
  /** File or directory name inside the user skill folder. */
  readonly entry: string
  /** Skill name the entry declares. */
  readonly name: string
  /** The skill that wins the name instead; absent when no registry source resolves the name. */
  readonly winner?: NorthSkillOrigin
}

/** `GET /north-skills` 500 response body: the skill catalog or the user folder itself could not be read. */
export interface NorthSkillsFailure {
  readonly code: 'unreadable'
  /** Error text for diagnosis; the section does not show it. */
  readonly message: string
  /** Configured user skill folder, so the section can still show and open it. */
  readonly directory: string
}

/** `GET /north-skills` 200 response body. */
export interface NorthSkillsSnapshot {
  /** Absolute user skill folder; the route creates it when missing. */
  readonly directory: string
  /**
   * Winning skills, sorted by name, for a new Session in the default working
   * directory with the default agent preset: the registry view whose
   * user-invocable rows the `/` menu offers.
   */
  readonly effective: readonly NorthEffectiveSkill[]
  /** Whether every skill provider completed discovery; `false` means `effective` can be missing skills. */
  readonly complete: boolean
  /** User-folder entries that are not usable skills, sorted by entry name. */
  readonly invalid: readonly NorthSkillInvalidEntry[]
  /** Usable user-folder skills that another skill overrides, sorted by entry name. */
  readonly inactive: readonly NorthSkillInactiveEntry[]
}
