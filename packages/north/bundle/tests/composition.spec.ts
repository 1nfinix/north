/** The North layer targets real base/web-app rows and states the office defaults. */
import { fileURLToPath } from 'node:url'
import type { PatchOptions } from '@deepseek-ai/cordis-plugin-include'
import { loadOverlayPatches } from '@deepseek-ai/dsh-app-boot'
import { describe, expect, it } from 'vitest'
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
const targeted = new Map(north.filter(patch => patch.id !== undefined).map(patch => [patch.id!, patch]))

describe('North bundle layer', () => {
  it('only targets rows the upstream layers insert', () => {
    const known = new Set([...upstream, ...insertedIds(north)])
    expect([...targeted.keys()].filter(id => !known.has(id))).toEqual([])
  })

  it('swaps the brand and inserts the North rows', () => {
    expect(targeted.get('ui-brand-official')?.disabled).toBe(true)
    expect(insertedIds(north)).toEqual(expect.arrayContaining(['north-brand', 'north-skill-writing', 'preset-office']))
    expect(targeted.get('system-prompt')?.config).toMatchObject({ includeHarnessIdentity: false })
    expect(targeted.get('harness-dev-context')?.disabled).toBe(true)
  })

  it('disables every telemetry and feedback row', () => {
    for (const id of ['session-telemetry-otel', 'desktop-product-telemetry', 'product-analytics', 'message-feedback', 'ui-message-feedback', 'command-feedback']) {
      expect(targeted.get(id)?.disabled, id).toBe(true)
    }
  })

  it('offers no full-access preset and makes the office preset the default', () => {
    const permission = targeted.get('permission')?.config as { presets: Record<string, unknown> }
    expect(Object.keys(permission.presets)).toEqual(['read-only', 'workspace-write'])
    expect(targeted.get('approval')?.config).toEqual({ policy: 'ask' })
    expect(targeted.get('agent-preset-registry')?.config).toEqual({ default: 'office' })
  })

  it('routes the default model to the LAN provider', () => {
    expect(targeted.get('agent-default-model')?.config).toMatchObject({ provider: 'north-lan' })
    const pi = targeted.get('llm-pi-ai')?.config as { providers: Record<string, { api: string; apiKeyEnv: string }> }
    expect(pi.providers['north-lan']).toMatchObject({ api: 'openai-completions', apiKeyEnv: 'NORTH_LLM_API_KEY' })
  })
})
