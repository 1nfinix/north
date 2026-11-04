/** North deployment environment: data home, telemetry opt-out, and the admin-edited model file. */

import { existsSync, readFileSync } from 'node:fs'
import { homedir, networkInterfaces } from 'node:os'
import { join, posix, win32 } from 'node:path'

/** File an administrator edits beside the installed executable's resources. */
export const NORTH_ENV_FILE = 'north.env'

/** Proxy variables that, when any is already set, leave the proxy choice to the user. */
const PROXY_NAMES = ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']

/**
 * Find the first installed browser: Windows system Edge (64-bit, then 32-bit),
 * system Chrome (64-bit, then 32-bit), user Chrome, then user Edge; macOS
 * system Chrome, system Edge, user Chrome, then user Edge.
 * @param platform - Platform whose browser locations are checked.
 * @param env - Environment supplying Windows install roots and the macOS home directory.
 * @param exists - Executable existence check.
 * @returns The first existing executable, or undefined when none is found.
 */
export function findNorthBrowserPath(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  exists: (path: string) => boolean = existsSync,
): string | undefined {
  let candidates: string[]
  if (platform === 'win32') {
    const programFiles = env.ProgramFiles || 'C:\\Program Files'
    const programFilesX86 = env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
    const edge = ['Microsoft', 'Edge', 'Application', 'msedge.exe']
    const chrome = ['Google', 'Chrome', 'Application', 'chrome.exe']
    candidates = [
      win32.join(programFiles, ...edge),
      win32.join(programFilesX86, ...edge),
      win32.join(programFiles, ...chrome),
      win32.join(programFilesX86, ...chrome),
      ...env.LOCALAPPDATA ? [win32.join(env.LOCALAPPDATA, ...chrome), win32.join(env.LOCALAPPDATA, ...edge)] : [],
    ]
  } else if (platform === 'darwin') {
    const chrome = ['Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome']
    const edge = ['Microsoft Edge.app', 'Contents', 'MacOS', 'Microsoft Edge']
    const userApplications = posix.join(env.HOME || homedir(), 'Applications')
    candidates = [
      posix.join('/Applications', ...chrome),
      posix.join('/Applications', ...edge),
      posix.join(userApplications, ...chrome),
      posix.join(userApplications, ...edge),
    ]
  } else {
    return undefined
  }
  return candidates.find(exists)
}

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
 * When `NORTH_PROXY` and `NORTH_PROXY_NETWORK` are both set, no proxy variable is
 * already present, and a local IPv4 address starts with `NORTH_PROXY_NETWORK`,
 * `HTTP_PROXY` and `HTTPS_PROXY` become `NORTH_PROXY`; other machines connect directly.
 * @param resourcesDir - Directory holding `north.env`: `process.resourcesPath` when packaged.
 * @param env - Environment to complete; defaults to the process environment.
 * @param interfaces - Local network interfaces; defaults to the operating system's.
 * @param platform - Platform used to find a browser after loading `north.env`.
 * @param browserExists - Browser executable existence check.
 */
export function applyNorthEnvironment(
  resourcesDir: string,
  env: NodeJS.ProcessEnv = process.env,
  interfaces: ReturnType<typeof networkInterfaces> = networkInterfaces(),
  platform: NodeJS.Platform = process.platform,
  browserExists: (path: string) => boolean = existsSync,
): void {
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
  if (!env.NORTH_BROWSER_PATH) {
    delete env.NORTH_BROWSER_PATH
    const browserPath = findNorthBrowserPath(platform, env, browserExists)
    if (browserPath !== undefined) env.NORTH_BROWSER_PATH = browserPath
  }
  // A key that is always present keeps the Welcome sign-in window closed;
  // gateways started without --api-key ignore it.
  env.NORTH_LLM_API_KEY ??= 'EMPTY'
  env.NORTH_LLM2_API_KEY ??= 'EMPTY'
  const proxy = env.NORTH_PROXY
  const network = env.NORTH_PROXY_NETWORK
  if (proxy === undefined || proxy === '' || network === undefined || network === '') return
  if (PROXY_NAMES.some(name => (env[name] ?? '') !== '')) return
  const onNetwork = Object.values(interfaces).some(addresses => addresses?.some(address =>
    address.family === 'IPv4' && address.address.startsWith(network)) === true)
  if (!onNetwork) return
  env.HTTP_PROXY = proxy
  env.HTTPS_PROXY = proxy
}
