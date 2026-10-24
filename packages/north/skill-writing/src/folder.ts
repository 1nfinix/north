/** Host route that lists the effective skill catalog and diagnoses the user skill folder for the browser settings section. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { mkdir, readdir, readFile, realpath, stat } from 'node:fs/promises'
import type { Stats } from 'node:fs'
import { extname, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { SkillCatalogSnapshot, SkillSummary, SkillViewOptions } from '@deepseek-ai/dsh-skill'
import { parseSkillFrontmatter, type SkillFrontmatterProblem } from '@deepseek-ai/dsh-skill-filesystem'
import {
  NORTH_SKILLS_PATH, type NorthEffectiveSkill, type NorthSkillInactiveEntry, type NorthSkillInvalidEntry, type NorthSkillProblem,
  type NorthSkillSummary, type NorthSkillsFailure, type NorthSkillsSnapshot,
} from './shared.ts'

/** Trust surface consumed here; the browser-side connection package owns the full type. */
interface NorthSkillsConnection {
  requestRejection(request: { readonly headers: IncomingMessage['headers'] }): 401 | 403 | undefined
}

/** The working-directory service member the route reads; `dsh-working-directory` owns the full type. */
interface DefaultWorkingDirectory {
  readonly defaultDirectory: string
}

/** The agent-preset registry member the route reads; `dsh-agent-preset-registry` owns the full type. */
interface PresetScopes {
  acquireScope(id?: string): Promise<{ key: NonNullable<SkillViewOptions['scope']> } & AsyncDisposable>
}

/** The user skill folder the route diagnoses. */
export interface NorthSkillFolderPaths {
  /** Absolute user skill folder; the filesystem skill provider scans it as its user DSH root. */
  readonly userSkillRoot: string
}

/** One usable user-folder skill and the file that declares it. */
interface FolderSkill {
  readonly entry: string
  readonly name: string
  readonly path: string
}

const PROBLEM: Record<SkillFrontmatterProblem, NorthSkillProblem> = {
  'invalid-yaml': 'invalid-frontmatter',
  'missing-frontmatter': 'invalid-frontmatter',
  'missing-name-or-description': 'invalid-frontmatter',
  'invalid-name': 'invalid-name',
  'invalid-invocation': 'invalid-invocation',
}

/**
 * Read one skill file with the filesystem skill provider's own rules.
 * @param raw - Complete skill file text.
 * @returns The catalog row, or why the provider skips the file.
 */
export function readSkillSummary(raw: string): NorthSkillSummary | { readonly problem: NorthSkillProblem } {
  const parsed = parseSkillFrontmatter(raw)
  if (!parsed.ok) return { problem: PROBLEM[parsed.problem] }
  const { name, description, invocation } = parsed.frontmatter
  return { name, description, invocation }
}

function classify(entry: string, path: string, raw: string): FolderSkill | NorthSkillInvalidEntry {
  const summary = readSkillSummary(raw)
  return 'problem' in summary ? { entry, problem: summary.problem } : { entry, name: summary.name, path }
}

