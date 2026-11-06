/** The North layer targets real base/web-app rows and states the office defaults. */
import { fileURLToPath } from 'node:url'
import type { PatchOptions } from '@deepseek-ai/cordis-plugin-include'
import { loadOverlayPatches } from '@deepseek-ai/dsh-app-boot'
import { Config as BrowserConfig } from '@deepseek-ai/dsh-experimental-browser-use-playwright-mcp'
import { afterEach, describe, expect, it, vi } from 'vitest'
import manifest from '../package.json' with { type: 'json' }

function load(path: string): PatchOptions[] {
  return loadOverlayPatches('north-test', fileURLToPath(new URL(path, import.meta.url)))
}

function insertedIds(patches: PatchOptions[]): string[] {
  return patches.flatMap(patch => patch.insert ?? []).map(row => row.id).filter(id => id !== undefined)
}

const upstream = [
  '../../../bundle/base/cordis.patch.yml',
  '../../../bundle/web-app/cordis.patch.yml',
  '../../../bundle/web-app/presets/standard.patch.yml',
  '../../../bundle/web-app/presets/ptc.patch.yml',
  '../../../bundle/web-app/presets/minimal.patch.yml',
  '../../../bundle/web-app/presets/cordis.patch.yml',
].flatMap(path => insertedIds(load(path)))

const north = manifest.dsh.bundle.patch.flatMap(path => load(`../${path}`))

/**
 * Evaluate one `!!js` expression node against the current `process.env`, as the Loader does at boot.
 * @param node - the parsed `{ __jsExpr }` node.
 * @returns the expression's value.
 */
function evaluate(node: unknown): unknown {
  const { __jsExpr: expression } = node as { __jsExpr: string }
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the Loader evaluates these expressions the same way
  const run = new Function(`return (${expression})`) as () => unknown
  return run()
}

afterEach(() => { vi.unstubAllEnvs() })
const targeted = new Map(north.filter(patch => patch.id !== undefined).map(patch => [patch.id!, patch]))

