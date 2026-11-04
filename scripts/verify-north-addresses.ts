/** Reject non-documentation public IPv4 literals in tracked North-owned files. */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))

/** @param path - Repository-relative path. @returns Whether North owns its contents. */
export function isNorthPath(path: string): boolean {
  return /^NORTH[^/]*\.md$/u.test(path)
    || path.startsWith('packages/north/')
    || path.startsWith('apps/desktop/resources/')
    || /^apps\/desktop\/(?:src|tests)\/north-[^/]*$/u.test(path)
    || /^apps\/desktop\/scripts\/north-[^/]*$/u.test(path)
    || /^\.github\/workflows\/north-[^/]*$/u.test(path)
    || /^apps\/web\/tests\/north-[^/]*$/u.test(path)
    || path.startsWith('apps/web/tests/expected/north-')
}

/** @param octets - IPv4 octets or a trailing-dot prefix. @returns Whether the represented range is allowed. */
export function allowedNorthAddress(octets: number[]): boolean {
  const [a, b, c, d] = octets
  if (a === 10 || a === 127) return true
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 192 && b === 0 && c === 2) return true
  if (a === 198 && b === 51 && c === 100) return true
  if (a === 203 && b === 0 && c === 113) return true
  if (a === 169 && b === 254) return true
  return octets.length === 4 && a === 0 && b === 0 && c === 0 && d === 0
}

/** @param path - Repository-relative path. @param content - File text. @returns File and line diagnostics. */
export function checkNorthAddresses(path: string, content: string): string[] {
  if (!isNorthPath(path)) return []
  const diagnostics: string[] = []
  for (const [index, line] of content.split(/\r?\n/u).entries()) {
    const full = /(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])/gu
    for (const match of line.matchAll(full)) {
      const octets = match[0].split('.').map(Number)
      if (octets.some(part => part > 255)) continue
      if (!allowedNorthAddress(octets)) diagnostics.push(`${path}:${index + 1}: IPv4 address outside allowed ranges`)
    }
    // A prefix is a NORTH_* value ending in a dot or a range written with a wildcard (`10.1.*`);
    // a version number that ends a sentence (`1.0.2.`) is neither.
    const prefix = /(?:^|\s)NORTH_[A-Z_]+=(\d{1,3}(?:\.\d{1,3}){0,2})\.(?![\d.])|(?<![\d.])(\d{1,3}(?:\.\d{1,3}){0,2})\.[*xX](?![\w.])/gu
    for (const match of line.matchAll(prefix)) {
      const octets = (match[1] ?? match[2] ?? '').split('.').map(Number)
      if (octets.some(part => part > 255)) continue
      if (!allowedNorthAddress(octets)) diagnostics.push(`${path}:${index + 1}: IPv4 prefix outside allowed ranges`)
    }
  }
  return diagnostics
}

/** @returns Diagnostics from tracked North files. */
export function verifyTrackedNorthAddresses(): string[] {
  const paths = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 16 * 1024 * 1024 }).toString('utf8').split('\0').filter(isNorthPath)
  return paths.flatMap(path => checkNorthAddresses(path, readFileSync(resolve(root, path), 'utf8')))
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const diagnostics = verifyTrackedNorthAddresses()
  if (diagnostics.length > 0) {
    for (const diagnostic of diagnostics) console.error(diagnostic)
    process.exitCode = 1
  }
}
