import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveNorthEnvSource } from '../scripts/north-env-source.mjs'

const directories: string[] = []
afterEach(() => {
  vi.unstubAllEnvs()
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

describe('North packaging settings source', () => {
  it('uses an explicit existing file first', () => {
    const directory = mkdtempSync(join(tmpdir(), 'north-env-source-'))
    directories.push(directory)
    const file = join(directory, 'settings.env')
    writeFileSync(file, '')
    expect(resolveNorthEnvSource({ NORTH_ENV_PATH: file, NORTH_ENV_ALLOW_EXAMPLE: '1' })).toBe(file)
  })

  it('rejects an explicit missing file without fallback', () => {
    expect(() => resolveNorthEnvSource({ NORTH_ENV_PATH: join(tmpdir(), 'missing-north-settings.env'), NORTH_ENV_ALLOW_EXAMPLE: '1' })).toThrow(/NORTH_ENV_PATH/u)
    expect(() => resolveNorthEnvSource({ NORTH_ENV_PATH: tmpdir(), NORTH_ENV_ALLOW_EXAMPLE: '1' })).toThrow(/NORTH_ENV_PATH/u)
  })

  it('does not read ambient example permission when given an explicit environment', () => {
    const directory = mkdtempSync(join(tmpdir(), 'north-env-source-'))
    directories.push(directory)
    const example = join(directory, 'north.env.example')
    writeFileSync(example, '')
    vi.stubEnv('NORTH_ENV_ALLOW_EXAMPLE', '1')
    expect(() => resolveNorthEnvSource({}, { localFile: join(directory, 'missing'), exampleFile: example }))
      .toThrow(/place apps\/desktop\/resources\/north\.env/u)
  })

  it('uses the local file when present', () => {
    const directory = mkdtempSync(join(tmpdir(), 'north-env-source-'))
    directories.push(directory)
    const file = join(directory, 'north.env')
    writeFileSync(file, '')
    expect(resolveNorthEnvSource({}, { localFile: file, exampleFile: join(directory, 'missing') })).toBe(file)
  })

  it('uses the example only with explicit permission and otherwise fails on a clean checkout', () => {
    const directory = mkdtempSync(join(tmpdir(), 'north-env-source-'))
    directories.push(directory)
    const example = join(directory, 'north.env.example')
    writeFileSync(example, '')
    const sources = { localFile: join(directory, 'missing'), exampleFile: example }
    expect(resolveNorthEnvSource({ NORTH_ENV_ALLOW_EXAMPLE: '1' }, sources)).toBe(example)
    expect(() => resolveNorthEnvSource({}, sources)).toThrow(/place apps\/desktop\/resources\/north\.env/u)
  })
})
