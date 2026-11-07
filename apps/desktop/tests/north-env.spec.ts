import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import type { networkInterfaces } from 'node:os'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { applyNorthEnvironment, NORTH_ENV_FILE } from '../src/north-env.ts'

const PROXY_FILE = 'NORTH_PROXY=http://198.51.100.20:8080\nNORTH_PROXY_NETWORK=198.51.100.\n'
const directories: string[] = []

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

function resources(text: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'north-env-'))
  directories.push(directory)
  writeFileSync(join(directory, NORTH_ENV_FILE), text)
  return directory
}

function userHome(text?: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'north-home-'))
  directories.push(directory)
  if (text !== undefined) writeFileSync(join(directory, NORTH_ENV_FILE), text)
  return directory
}

function ipv4(address: string): ReturnType<typeof networkInterfaces> {
  return { eth0: [{ address, family: 'IPv4', netmask: [255, 255, 0, 0].join('.'), mac: '00:00:00:00:00:00', internal: false, cidr: `${address}/16` }] }
}

describe('applyNorthEnvironment configuration files', () => {
  it('prefers the user file over the packaged file', () => {
    const env: NodeJS.ProcessEnv = { DSH_HOME: userHome('NORTH_LLM_MODEL=user-model\n') }
    applyNorthEnvironment(resources('NORTH_LLM_MODEL=packaged-model\nNORTH_LLM2_MODEL=packaged-second\n'), env, {})
    expect(env).toMatchObject({ NORTH_LLM_MODEL: 'user-model', NORTH_LLM2_MODEL: 'packaged-second' })
  })

  it('keeps existing environment variables ahead of the user file', () => {
    const env: NodeJS.ProcessEnv = { DSH_HOME: userHome('NORTH_LLM_MODEL=user-model\n'), NORTH_LLM_MODEL: 'launch-model' }
    applyNorthEnvironment(resources('NORTH_LLM_MODEL=packaged-model\n'), env, {})
    expect(env.NORTH_LLM_MODEL).toBe('launch-model')
  })

  it('uses the packaged file when the user file is absent', () => {
    const env: NodeJS.ProcessEnv = { DSH_HOME: userHome() }
    applyNorthEnvironment(resources('NORTH_LLM_MODEL=packaged-model\n'), env, {})
    expect(env.NORTH_LLM_MODEL).toBe('packaged-model')
  })
})

describe('applyNorthEnvironment proxy selection', () => {
  it('uses the North proxy on a machine with an address in the proxied network', () => {
    const env: NodeJS.ProcessEnv = {}
    applyNorthEnvironment(resources(PROXY_FILE), env, ipv4('198.51.100.7'))
    expect(env).toMatchObject({ HTTP_PROXY: 'http://198.51.100.20:8080', HTTPS_PROXY: 'http://198.51.100.20:8080' })
  })

  it('connects directly from any other network', () => {
    const env: NodeJS.ProcessEnv = {}
    applyNorthEnvironment(resources(PROXY_FILE), env, ipv4('203.0.113.7'))
    expect(env.HTTP_PROXY).toBeUndefined()
    expect(env.HTTPS_PROXY).toBeUndefined()
  })

  it('keeps a proxy the user already set', () => {
    const env: NodeJS.ProcessEnv = { https_proxy: 'http://user-proxy:3128' }
    applyNorthEnvironment(resources(PROXY_FILE), env, ipv4('198.51.100.7'))
    expect(env.HTTP_PROXY).toBeUndefined()
    expect(env.HTTPS_PROXY).toBeUndefined()
  })

  it('sets no proxy when the file names no network', () => {
    const env: NodeJS.ProcessEnv = {}
    applyNorthEnvironment(resources('NORTH_PROXY=http://198.51.100.20:8080\n'), env, ipv4('198.51.100.7'))
    expect(env.HTTP_PROXY).toBeUndefined()
  })

  it('fills all LAN gateway keys', () => {
    const env: NodeJS.ProcessEnv = {}
    applyNorthEnvironment(resources('NORTH_LLM2_API_KEY=dummy_key\n'), env, {})
    expect(env).toMatchObject({ NORTH_LLM_API_KEY: 'EMPTY', NORTH_LLM2_API_KEY: 'dummy_key', NORTH_LLM3_API_KEY: 'EMPTY', NORTH_LLM4_API_KEY: 'EMPTY' })
  })
})

