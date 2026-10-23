/** Host route that lists the bundled skills and the user skill folder for the browser settings section. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { mkdir, readdir, readFile, stat } from 'node:fs/promises'
import type { Stats } from 'node:fs'
import { extname, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { parseSkillFrontmatter, type SkillFrontmatterProblem } from '@deepseek-ai/dsh-skill-filesystem'
import {
  NORTH_SKILLS_PATH, type NorthSkillInvalidEntry, type NorthSkillProblem, type NorthSkillSummary, type NorthSkillsFailure,
  type NorthSkillsSnapshot,
} from './shared.ts'

/** Trust surface consumed here; the browser-side connection package owns the full type. */
interface NorthSkillsConnection {
  requestRejection(request: { readonly headers: IncomingMessage['headers'] }): 401 | 403 | undefined
}

/** Directories the route reads. */
export interface NorthSkillFolderPaths {
  /** Absolute directory holding the bundled `<name>/SKILL.md` folders. */
  readonly assetRoot: string
  /** Bundled skill folder names in catalog order. */
  readonly bundledNames: readonly string[]
  /** Absolute user skill folder scanned by the filesystem skill provider. */
  readonly userSkillRoot: string
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

function classify(entry: string, raw: string): NorthSkillSummary | NorthSkillInvalidEntry {
  const summary = readSkillSummary(raw)
  return 'problem' in summary ? { entry, problem: summary.problem } : summary
}

/** Classify one top-level user-folder entry the way the filesystem skill provider discovers it. */
async function classifyEntry(path: string, entry: string, info: Stats): Promise<NorthSkillSummary | NorthSkillInvalidEntry | undefined> {
  if (info.isDirectory()) {
    let raw: string
    try {
      raw = await readFile(join(path, 'SKILL.md'), 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return { entry, problem: 'missing-skill-md' }
    }
    return classify(entry, raw)
  }
  if (!info.isFile() || !entry.endsWith('.md')) return undefined
  return classify(entry, await readFile(path, 'utf8'))
}

/**
 * Classify one entry; a failure confined to it becomes an `unreadable` row so
 * the rest of the folder still lists. An entry whose `stat` fails, such as a
 * symbolic link to a missing target, has no known type: it is reported unless
 * its extension is neither empty nor `.md`, since the provider never reads
 * such a file as a skill.
 */
async function readEntry(root: string, entry: string): Promise<NorthSkillSummary | NorthSkillInvalidEntry | undefined> {
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

/**
 * Build the route snapshot, creating the user folder when it does not exist yet.
 * @param paths - Bundled assets and the user folder.
 * @returns Bundled skills, usable user skills, and unusable user entries.
 * @throws when a bundled skill or the user folder itself cannot be read; per-entry filesystem failures are rows of `invalid`.
 */
export async function readNorthSkills(paths: NorthSkillFolderPaths): Promise<NorthSkillsSnapshot> {
  const bundled = await Promise.all(paths.bundledNames.map(async (name) => {
    const summary = readSkillSummary(await readFile(join(paths.assetRoot, name, 'SKILL.md'), 'utf8'))
    if ('problem' in summary) throw new Error(`skill-north-writing: bundled skill ${name} is not a usable skill (${summary.problem})`)
    return summary
  }))
  await mkdir(paths.userSkillRoot, { recursive: true })
  const entries = (await readdir(paths.userSkillRoot)).filter(entry => !entry.startsWith('.')).sort()
  const folder: NorthSkillSummary[] = []
  const invalid: NorthSkillInvalidEntry[] = []
  for (const result of await Promise.all(entries.map(entry => readEntry(paths.userSkillRoot, entry)))) {
    if (result === undefined) continue
    if ('problem' in result) invalid.push(result)
    else folder.push(result)
  }
  folder.sort((a, b) => a.name.localeCompare(b.name))
  return { directory: paths.userSkillRoot, bundled, folder, invalid }
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

/**
 * Serve `GET /north-skills` behind the connection's trust and authentication checks.
 * @param ctx - Scope holding the `webServer` and `connection` services.
 * @param paths - Bundled assets and the user folder.
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
        sendJson(res, 200, await readNorthSkills(paths))
      } catch (error) {
        ctx.logger.warn(`skill-north-writing: skills listing failed: ${String(error)}`)
        const failure: NorthSkillsFailure = { code: 'unreadable', message: String(error), directory: paths.userSkillRoot }
        sendJson(res, 500, failure)
      }
    },
  }), 'skill-north-writing: skills route')
}
