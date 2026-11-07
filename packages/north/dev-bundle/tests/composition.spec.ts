import { fileURLToPath } from 'node:url'
import { loadOverlayPatches } from '@deepseek-ai/dsh-app-boot'
import { applyEntryPatches } from '@deepseek-ai/cordis-plugin-include'
import { afterEach, expect, it, vi } from 'vitest'
import manifest from '../package.json' with { type: 'json' }
import * as DevBundle from '../src/index.ts'

const patch = manifest.dsh.bundle.patch.flatMap(path =>
  loadOverlayPatches('north-dev-test', fileURLToPath(new URL('../' + path, import.meta.url))))
const rows = new Map(patch.toReversed().filter(row => row.id !== undefined).map(row => [row.id!, row]))
function evaluate(node: unknown): unknown {
  const { __jsExpr } = node as { __jsExpr: string }
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the Loader evaluates these expressions the same way
  const run = new Function(`return (${__jsExpr})`) as () => unknown
  return run()
}
afterEach(() => vi.unstubAllEnvs())
it('restores development UI and presets', () => {
  expect(DevBundle).toBeDefined()
  for (const id of ['terminal-controller', 'ui-sidebar-terminal', 'ui-plugin-manager',
    'ui-settings-plugins', 'ui-settings-plugin-inventory', 'harness-dev-context', 'preset-ptc', 'preset-minimal']) {
    expect(rows.get(id)?.disabled, id).toBe(false)
  }
  expect(rows.get('better-sidebar')?.config).toEqual({ tabsEnabled: { 'terminal-bottom': true } })
  expect(rows.get('agent-preset-registry')?.config).toEqual({ default: 'office' })
  expect(patch.flatMap(row => row.insert ?? []).find(row => row.id === 'north-skill-dev')?.name)
    .toBe('@deepseek-ai/dsh-north-skill-dev')
  expect(patch.flatMap(row => row.insert ?? []).find(row => row.id === 'north-dev-session-headers'))
    .toMatchObject({
      name: '@deepseek-ai/dsh-north-dev-bundle',
      config: { headers: ['X-Session-Id', 'x-session-affinity'] },
    })
})
it('restores full access while keeping startup defaults', () => {
  expect(rows.has('sandbox-policy')).toBe(false)
  expect(rows.has('approval')).toBe(false)
  expect(rows.get('permission')?.config).toMatchObject({ presets: {
    'danger-full-access': { sandbox: 'danger-full-access', approval: 'never' },
  } })
})
it('chooses the first configured LAN route, or DeepSeek when none is configured', () => {
  const config = rows.get('agent-default-model')?.config as { provider: unknown; model: unknown }
  vi.stubEnv('DEEPSEEK_API_KEY', undefined)
  vi.stubEnv('NORTH_DEEPSEEK_MODEL', undefined)
  for (const prefix of ['NORTH_LLM', 'NORTH_LLM2', 'NORTH_LLM3', 'NORTH_LLM4']) {
    vi.stubEnv(`${prefix}_BASE_URL`, undefined)
  }
  expect([evaluate(config.provider), evaluate(config.model)]).toEqual(['deepseek-official', 'deepseek-v4-pro'])
  vi.stubEnv('NORTH_LLM4_BASE_URL', 'https://example.com/four')
  expect([evaluate(config.provider), evaluate(config.model)]).toEqual(['north-lan-4', 'north-default-4'])
  vi.stubEnv('NORTH_LLM2_BASE_URL', 'https://example.com/two')
  expect([evaluate(config.provider), evaluate(config.model)]).toEqual(['north-lan-2', 'north-default-2'])
  vi.stubEnv('NORTH_LLM_BASE_URL', 'https://example.com/one')
  vi.stubEnv('NORTH_LLM_MODEL', 'example-model-a')
  expect([evaluate(config.provider), evaluate(config.model)]).toEqual(['north-lan', 'example-model-a'])
  vi.stubEnv('DEEPSEEK_API_KEY', 'test-key')
  expect([evaluate(config.provider), evaluate(config.model)]).toEqual(['deepseek-official', 'deepseek-v4-pro'])
})
it('registers only configured providers with their headers and credentials', () => {
  const expression = (rows.get('llm-pi-ai')?.config as { providers: unknown }).providers
  const prefixes = ['NORTH_LLM', 'NORTH_LLM2', 'NORTH_LLM3', 'NORTH_LLM4']
  for (const prefix of prefixes) {
    vi.stubEnv(`${prefix}_BASE_URL`, undefined)
    vi.stubEnv(`${prefix}_HEADERS`, undefined)
  }
  expect(evaluate(expression)).toEqual({})
  vi.stubEnv('NORTH_LLM3_BASE_URL', 'https://example.com/three')
  expect(Object.keys(evaluate(expression) as object)).toEqual(['north-lan-3'])
  for (const [index, prefix] of prefixes.entries()) {
    vi.stubEnv(`${prefix}_BASE_URL`, `https://example.com/${String(index + 1)}`)
  }
  vi.stubEnv('NORTH_LLM_HEADERS', '{"X-Test":"one"}')
  vi.stubEnv('NORTH_LLM2_HEADERS', '{"X-Test":"two"}')
  vi.stubEnv('NORTH_LLM3_HEADERS', '{"X-Test":"three"}')
  vi.stubEnv('NORTH_LLM4_HEADERS', '{"X-Test":"four"}')
  const providers = evaluate(expression) as Record<string, { headers: Record<string, string>; apiKeyEnv: string; baseURL: string }>
  expect(Object.keys(providers)).toEqual(['north-lan', 'north-lan-2', 'north-lan-3', 'north-lan-4'])
  for (const [index, provider] of Object.values(providers).entries()) {
    expect(provider.headers).toEqual({ 'X-Test': ['one', 'two', 'three', 'four'][index] })
    expect(provider.apiKeyEnv).toBe(`${prefixes[index]}_API_KEY`)
    expect(provider.baseURL).toBe(`https://example.com/${String(index + 1)}`)
  }
})