describe('applyNorthEnvironment browser selection', () => {
  const windowsChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  const windowsEdge = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  const macEdge = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'

  function apply(file: string, env: NodeJS.ProcessEnv, platform: NodeJS.Platform, available: string[]): string[] {
    const checked: string[] = []
    applyNorthEnvironment(resources(file), env, {}, platform, (path) => {
      checked.push(path)
      return available.includes(path)
    })
    return checked
  }

  it('keeps a path set in the launching environment or north.env', () => {
    const env: NodeJS.ProcessEnv = { NORTH_BROWSER_PATH: 'C:\\custom\\browser.exe' }
    expect(apply('NORTH_BROWSER_PATH=C:\\file\\browser.exe\n', env, 'win32', [windowsEdge])).toEqual([])
    expect(env.NORTH_BROWSER_PATH).toBe('C:\\custom\\browser.exe')

    const fileEnv: NodeJS.ProcessEnv = {}
    expect(apply('NORTH_BROWSER_PATH=C:\\file\\browser.exe\n', fileEnv, 'win32', [windowsEdge])).toEqual([])
    expect(fileEnv.NORTH_BROWSER_PATH).toBe('C:\\file\\browser.exe')
  })

  it('selects system Chrome when it is the only Windows browser', () => {
    const env: NodeJS.ProcessEnv = {}
    const checked = apply('', env, 'win32', [windowsChrome])
    expect(env.NORTH_BROWSER_PATH).toBe(windowsChrome)
    expect(checked).toEqual([windowsEdge, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', windowsChrome])
  })

  it('prefers 64-bit system Edge to Chrome', () => {
    const env: NodeJS.ProcessEnv = {}
    expect(apply('', env, 'win32', [windowsChrome, windowsEdge])).toEqual([windowsEdge])
    expect(env.NORTH_BROWSER_PATH).toBe(windowsEdge)
  })

  it('uses the Windows install roots when ProgramFiles variables are missing', () => {
    const env: NodeJS.ProcessEnv = {}
    apply('', env, 'win32', ['C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'])
    expect(env.NORTH_BROWSER_PATH).toBe('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe')
  })

  it('uses Windows install roots supplied by the environment', () => {
    const env: NodeJS.ProcessEnv = { ProgramFiles: 'D:\\Apps', 'ProgramFiles(x86)': 'D:\\Apps (x86)' }
    apply('', env, 'win32', ['D:\\Apps (x86)\\Microsoft\\Edge\\Application\\msedge.exe'])
    expect(env.NORTH_BROWSER_PATH).toBe('D:\\Apps (x86)\\Microsoft\\Edge\\Application\\msedge.exe')
  })

  it('leaves the path unset when no candidate exists or the platform is unsupported', () => {
    const env: NodeJS.ProcessEnv = { LOCALAPPDATA: 'C:\\Users\\tester\\AppData\\Local' }
    const checked = apply('', env, 'win32', [])
    expect(checked).toHaveLength(6)
    expect(env.NORTH_BROWSER_PATH).toBeUndefined()
    expect(apply('', env, 'linux', [windowsChrome])).toEqual([])
    expect(env.NORTH_BROWSER_PATH).toBeUndefined()
  })

  it('checks macOS system Chrome, system Edge, user Chrome, then user Edge', () => {
    const env: NodeJS.ProcessEnv = { HOME: '/Users/tester' }
    const userChrome = '/Users/tester/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    expect(apply('', env, 'darwin', [userChrome])).toEqual([macChrome, macEdge, userChrome])
    expect(env.NORTH_BROWSER_PATH).toBe(userChrome)

    const userEdge = '/Users/tester/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    const edgeEnv: NodeJS.ProcessEnv = { HOME: '/Users/tester' }
    expect(apply('', edgeEnv, 'darwin', [userEdge])).toEqual([macChrome, macEdge, userChrome, userEdge])
    expect(edgeEnv.NORTH_BROWSER_PATH).toBe(userEdge)
  })
})
