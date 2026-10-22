/** North deployment environment: data home, telemetry opt-out, and the admin-edited model file. */

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** File an administrator edits beside the installed executable's resources. */
export const NORTH_ENV_FILE = 'north.env'

/**
 * Parse `KEY=VALUE` lines; blank lines and `#` comments are skipped and one
 * pair of surrounding quotes is removed.
 * @param text - File contents.
 * @returns Variables in file order.
 */
export function parseNorthEnv(text: string): Record<string, string> {
  const variables: Record<string, string> = {}
  for (const raw of text.split(/\r?\n/u)) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    const at = line.indexOf('=')
    if (at <= 0) continue
    const key = line.slice(0, at).trim()
    let value = line.slice(at + 1).trim()
    if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]) value = value.slice(1, -1)
    variables[key] = value
  }
  return variables
}

/**
 * Fill unset variables before the Desktop resolves its paths and starts the Host.
 * Values already in the environment win, so Windows user variables override the file.
 * @param resourcesDir - Directory holding `north.env`: `process.resourcesPath` when packaged.
 * @param env - Environment to complete; defaults to the process environment.
 */
export function applyNorthEnvironment(resourcesDir: string, env: NodeJS.ProcessEnv = process.env): void {
  env.DSH_HOME ??= join(homedir(), '.north')
  env.DSH_TELEMETRY_DISABLED ??= '1'
  let text: string | undefined
  try {
    text = readFileSync(join(resourcesDir, NORTH_ENV_FILE), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.warn('north: cannot read north.env', error)
  }
  if (text !== undefined) {
    for (const [key, value] of Object.entries(parseNorthEnv(text))) env[key] ??= value
  }
  // A key that is always present keeps the Welcome sign-in window closed;
  // gateways started without --api-key ignore it.
  env.NORTH_LLM_API_KEY ??= 'EMPTY'
}