/** Classify one top-level user-folder entry the way the filesystem skill provider discovers it. */
async function classifyEntry(path: string, entry: string, info: Stats): Promise<FolderSkill | NorthSkillInvalidEntry | undefined> {
  if (info.isDirectory()) {
    const file = join(path, 'SKILL.md')
    let raw: string
    try {
      raw = await readFile(file, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return { entry, problem: 'missing-skill-md' }
    }
    return classify(entry, file, raw)
  }
  if (!info.isFile() || !entry.endsWith('.md')) return undefined
  return classify(entry, path, await readFile(path, 'utf8'))
}

/**
 * Classify one entry; a failure confined to it becomes an `unreadable` row so
 * the rest of the folder still lists. An entry whose `stat` fails, such as a
 * symbolic link to a missing target, has no known type: it is reported unless
 * its extension is neither empty nor `.md`, since the provider never reads
 * such a file as a skill.
 */
async function readEntry(root: string, entry: string): Promise<FolderSkill | NorthSkillInvalidEntry | undefined> {
  const path = join(root, entry)
  let info: Stats
  try {
    info = await stat(path)
  } catch (_error: unknown) {
    // The row names the entry; the error text adds nothing the user can act on.
    const extension = extname(entry)
    return extension === '' || extension === '.md' ? { entry, problem: 'unreadable' } : undefined
  }
  try {
    return await classifyEntry(path, entry, info)
  } catch (_error: unknown) {
    // Only `readFile` throws here (frontmatter problems are return values); the row names the entry.
    return { entry, problem: 'unreadable' }
  }
}

/** Canonical path for comparing a registry path with a folder file; an unresolvable path compares as written. */
async function canonical(path: string): Promise<string> {
  try {
    return await realpath(path)
  } catch (_error: unknown) {
    // A path that cannot be resolved cannot name the same existing file; compare its text.
    return path
  }
}

function effectiveRow(skill: SkillSummary): NorthEffectiveSkill {
  const { name, description, invocation, source, provider, path } = skill
  return { name, description, invocation, source, provider, ...path === undefined ? {} : { path } }
}

/**
 * Build the route snapshot, creating the user folder when it does not exist yet.
 * @param paths - The user folder.
 * @param catalog - Reads the registry view to list; see {@link readDefaultCatalog}.
 * @returns The effective catalog plus the user folder's unusable and overridden entries.
 * @throws when the catalog or the user folder itself cannot be read; per-entry filesystem failures are rows of `invalid`.
 */
export async function readNorthSkills(
  paths: NorthSkillFolderPaths, catalog: () => Promise<SkillCatalogSnapshot>,
): Promise<NorthSkillsSnapshot> {
  const { skills, complete } = await catalog()
  const effective = skills.map(effectiveRow)
  await mkdir(paths.userSkillRoot, { recursive: true })
  // The provider skips `.system` in its user DSH root and reads every other entry, dotfiles included.
  const entries = (await readdir(paths.userSkillRoot)).filter(entry => entry !== '.system').sort()
  const invalid: NorthSkillInvalidEntry[] = []
  const inactive: NorthSkillInactiveEntry[] = []
  for (const result of await Promise.all(entries.map(entry => readEntry(paths.userSkillRoot, entry)))) {
    if (result === undefined) continue
    if ('problem' in result) {
      invalid.push(result)
      continue
    }
    const winner = effective.find(skill => skill.name === result.name)
    if (winner?.path !== undefined && await canonical(winner.path) === await canonical(result.path)) continue
    if (winner === undefined) {
      inactive.push({ entry: result.entry, name: result.name })
      continue
    }
    const { source, provider, path } = winner
    inactive.push({ entry: result.entry, name: result.name, winner: { source, provider, ...path === undefined ? {} : { path } } })
  }
  return { directory: paths.userSkillRoot, effective, complete, invalid, inactive }
}

/**
 * Read the registry view a new Session gets in the default working directory
 * with the default agent preset — the same `ctx.skills` call the Session
 * skill catalog makes for a Session without a live Agent, before it keeps the
 * user-invocable rows for the `/` menu.
 * @param ctx - Context carrying `skills` and, when mounted, `workingDirectory` and `agentPresets`.
 * @returns The sorted winning summaries and discovery completeness.
 */
export async function readDefaultCatalog(ctx: Context): Promise<SkillCatalogSnapshot> {
  const workingDirectory = ctx.get('workingDirectory') as DefaultWorkingDirectory | undefined
  const presets = ctx.get('agentPresets') as PresetScopes | undefined
  let lease: Awaited<ReturnType<PresetScopes['acquireScope']>> | undefined
  try {
    lease = await presets?.acquireScope()
  } catch (_error: unknown) {
    // As in the Session skill catalog, an unusable default preset falls back to the global registry view.
    lease = undefined
  }
  await using _lease = lease
  return await ctx.skills.snapshot({
    ...workingDirectory === undefined ? {} : { cwd: workingDirectory.defaultDirectory },
    ...lease === undefined ? {} : { scope: lease.key },
  })
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

/**
 * Serve `GET /north-skills` behind the connection's trust and authentication checks.
 * @param ctx - Scope holding the `webServer`, `connection`, and `skills` services.
 * @param paths - The user folder.
 */
export function registerNorthSkillsRoute(ctx: Context, paths: NorthSkillFolderPaths): void {
  const connection = Reflect.get(ctx, 'connection') as NorthSkillsConnection
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: NORTH_SKILLS_PATH,
    handler: async (req, res) => {
      const rejection = connection.requestRejection(req)
      if (rejection !== undefined) {
        res.statusCode = rejection
        res.end()
        return
      }
      if (req.method !== 'GET') {
        res.setHeader('allow', 'GET')
        sendJson(res, 405, { code: 'method-not-allowed', message: 'use GET' })
        return
      }
      try {
        sendJson(res, 200, await readNorthSkills(paths, () => readDefaultCatalog(ctx)))
      } catch (error) {
        ctx.logger.warn(`skill-north-writing: skills listing failed: ${String(error)}`)
        const failure: NorthSkillsFailure = { code: 'unreadable', message: String(error), directory: paths.userSkillRoot }
        sendJson(res, 500, failure)
      }
    },
  }), 'skill-north-writing: skills route')
}
