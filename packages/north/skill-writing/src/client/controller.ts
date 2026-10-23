/** Browser calls behind the skills settings section: the listing route and the file-manager launch. */

import {
  OPEN_IN_APP_APPS_PATH, OPEN_IN_APP_OPEN_PATH, type OpenInAppAppsPayload,
} from '@deepseek-ai/dsh-host-open-in-app/shared'
import { NORTH_SKILLS_PATH, type NorthSkillsSnapshot } from '../shared.ts'

/** `fetch`-compatible carrier; tests substitute it. Routes are document-relative so a path-prefixed deployment keeps working. */
export type Fetch = (input: string, init?: RequestInit) => Promise<Response>

/** Outcome of an open-folder request. */
export type OpenFolderOutcome = 'opened' | 'unavailable' | 'failed'

/** File managers the open-in-app catalog offers, in preference order. */
const FILE_MANAGERS = ['finder', 'explorer'] as const

/** A non-2xx listing answer; `directory` is the user folder when the route's 500 body names it. */
export class NorthSkillsLoadError extends Error {
  /**
   * @param status - HTTP status of the listing answer.
   * @param directory - User skill folder from the failure body, when present.
   */
  constructor(readonly status: number, readonly directory: string | undefined) {
    super(`north-skills: HTTP ${String(status)}`)
    this.name = 'NorthSkillsLoadError'
  }
}

/** Read `directory` from a failure body; any other body (proxy page, empty, wrong field type) yields `undefined`. */
async function failureDirectory(response: Response): Promise<string | undefined> {
  let body: unknown
  try {
    body = await response.json()
  } catch (_error: unknown) {
    // Not JSON, e.g. a proxy error page: no folder to offer.
    return undefined
  }
  if (typeof body !== 'object' || body === null || !('directory' in body)) return undefined
  return typeof body.directory === 'string' ? body.directory : undefined
}

/**
 * Read the bundled skills and the user skill folder.
 * @param fetcher - HTTP carrier.
 * @returns The route snapshot.
 * @throws {NorthSkillsLoadError} when the route answers with a non-2xx status.
 */
export async function loadNorthSkills(fetcher: Fetch): Promise<NorthSkillsSnapshot> {
  const response = await fetcher(NORTH_SKILLS_PATH.slice(1))
  if (!response.ok) throw new NorthSkillsLoadError(response.status, await failureDirectory(response))
  return await response.json() as NorthSkillsSnapshot
}

/**
 * Open a directory in the platform file manager through the open-in-app routes.
 * @param fetcher - HTTP carrier.
 * @param directory - Absolute directory to open.
 * @returns `unavailable` when no file manager is offered, `failed` when a route rejects.
 */
export async function openFolder(fetcher: Fetch, directory: string): Promise<OpenFolderOutcome> {
  const apps = await fetcher(OPEN_IN_APP_APPS_PATH.slice(1))
  if (!apps.ok) return 'unavailable'
  const offered = (await apps.json() as OpenInAppAppsPayload).apps
  const app = FILE_MANAGERS.find(id => offered.includes(id))
  if (app === undefined) return 'unavailable'
  const opened = await fetcher(OPEN_IN_APP_OPEN_PATH.slice(1), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ app, path: directory }),
  })
  return opened.ok ? 'opened' : 'failed'
}
