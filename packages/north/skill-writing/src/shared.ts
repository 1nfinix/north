/** Wire contract of the North skills route, shared by the Host route and the browser settings section. */

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

/** `GET /north-skills` 500 response body: a bundled skill or the user folder itself could not be read. */
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
  /** Skills shipped in this package, in catalog order. */
  readonly bundled: readonly NorthSkillSummary[]
  /** Usable skills in the user folder, sorted by name. */
  readonly folder: readonly NorthSkillSummary[]
  /** User-folder entries that are not usable skills, sorted by entry name. */
  readonly invalid: readonly NorthSkillInvalidEntry[]
}