describe('North bundle layer', () => {
  it('only targets rows the upstream layers insert', () => {
    const known = new Set([...upstream, ...insertedIds(north)])
    expect([...targeted.keys()].filter(id => !known.has(id))).toEqual([])
  })

  it('swaps the brand and inserts the North rows', () => {
    expect(targeted.get('ui-brand-official')?.disabled).toBe(true)
    expect(insertedIds(north)).toEqual(expect.arrayContaining(['north-brand', 'north-skill-writing', 'better-sidebar', 'preset-office']))
    expect(targeted.get('system-prompt')?.config).toMatchObject({ includeHarnessIdentity: false })
    expect(targeted.get('harness-dev-context')?.disabled).toBe(true)
  })

  it('disables every telemetry and feedback row', () => {
    for (const id of ['session-telemetry-otel', 'desktop-product-telemetry', 'product-analytics', 'message-feedback', 'ui-message-feedback', 'command-feedback']) {
      expect(targeted.get(id)?.disabled, id).toBe(true)
    }
  })

  it('creates the first-use Workspace under Documents/North', () => {
    expect(targeted.get('workspace-controller')?.config).toEqual({ documentsSubdirectory: 'North' })
  })

  it('points the skills section at the user skill folder', () => {
    const row = north.flatMap(patch => patch.insert ?? []).find(entry => entry.id === 'north-skill-writing')
    expect(row?.config).toHaveProperty('userSkillRoot')
  })

  it('mounts the preinstalled sidebar from the pinned dependency', () => {
    const row = north.flatMap(patch => patch.insert ?? []).find(entry => entry.id === 'better-sidebar')
    expect(row?.name).toBe('dsh-better-sidebar')
    expect(manifest.dependencies['dsh-better-sidebar']).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('mounts a headless Playwright browser for North Sessions', () => {
    const rows = north.flatMap(patch => patch.insert ?? [])
    expect(rows.find(row => row.id === 'browser-use')?.name).toBe('@deepseek-ai/dsh-browser-use')
    const playwright = rows.find(row => row.id === 'browser-use-playwright')
    expect(playwright?.name).toBe('@deepseek-ai/dsh-experimental-browser-use-playwright-mcp')
    expect(playwright?.config).toMatchObject({ mode: 'launch', headless: true })
    const executablePath = (playwright?.config as { executablePath: unknown }).executablePath
    vi.stubEnv('NORTH_BROWSER_PATH', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
    expect(evaluate(executablePath)).toBe('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
    vi.stubEnv('NORTH_BROWSER_PATH', undefined)
    const missingPath = evaluate(executablePath)
    expect(missingPath).toBeUndefined()
    if (missingPath !== undefined) throw new Error('expected the browser path to be absent')
    expect(BrowserConfig({ mode: 'launch', headless: true, executablePath: missingPath } as never)).toMatchObject({ mode: 'launch', headless: true })
  })

  it('reaches DeepSeek for the model, search, and fetch, and keeps its sign-in and request add-ons off', () => {
    expect(targeted.get('llm-deepseek')).toEqual({ id: 'llm-deepseek', config: { baseURL: 'https://api.deepseek.com/anthropic' } })
    for (const id of ['web-deepseek-api', 'web-fetch-http']) expect(targeted.has(id), id).toBe(false)
    for (const id of ['llm-deepseek-account', 'web-search-deepseek', 'session-log-deepseek', 'plugin-package-inventory-deepseek', 'deepseek-llm-api-extensions']) {
      expect(targeted.get(id)?.disabled, id).toBe(true)
    }
    expect(targeted.get('web')?.config).toEqual({ searchProvider: 'deepseek-search-api', fetchProvider: 'http' })
  })

  it('offers no full-access preset and makes the office preset the default', () => {
    const permission = targeted.get('permission')?.config as { presets: Record<string, unknown> }
    expect(Object.keys(permission.presets)).toEqual(['read-only', 'workspace-write'])
    expect(targeted.get('approval')?.config).toEqual({ policy: 'ask' })
    expect(targeted.get('agent-preset-registry')?.config).toEqual({ default: 'office' })
  })

  it('mounts no terminal service, so neither terminal surface can spawn a shell', () => {
    expect(targeted.get('ui-sidebar-terminal')?.disabled).toBe(true)
    expect(targeted.get('terminal-controller')?.disabled).toBe(true)
    const sidebar = north.flatMap(patch => patch.insert ?? []).find(entry => entry.id === 'better-sidebar')
    expect(sidebar?.config).toEqual({ tabsEnabled: { 'terminal-bottom': false } })
  })

  it('mounts no plugin page: neither the manager, the Settings plugins section, nor its inventory tab', () => {
    for (const id of ['ui-plugin-manager', 'ui-settings-plugins', 'ui-settings-plugin-inventory']) {
      expect(targeted.get(id)?.disabled, id).toBe(true)
    }
  })

  const modelEnvNames = [
    'DEEPSEEK_API_KEY', 'NORTH_DEEPSEEK_MODEL',
    'NORTH_LLM_BASE_URL', 'NORTH_LLM_MODEL', 'NORTH_LLM_DISPLAY_NAME', 'NORTH_LLM_CONTEXT_WINDOW', 'NORTH_LLM_MAX_TOKENS',
    'NORTH_LLM2_BASE_URL', 'NORTH_LLM2_MODEL', 'NORTH_LLM2_DISPLAY_NAME', 'NORTH_LLM2_CONTEXT_WINDOW', 'NORTH_LLM2_MAX_TOKENS',
  ]

  function modelConfig(env: Record<string, string>, platform: NodeJS.Platform = 'win32') {
    for (const name of modelEnvNames) vi.stubEnv(name, env[name])
    const actual = Object.getOwnPropertyDescriptor(process, 'platform')!
    Object.defineProperty(process, 'platform', { ...actual, value: platform })
    try {
      const pi = targeted.get('llm-pi-ai')?.config as { providers: unknown }
      const defaults = targeted.get('agent-default-model')?.config as { provider: unknown; model: unknown }
      return {
        providers: evaluate(pi.providers),
        route: { provider: evaluate(defaults.provider), model: evaluate(defaults.model) },
      }
    } finally {
      Object.defineProperty(process, 'platform', actual)
    }
  }

  it('omits both LAN routes without gateway addresses and falls back to DeepSeek', () => {
    expect(modelConfig({})).toEqual({ providers: {}, route: { provider: 'deepseek-official', model: 'deepseek-v4-pro' } })
    expect(modelConfig({ NORTH_LLM_BASE_URL: '', NORTH_LLM2_BASE_URL: '' }, 'linux').providers).toEqual({})
  })

  it('registers only the configured LAN route and selects it when no DeepSeek key is set', () => {
    const first = modelConfig({ NORTH_LLM_BASE_URL: 'https://gateway.example/v1', NORTH_LLM_MODEL: 'qwen3' })
    expect(first.route).toEqual({ provider: 'north-lan', model: 'qwen3' })
    expect(first.providers).toEqual({
      'north-lan': {
        displayName: '内网模型', api: 'openai-completions', baseURL: 'https://gateway.example/v1', apiKeyEnv: 'NORTH_LLM_API_KEY',
        compat: { supportsDeveloperRole: false, supportsStore: false, maxTokensField: 'max_tokens' },
        defaultContextWindow: 32768, defaultMaxTokens: 8192, models: [{ id: 'qwen3', name: '内网模型' }],
      },
    })
    const second = modelConfig({ NORTH_LLM2_BASE_URL: 'https://gateway-2.example/v1', NORTH_LLM2_MODEL: 'example-model-b', NORTH_LLM2_DISPLAY_NAME: 'Gateway B' })
    expect(second.route).toEqual({ provider: 'north-lan-2', model: 'example-model-b' })
    expect(second.providers).toMatchObject({ 'north-lan-2': { baseURL: 'https://gateway-2.example/v1', displayName: 'Gateway B', apiKeyEnv: 'NORTH_LLM2_API_KEY' } })
    expect(Object.keys(second.providers as object)).toEqual(['north-lan-2'])
  })

  it('registers both LAN routes, prefers the second, and preserves DeepSeek precedence', () => {
    const env = { NORTH_LLM_BASE_URL: 'https://gateway.example/v1', NORTH_LLM2_BASE_URL: 'https://gateway-2.example/v1' }
    const both = modelConfig(env)
    expect(Object.keys(both.providers as object)).toEqual(['north-lan', 'north-lan-2'])
    expect(both.route).toEqual({ provider: 'north-lan-2', model: 'north-default-2' })
    expect(modelConfig(env, 'darwin').route).toEqual({ provider: 'deepseek-official', model: 'deepseek-v4-pro' })
    expect(modelConfig({ ...env, DEEPSEEK_API_KEY: 'sk-test', NORTH_DEEPSEEK_MODEL: 'deepseek-flash' }).route)
      .toEqual({ provider: 'deepseek-official', model: 'deepseek-flash' })
  })
})
