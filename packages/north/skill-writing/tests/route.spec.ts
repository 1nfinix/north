/**
 * The skills listing route over a real WebServer booted through the vendored
 * Loader: the connection trust fence, the method check, user-folder creation
 * and classification, unreadable entries reported per entry, and folder-wide
 * failures reported as 500. The connection service is
 * a controllable stub (its real provider is the browser composition); the
 * filesystem is real.
 */

import { cp, mkdir, mkdtemp, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import WebServer from '@deepseek-ai/dsh-host-webserver'
import * as SkillWriting from '../src/index.ts'
import { readSkillSummary } from '../src/folder.ts'
import { NORTH_SKILLS_PATH, type NorthSkillsSnapshot } from '../src/shared.ts'

const assets = fileURLToPath(new URL('../assets/', import.meta.url))

let root: string | undefined
let context: Context | undefined
const trust: { rejection: 401 | 403 | undefined } = { rejection: undefined }

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
  trust.rejection = undefined
})

/** Boot webserver, the skill registry and the writing skills through the real Loader. */
async function boot(userSkillRoot: (dir: string) => string, assetRoot?: string): Promise<{ base: string; folder: string }> {
  root = await mkdtemp(join(tmpdir(), 'dsh-north-skills-'))
  const folder = userSkillRoot(root)
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [
    "- name: '@deepseek-ai/dsh-host-webserver'",
    '  config:',
    "    host: '127.0.0.1'",
    '    port: 0',
    "- name: '@deepseek-ai/dsh-skill'",
    "- name: '@deepseek-ai/dsh-north-skill-writing'",
    '  config:',
    `    userSkillRoot: ${JSON.stringify(folder)}`,
    ...assetRoot === undefined ? [] : [`    assetRoot: ${JSON.stringify(assetRoot)}`],
    '',
  ].join('\n'))
  context = new Context()
  context.baseUrl = pathToFileURL(root).href + '/'
  context.provide('connection', { requestRejection: () => trust.rejection } as never)
  await context.plugin(Loader)
  context.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-host-webserver', WebServer],
    ['@deepseek-ai/dsh-skill', SkillRegistry],
    ['@deepseek-ai/dsh-north-skill-writing', SkillWriting],
  ])
  context.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as never
  await context.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
  await context.loader.await()
  return { base: `http://127.0.0.1:${String(context.webServer.port)}`, folder }
}

const skill = (name: string, description: string): string => `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`
const both = { modelInvocable: true, userInvocable: true }