const presetSources = [
  ['preset-standard', '../../../bundle/web-app/presets/standard.patch.yml'],
  ['preset-ptc', '../../../bundle/web-app/presets/ptc.patch.yml'],
  ['preset-minimal', '../../../bundle/web-app/presets/minimal.patch.yml'],
  ['preset-cordis', '../../../bundle/web-app/presets/cordis.patch.yml'],
  ['preset-office', '../../bundle/presets/office.patch.yml'],
] as const

function compactionPolicies(id: string, path: string) {
  const source = loadOverlayPatches('north-dev-test', fileURLToPath(new URL(path, import.meta.url)))
  const warnings: string[] = []
  const entries = applyEntryPatches([], [...source, ...patch.filter(row => row.id === id)],
    (message) => { warnings.push(message) })
  expect(warnings).toEqual([])
  const preset = entries.find(row => row.id === id)
  const presetConfig = preset?.config as {
    plugins: { id: string; config?: { id: string; config?: { modelPolicies: unknown[] } }[] }[]
  }
  const plugins = presetConfig.plugins
  const compaction = plugins.find(row => row.id === 'compaction')
  const backend = compaction?.config?.find(row => row.id === 'compaction-basic')
  const policies = backend?.config?.modelPolicies
  if (backend !== undefined) delete backend.config
  expect(preset).toEqual(applyEntryPatches([], source, () => {}).find(row => row.id === id))
  return policies
}

it('configures all isolated preset compaction backends for four LAN routes', () => {
  for (const [id, path] of presetSources) {
    const policies = compactionPolicies(id, path) as {
      provider: string
      model: unknown
      headroomTokens: unknown
    }[]
    expect(policies).toHaveLength(4)
    for (const [index, [provider, prefix, defaultModel]] of [
      ['north-lan', 'NORTH_LLM', 'north-default'],
      ['north-lan-2', 'NORTH_LLM2', 'north-default-2'],
      ['north-lan-3', 'NORTH_LLM3', 'north-default-3'],
      ['north-lan-4', 'NORTH_LLM4', 'north-default-4'],
    ].entries()) {
      const policy = policies[index]!
      expect(policy.provider).toBe(provider)
      vi.stubEnv(`${prefix}_MODEL`, undefined)
      vi.stubEnv(`${prefix}_MAX_TOKENS`, undefined)
      expect(evaluate(policy.model)).toBe(defaultModel)
      expect(evaluate(policy.headroomTokens)).toBe(8192)
      vi.stubEnv(`${prefix}_MODEL`, `example-model-${index}`)
      vi.stubEnv(`${prefix}_MAX_TOKENS`, '65536')
      expect(evaluate(policy.model)).toBe(`example-model-${index}`)
      expect(evaluate(policy.headroomTokens)).toBe(65536)
    }
    vi.unstubAllEnvs()
  }
})
