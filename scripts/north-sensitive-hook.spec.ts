import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { checkSensitiveHook } from './north-sensitive-hook.ts'

const directories: string[] = []
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

function repository(): string {
  const directory = mkdtempSync(join(tmpdir(), 'north-hook-'))
  directories.push(directory)
  execFileSync('git', ['init', '-q', directory])
  return directory
}

function git(directory: string, ...args: string[]): void {
  execFileSync('git', args, { cwd: directory })
}

describe('North local sensitive hook', () => {
  it('rejects a staged added literal without printing it', () => {
    const directory = repository()
    const commonDir = execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: directory, encoding: 'utf8' }).trim()
    mkdirSync(join(directory, commonDir, 'info'), { recursive: true })
    writeFileSync(join(directory, commonDir, 'info/north-sensitive-patterns'), '# ignored-comment\nzz-fake-secret-zz\n')
    writeFileSync(join(directory, 'check.txt'), 'zz-fake-secret-zz\n')
    git(directory, 'add', 'check.txt')
    const diagnostics = checkSensitiveHook(directory, 'staged')
    expect(diagnostics).toEqual(['check.txt:1: 命中本机敏感词'])
    expect(diagnostics.join(' ')).not.toContain('zz-fake-secret-zz')
    const run = spawnSync(join(process.cwd(), 'node_modules/.bin/tsx'), [join(import.meta.dirname, 'north-sensitive-hook.ts'), 'staged'], { cwd: directory, encoding: 'utf8' })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('check.txt:1')
    expect(run.stderr).not.toContain('zz-fake-secret-zz')
  })

  it('checks added lines in the pushed commit range', () => {
    const directory = repository()
    const commonDir = execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: directory, encoding: 'utf8' }).trim()
    writeFileSync(join(directory, commonDir, 'info/north-sensitive-patterns'), 'zz-fake-secret-zz\n')
    git(directory, 'config', 'user.name', 'North Hook Test')
    git(directory, 'config', 'user.email', 'north-hook@example.invalid')
    writeFileSync(join(directory, 'check.txt'), 'baseline\n')
    git(directory, 'add', 'check.txt')
    git(directory, 'commit', '-qm', 'baseline')
    const base = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' }).trim()
    writeFileSync(join(directory, 'check.txt'), 'baseline\nzz-fake-secret-zz\n')
    git(directory, 'add', 'check.txt')
    git(directory, 'commit', '-qm', 'addition')
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' }).trim()
    const diagnostics = checkSensitiveHook(directory, 'pre-push', `refs/heads/main ${head} refs/heads/main ${base}\n`)
    expect(diagnostics).toEqual(['check.txt:2: 命中本机敏感词'])
    expect(diagnostics.join(' ')).not.toContain('zz-fake-secret-zz')
  })

  it('limits a new branch to commits absent from remote-tracking refs', () => {
    const directory = repository()
    const commonDir = execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: directory, encoding: 'utf8' }).trim()
    writeFileSync(join(directory, commonDir, 'info/north-sensitive-patterns'), 'zz-fake-secret-zz\n')
    git(directory, 'config', 'user.name', 'North Hook Test')
    git(directory, 'config', 'user.email', 'north-hook@example.invalid')
    writeFileSync(join(directory, 'check.txt'), 'zz-fake-secret-zz\n')
    git(directory, 'add', 'check.txt')
    git(directory, 'commit', '-qm', 'zz-fake-secret-zz')
    const published = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' }).trim()
    git(directory, 'update-ref', 'refs/remotes/origin/main', published)
    writeFileSync(join(directory, 'check.txt'), 'safe replacement\n')
    git(directory, 'add', 'check.txt')
    git(directory, 'commit', '-qm', 'safe follow-up')
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' }).trim()
    const input = `refs/heads/new ${head} refs/heads/new ${'0'.repeat(40)}\n`
    expect(checkSensitiveHook(directory, 'pre-push', input)).toEqual([])
  })

  it('blocks a sensitive commit message without revealing its literal', () => {
    const directory = repository()
    const commonDir = execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: directory, encoding: 'utf8' }).trim()
    writeFileSync(join(directory, commonDir, 'info/north-sensitive-patterns'), 'zz-fake-secret-zz\n')
    git(directory, 'config', 'user.name', 'North Hook Test')
    git(directory, 'config', 'user.email', 'north-hook@example.invalid')
    writeFileSync(join(directory, 'check.txt'), 'safe content\n')
    git(directory, 'add', 'check.txt')
    git(directory, 'commit', '-qm', 'safe subject', '-m', 'zz-fake-secret-zz')
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' }).trim()
    const input = `refs/heads/new ${head} refs/heads/new ${'0'.repeat(40)}\n`
    const diagnostics = checkSensitiveHook(directory, 'pre-push', input)
    expect(diagnostics).toEqual([`${head.slice(0, 12)}: 提交信息命中本机敏感词`])
    const run = spawnSync(join(process.cwd(), 'node_modules/.bin/tsx'), [join(import.meta.dirname, 'north-sensitive-hook.ts'), 'pre-push'], { cwd: directory, input, encoding: 'utf8' })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('提交信息命中本机敏感词')
    expect(run.stderr).not.toContain('zz-fake-secret-zz')
  })

  it('passes when the local list is missing', () => {
    expect(checkSensitiveHook(repository(), 'staged')).toEqual(['north-sensitive-hook: 本机敏感词文件不存在，跳过检查'])
  })

  it('ignores comment lines', () => {
    const directory = repository()
    const commonDir = execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: directory, encoding: 'utf8' }).trim()
    writeFileSync(join(directory, commonDir, 'info/north-sensitive-patterns'), '# ignored-comment\n')
    writeFileSync(join(directory, 'check.txt'), 'ignored-comment\n')
    git(directory, 'add', 'check.txt')
    expect(checkSensitiveHook(directory, 'staged')).toEqual([])
  })
})