describe('north skills route (real Loader composition)', () => {
  it('creates the user folder and classifies its entries next to the bundled skills', async () => {
    const { base, folder } = await boot(dir => join(dir, 'home', 'skills'))
    const empty = await fetch(base + NORTH_SKILLS_PATH)
    expect(empty.status).toBe(200)
    expect(empty.headers.get('cache-control')).toBe('no-store')
    const first = await empty.json() as NorthSkillsSnapshot
    expect(first).toMatchObject({ directory: folder, folder: [], invalid: [] })
    expect(first.bundled.map(entry => entry.name)).toEqual([...SkillWriting.SKILL_NAMES])
    expect((await stat(folder)).isDirectory()).toBe(true)

    await mkdir(join(folder, 'zeta'))
    await writeFile(join(folder, 'zeta', 'SKILL.md'), skill('zeta', '最后一个'))
    await writeFile(join(folder, 'alpha.md'), skill('alpha', 'Flat skill'))
    await mkdir(join(folder, 'no-body'))
    await mkdir(join(folder, 'bad-yaml'))
    await writeFile(join(folder, 'bad-yaml', 'SKILL.md'), '---\nname: [unterminated\n---\n')
    await writeFile(join(folder, 'no-header.md'), '# just text\n')
    await mkdir(join(folder, 'bad-name'))
    await writeFile(join(folder, 'bad-name', 'SKILL.md'), skill('Bad Name', '名称含空格'))
    await writeFile(join(folder, 'legacy.md'), '---\nname: legacy\ndescription: d\nuserInvocable: false\n---\n')
    await writeFile(join(folder, 'notes.txt'), 'ignored')
    await mkdir(join(folder, '.system'))
    const second = await (await fetch(base + NORTH_SKILLS_PATH)).json() as NorthSkillsSnapshot
    expect(second.folder).toEqual([
      { name: 'alpha', description: 'Flat skill', invocation: both },
      { name: 'zeta', description: '最后一个', invocation: both },
    ])
    expect(second.invalid).toEqual([
      { entry: 'bad-name', problem: 'invalid-name' },
      { entry: 'bad-yaml', problem: 'invalid-frontmatter' },
      { entry: 'legacy.md', problem: 'invalid-invocation' },
      { entry: 'no-body', problem: 'missing-skill-md' },
      { entry: 'no-header.md', problem: 'invalid-frontmatter' },
    ])
  })

  it('answers the connection rejection and refuses other methods', async () => {
    const { base } = await boot(dir => join(dir, 'skills'))
    trust.rejection = 401
    expect((await fetch(base + NORTH_SKILLS_PATH)).status).toBe(401)
    trust.rejection = undefined
    const post = await fetch(base + NORTH_SKILLS_PATH, { method: 'POST' })
    expect(post.status).toBe(405)
    expect(post.headers.get('allow')).toBe('GET')
  })

  it('reports unreadable entries per entry and keeps the usable skills', async () => {
    const { base, folder } = await boot(dir => join(dir, 'skills'))
    await mkdir(folder)
    await writeFile(join(folder, 'alpha.md'), skill('alpha', 'Flat skill'))
    await symlink(join(folder, 'missing-target'), join(folder, 'dangling'))
    await symlink(join(folder, 'missing-target'), join(folder, 'dangling.md'))
    await symlink(join(folder, 'missing-target'), join(folder, 'notes.txt'))
    await mkdir(join(folder, 'odd', 'SKILL.md'), { recursive: true })
    const response = await fetch(base + NORTH_SKILLS_PATH)
    expect(response.status).toBe(200)
    const body = await response.json() as NorthSkillsSnapshot
    expect(body).toMatchObject({ directory: folder, folder: [{ name: 'alpha', description: 'Flat skill', invocation: both }] })
    expect(body.bundled.map(entry => entry.name)).toEqual([...SkillWriting.SKILL_NAMES])
    expect(body.invalid).toEqual([
      { entry: 'dangling', problem: 'unreadable' },
      { entry: 'dangling.md', problem: 'unreadable' },
      { entry: 'odd', problem: 'unreadable' },
    ])

    await rm(join(folder, 'dangling'))
    await rm(join(folder, 'dangling.md'))
    await rm(join(folder, 'odd'), { recursive: true })
    const recovered = await (await fetch(base + NORTH_SKILLS_PATH)).json() as NorthSkillsSnapshot
    expect(recovered.invalid).toEqual([])
    expect(recovered.folder.map(entry => entry.name)).toEqual(['alpha'])
  })

  it('reports each invocation policy so the section can tell / commands from model-only skills', async () => {
    const { base, folder } = await boot(dir => join(dir, 'skills'))
    await mkdir(folder)
    const flags = (name: string, extra: string): string => `---\nname: ${name}\ndescription: d\n${extra}---\n`
    await writeFile(join(folder, 'audit-hidden.md'), flags('audit-hidden', 'user-invocable: false\n'))
    await writeFile(join(folder, 'manual-only.md'), flags('manual-only', 'disable-model-invocation: true\n'))
    await writeFile(join(folder, 'switched-off.md'), flags('switched-off', 'user-invocable: false\ndisable-model-invocation: true\n'))
    const body = await (await fetch(base + NORTH_SKILLS_PATH)).json() as NorthSkillsSnapshot
    expect(body.folder).toEqual([
      { name: 'audit-hidden', description: 'd', invocation: { modelInvocable: true, userInvocable: false } },
      { name: 'manual-only', description: 'd', invocation: { modelInvocable: false, userInvocable: true } },
      { name: 'switched-off', description: 'd', invocation: { modelInvocable: false, userInvocable: false } },
    ])
    expect(body.bundled.every(entry => entry.invocation.userInvocable && entry.invocation.modelInvocable)).toBe(true)
  })

  it('reports a user folder path occupied by a file as a server error naming the folder', async () => {
    const { base } = await boot(dir => join(dir, 'occupied'))
    await writeFile(join(root!, 'occupied'), 'not a directory')
    const warnings: string[] = []
    context!.logger.exporter({
      levels: { default: 2 },
      export: ({ type, args }) => { if (type === 'warn') warnings.push(String(args[0])) },
    })
    const response = await fetch(base + NORTH_SKILLS_PATH)
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ code: 'unreadable', directory: join(root!, 'occupied') })
    expect(warnings).toEqual([expect.stringContaining('skills listing failed')])
  })

  it('reports a bundled skill without a name as a server error', async () => {
    const assetRoot = await mkdtemp(join(tmpdir(), 'dsh-north-assets-'))
    try {
      await cp(assets, assetRoot, { recursive: true })
      await writeFile(join(assetRoot, 'translation', 'SKILL.md'), '---\ndescription: 只有说明\n---\nbody\n')
      const { base } = await boot(dir => join(dir, 'skills'), assetRoot)
      const response = await fetch(base + NORTH_SKILLS_PATH)
      expect(response.status).toBe(500)
      const body = await response.json() as { message: string }
      expect(body.message).toContain('translation')
    } finally {
      await rm(assetRoot, { recursive: true, force: true })
    }
  })

  it('rejects a relative user skill folder', async () => {
    const ctx = new Context()
    try {
      await ctx.plugin(SkillRegistry)
      await expect(ctx.plugin(SkillWriting, { userSkillRoot: 'skills' })).rejects.toThrow(/userSkillRoot must be an absolute/)
    } finally {
      await ctx.fiber.dispose()
    }
  })
})

describe('readSkillSummary', () => {
  it('applies the filesystem skill provider rules and reports why a file is skipped', () => {
    expect(readSkillSummary('no frontmatter')).toEqual({ problem: 'invalid-frontmatter' })
    expect(readSkillSummary('---\nname: [unterminated\n---\n')).toEqual({ problem: 'invalid-frontmatter' })
    expect(readSkillSummary('---\nname: x\ndescription: ""\n---\n')).toEqual({ problem: 'invalid-frontmatter' })
    expect(readSkillSummary('---\nname: bad name\ndescription: d\n---\n')).toEqual({ problem: 'invalid-name' })
    expect(readSkillSummary('---\nname: "   "\ndescription: d\n---\n')).toEqual({ problem: 'invalid-name' })
    expect(readSkillSummary('---\nname: x\ndescription: d\ndisable-model-invocation: maybe\n---\n')).toEqual({ problem: 'invalid-invocation' })
    expect(readSkillSummary('---\nname: x\ndescription: d\n---')).toEqual({ name: 'x', description: 'd', invocation: { modelInvocable: true, userInvocable: true } })
  })
})
