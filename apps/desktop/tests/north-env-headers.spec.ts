import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { applyNorthEnvironment, NorthEnvironmentError } from '../src/north-env.ts'

const dirs: string[] = []
type Interfaces = NonNullable<Parameters<typeof applyNorthEnvironment>[2]>
function apply(file: string, env: NodeJS.ProcessEnv, interfaces: Interfaces = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'north-env-'))
  dirs.push(dir)
  writeFileSync(join(dir, 'north.env'), file)
  applyNorthEnvironment(dir, env, interfaces, 'linux')
  return env
}
function userHome(file: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'north-home-'))
  dirs.push(dir)
  writeFileSync(join(dir, 'north.env'), file)
  return dir
}
function nic(address: string, mac: string): Interfaces {
  return { eth0: [{ address, mac, family: 'IPv4', netmask: [255, 255, 0, 0].join('.'), internal: false, cidr: `${address}/16` }] }
}
const userHeader = 'NORTH_LLM_HEADERS={"X-User-Id":"$' + '{NORTH_USER_ID}"}\n'
const macHeader = 'NORTH_LLM_HEADERS={"X-Mac-Id":"$' + '{NORTH_MAC_ID}"}\n'
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }) })

it('uses the North home and leaves absent headers absent', () => {
  const env = apply('', {})
  expect(env.DSH_HOME).toMatch(/\.north$/u)
  expect(env.NORTH_LLM_HEADERS).toBeUndefined()
})
it('expands process variables before file variables', () => {
  const env = apply('NORTH_USER_ID=file\n' + userHeader, { NORTH_USER_ID: 'user' })
  expect(JSON.parse(env.NORTH_LLM_HEADERS!)).toEqual({ 'X-User-Id': 'user' })
})
it('selects a matching nonzero MAC and lowercases it', () => {
  const interfaces = { ...nic('203.0.113.1', 'AA:AA:AA:AA:AA:AA'),
    eth1: nic('192.0.2.3', '00:00:00:00:00:00').eth0,
    eth2: nic('192.0.2.4', 'AA:BB:CC:DD:EE:FF').eth0 }
  const env = apply('NORTH_MAC_NETWORK=192.0.2.\n' + macHeader, {}, interfaces)
  expect(env.NORTH_MAC_ID).toBe('aa:bb:cc:dd:ee:ff')
})
it('keeps a manually supplied MAC', () => {
  const env = apply('NORTH_MAC_NETWORK=192.0.2.\nNORTH_LLM2_HEADERS={"X-Mac-Id":"$' + '{NORTH_MAC_ID}"}\n',
    { NORTH_MAC_ID: 'manual' }, nic('192.0.2.4', 'AA:BB:CC:DD:EE:FF'))
  expect(JSON.parse(env.NORTH_LLM2_HEADERS!)).toEqual({ 'X-Mac-Id': 'manual' })
})
it('expands third-model headers', () => {
  const env = apply('NORTH_LLM3_HEADERS={"X-User-Id":"$' + '{NORTH_USER_ID}"}\n', { NORTH_USER_ID: 'user' })
  expect(JSON.parse(env.NORTH_LLM3_HEADERS!)).toEqual({ 'X-User-Id': 'user' })
})
it('expands fourth-model headers', () => {
  const env = apply('NORTH_LLM4_HEADERS={"X-User-Id":"$' + '{NORTH_USER_ID}"}\n', { NORTH_USER_ID: 'user' })
  expect(JSON.parse(env.NORTH_LLM4_HEADERS!)).toEqual({ 'X-User-Id': 'user' })
})
it('expands a packaged header with a variable from the user file', () => {
  const home = userHome('NORTH_USER_ID=user\n')
  const env = apply('NORTH_LLM3_HEADERS={"X-User-Id":"$' + '{NORTH_USER_ID}"}\n', { DSH_HOME: home })
  expect(JSON.parse(env.NORTH_LLM3_HEADERS!)).toEqual({ 'X-User-Id': 'user' })
})
it('prefers a user header over a packaged header before expanding it', () => {
  const home = userHome('NORTH_LLM_HEADERS={"X-User-Id":"$' + '{NORTH_USER_ID}"}\n')
  const env = apply('NORTH_USER_ID=packaged\nNORTH_LLM_HEADERS={"X-Test":"packaged"}\n', { DSH_HOME: home })
  expect(JSON.parse(env.NORTH_LLM_HEADERS!)).toEqual({ 'X-User-Id': 'packaged' })
})
it.each([['no match', nic('203.0.113.1', 'AA:BB:CC:DD:EE:FF')],
  ['zero MAC', nic('192.0.2.3', '00:00:00:00:00:00')]])('%s fails when MAC is required', (_label, interfaces) => {
  expect(() => apply('NORTH_MAC_NETWORK=192.0.2.\n' + macHeader, {}, interfaces))
    .toThrow(/NORTH_LLM_HEADERS: missing NORTH_MAC_ID/u)
})
it('names a missing user id', () => {
  expect(() => apply(userHeader, {})).toThrow(/NORTH_LLM_HEADERS: missing NORTH_USER_ID/u)
})
it.each(['{bad', '[]', '{"X-Test":1}'])('rejects malformed header configuration %s', (raw) => {
  expect(() => apply('NORTH_LLM_HEADERS=' + raw + '\n', {})).toThrow(NorthEnvironmentError)
})

it('rejects unsupported placeholders', () => {
  expect(() => apply('NORTH_LLM_HEADERS={"X-Test":"$' + '{OTHER}"}\n', {}))
    .toThrow(/NORTH_LLM_HEADERS: unsupported placeholder OTHER/u)
})
