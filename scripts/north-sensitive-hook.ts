/** Block local sensitive literals from added Git lines and pushed commit messages without revealing their values. */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'

function git(cwd: string, args: string[], input?: string): string {
  return execFileSync('git', args, { cwd, input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

/** @param cwd - Git worktree. @returns Non-comment local literals, or null when unconfigured. */
export function readSensitivePatterns(cwd: string): string[] | null {
  const commonDir = git(cwd, ['rev-parse', '--git-common-dir']).trim()
  const file = resolve(isAbsolute(commonDir) ? commonDir : resolve(cwd, commonDir), 'info/north-sensitive-patterns')
  if (!existsSync(file)) return null
  return readFileSync(file, 'utf8').split(/\r?\n/u).map(line => line.trim()).filter(line => line !== '' && !line.startsWith('#'))
}

/** @param diff - Unified zero-context Git diff. @param patterns - Local literals. @returns Safe diagnostics. */
export function checkAddedLines(diff: string, patterns: string[]): string[] {
  const diagnostics: string[] = []
  let path = ''
  let lineNumber = 0
  for (const line of diff.split(/\r?\n/u)) {
    if (line.startsWith('+++ b/')) path = line.slice(6)
    else if (line.startsWith('@@')) {
      const match = /\+(\d+)/u.exec(line)
      if (match) lineNumber = Number(match[1])
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      if (patterns.some(pattern => line.slice(1).includes(pattern))) diagnostics.push(`${path}:${lineNumber}: 命中本机敏感词`)
      lineNumber += 1
    } else if (line.startsWith(' ')) lineNumber += 1
  }
  return diagnostics
}

/** @param cwd - Git worktree. @param mode - Hook phase. @param pushInput - Git pre-push ref lines. @returns Safe diagnostics. */
export function checkSensitiveHook(cwd: string, mode: 'staged' | 'pre-push', pushInput = ''): string[] {
  const patterns = readSensitivePatterns(cwd)
  if (patterns === null) return ['north-sensitive-hook: 本机敏感词文件不存在，跳过检查']
  if (mode === 'staged') {
    return checkAddedLines(git(cwd, ['diff', '--cached', '--no-ext-diff', '--unified=0', '--no-color']), patterns)
  }
  const diagnostics: string[] = []
  for (const inputLine of pushInput.split(/\r?\n/u).filter(Boolean)) {
    const [localRef, localSha, , remoteSha] = inputLine.split(/\s+/u)
    if (!localRef || !localSha || /^0+$/u.test(localSha)) continue
    const range = remoteSha && !/^0+$/u.test(remoteSha)
      ? [`${remoteSha}..${localSha}`]
      : [localSha, '--not', '--remotes']
    const logOptions = ['--no-ext-diff', '--no-color', ...range]
    const messages = git(cwd, ['log', '--format=%H%x00%B%x00', ...logOptions]).split('\0')
    for (let index = 0; index + 1 < messages.length; index += 2) {
      const sha = messages[index]?.trim()
      const message = messages[index + 1]
      if (sha && message !== undefined && patterns.some(pattern => message.includes(pattern))) {
        diagnostics.push(`${sha.slice(0, 12)}: 提交信息命中本机敏感词`)
      }
    }
    const diff = git(cwd, ['log', '--format=', '--unified=0', '-p', ...logOptions])
    diagnostics.push(...checkAddedLines(diff, patterns))
  }
  return diagnostics
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.dirname, 'north-sensitive-hook.ts')) {
  const mode = process.argv[2]
  if (mode !== 'staged' && mode !== 'pre-push') throw new Error('Expected staged or pre-push')
  const input = mode === 'pre-push' ? readFileSync(0, 'utf8') : ''
  const messages = checkSensitiveHook(process.cwd(), mode, input)
  for (const message of messages) console.error(message)
  if (messages.some(message => message.includes('命中本机敏感词'))) process.exitCode = 1
}
