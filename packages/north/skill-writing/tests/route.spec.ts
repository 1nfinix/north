/**
 * The skills listing route over a real WebServer, skill registry, and
 * filesystem skill provider booted through the vendored Loader: the
 * connection trust fence, the method check, the effective catalog for the
 * default working directory, North folder diagnostics, and folder-wide
 * failures reported as 500. The connection and working-directory services are
 * stubs (their real providers need the browser composition and Session
 * projections); the filesystem is real.
 */

import { cp, mkdir, mkdtemp, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import SkillRegistry, { isUserInvocable } from '@deepseek-ai/dsh-skill'
import * as SkillFilesystem from '@deepseek-ai/dsh-skill-filesystem'
import WebServer from '@deepseek-ai/dsh-host-webserver'
import * as SkillWriting from '../src/index.ts'
import { readSkillSummary } from '../src/folder.ts'
import { NORTH_SKILLS_PATH, NORTH_WRITING_PROVIDER, type NorthSkillsSnapshot } from '../src/shared.ts'

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

/** Directories of one booted composition. */
interface Booted {
  base: string
  /** North user skill folder, which is also the filesystem provider's user DSH root. */
  folder: string
  project: string
  agents: string
  custom: string
}

/**
 * Boot webserver, the skill registry, the filesystem provider, and the writing
 * skills through the real Loader. The North folder is `<home>/skills`, the
 * provider's user DSH root, as in the North bundle.
 */
async function boot(options: { folder?: (dir: string) => string; assetRoot?: string } = {}): Promise<Booted> {
  // Canonical, because the filesystem provider reports resolved skill paths (macOS `/var` is `/private/var`).
  root = await realpath(await mkdtemp(join(tmpdir(), 'dsh-north-skills-')))
  const home = join(root, 'home')
  const folder = options.folder?.(root) ?? join(home, 'skills')
  const project = join(root, 'project')
  const agents = join(root, 'agents')
  const custom = join(root, 'custom')
  await mkdir(join(project, '.git'), { recursive: true })
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [
    "- name: '@deepseek-ai/dsh-host-webserver'",
    '  config:',
    "    host: '127.0.0.1'",
    '    port: 0',
    "- name: '@deepseek-ai/dsh-skill'",
    "- name: '@deepseek-ai/dsh-skill-filesystem'",
    '  config:',
    `    dshHome: ${JSON.stringify(home)}`,
    `    agentsHome: ${JSON.stringify(agents)}`,
    `    customSkillDirs: [${JSON.stringify(custom)}]`,
    `    bundledSkillDir: ${JSON.stringify(join(root, 'no-bundled'))}`,
    '    watch: false',
    "- name: '@deepseek-ai/dsh-north-skill-writing'",
    '  config:',
    `    userSkillRoot: ${JSON.stringify(folder)}`,
    ...options.assetRoot === undefined ? [] : [`    assetRoot: ${JSON.stringify(options.assetRoot)}`],
    '',
  ].join('\n'))
  context = new Context()
  context.baseUrl = pathToFileURL(root).href + '/'
  context.provide('connection', { requestRejection: () => trust.rejection } as never)
  context.provide('workingDirectory', { defaultDirectory: project } as never)
  await context.plugin(Loader)
  context.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-host-webserver', WebServer],
    ['@deepseek-ai/dsh-skill', SkillRegistry],
    ['@deepseek-ai/dsh-skill-filesystem', SkillFilesystem],
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
  return { base: `http://127.0.0.1:${String(context.webServer.port)}`, folder, project, agents, custom }
}

async function read(base: string): Promise<NorthSkillsSnapshot> {
  const response = await fetch(base + NORTH_SKILLS_PATH)
  expect(response.status).toBe(200)
  return await response.json() as NorthSkillsSnapshot
}

async function put(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
}

const skill = (name: string, description: string, extra = ''): string => `---\nname: ${name}\ndescription: ${description}\n${extra}---\n\n# ${name}\n`
const both = { modelInvocable: true, userInvocable: true }
const bundledNames = [...SkillWriting.SKILL_NAMES]

describe('north skills route (real Loader composition)', () => {
  it('creates the user folder and lists the built-in skills when nothing else exists', async () => {
    const { base, folder } = await boot()
    const empty = await fetch(base + NORTH_SKILLS_PATH)
    expect(empty.status).toBe(200)
    expect(empty.headers.get('cache-control')).toBe('no-store')
    const first = await empty.json() as NorthSkillsSnapshot
    expect(first).toMatchObject({ directory: folder, complete: true, invalid: [], inactive: [] })
    expect(first.effective.map(entry => entry.name).sort()).toEqual([...bundledNames].sort())
    expect(first.effective.every(entry => entry.provider === NORTH_WRITING_PROVIDER && entry.source === 'bundled')).toBe(true)
    expect((await stat(folder)).isDirectory()).toBe(true)
  })

  it('lists the winning skill of every source the / menu reads for the default working directory', async () => {
    const { base, folder, project, agents, custom } = await boot()
    await put(join(project, '.dsh', 'skills', 'p-dsh.md'), skill('p-dsh', 'project dsh'))
    await put(join(project, '.agents', 'skills', 'p-agents', 'SKILL.md'), skill('p-agents', 'project agents'))
    await put(join(custom, 'c-root.md'), skill('c-root', 'custom root'))
    await put(join(folder, 'u-dsh.md'), skill('u-dsh', 'north folder'))
    await put(join(folder, '.hidden.md'), skill('hidden-skill', 'dotfile skill'))
    await put(join(folder, '.system', 'SKILL.md'), skill('system-skill', 'reserved directory'))
    await put(join(agents, 'skills', 'u-agents.md'), skill('u-agents', 'shared agents'))
    const body = await read(base)
    const origin = Object.fromEntries(body.effective.map(entry => [entry.name, entry.source]))
    expect(origin).toMatchObject({
      'p-dsh': 'project-dsh',
      'p-agents': 'project-agents',
      'c-root': 'custom',
      'u-dsh': 'user-dsh',
      'hidden-skill': 'user-dsh',
      'u-agents': 'user-agents',
      'weekly-report': 'bundled',
    })
    expect(origin['system-skill']).toBeUndefined()
    expect(body.effective.find(entry => entry.name === 'u-dsh')).toMatchObject({
      description: 'north folder', invocation: both, provider: 'filesystem', path: join(folder, 'u-dsh.md'),
    })
    expect(body).toMatchObject({ complete: true, invalid: [], inactive: [] })

    // The `/` menu reads the same registry view for a new Session and keeps the user-invocable rows.
    const menu = (await context!.skills.list({ cwd: project })).filter(isUserInvocable).map(entry => entry.name)
    expect(body.effective.filter(entry => entry.invocation.userInvocable).map(entry => entry.name)).toEqual(menu)
  })

  it('reports a North folder skill that another source or another file overrides', async () => {
    const { base, folder, project } = await boot()
    const winner = join(project, '.dsh', 'skills', 'dup.md')
    await put(winner, skill('dup', 'project wins'))
    await put(join(folder, 'dup.md'), skill('dup', 'north loses'))
    await put(join(folder, 'a-twin.md'), skill('twin', 'first file wins'))
    await put(join(folder, 'b-twin.md'), skill('twin', 'second file loses'))
    await put(join(folder, 'weekly-report.md'), skill('weekly-report', 'user copy beats the built-in'))
    const body = await read(base)
    expect(body.effective.filter(entry => entry.name === 'dup')).toEqual([
      { name: 'dup', description: 'project wins', invocation: both, source: 'project-dsh', provider: 'filesystem', path: winner },
    ])
    expect(body.effective.filter(entry => entry.name === 'twin').map(entry => entry.description)).toEqual(['first file wins'])
    expect(body.effective.find(entry => entry.name === 'weekly-report')).toMatchObject({ source: 'user-dsh', description: 'user copy beats the built-in' })
    expect(body.inactive).toEqual([
      { entry: 'b-twin.md', name: 'twin', winner: { source: 'user-dsh', provider: 'filesystem', path: join(folder, 'a-twin.md') } },
      { entry: 'dup.md', name: 'dup', winner: { source: 'project-dsh', provider: 'filesystem', path: winner } },
    ])
  })

  it('classifies unusable North folder entries the way the provider skips them', async () => {
    const { base, folder } = await boot()
    await put(join(folder, 'zeta', 'SKILL.md'), skill('zeta', '最后一个'))
    await put(join(folder, 'alpha.md'), skill('alpha', 'Flat skill'))
    await mkdir(join(folder, 'no-body'))
    await put(join(folder, 'bad-yaml', 'SKILL.md'), '---\nname: [unterminated\n---\n')
    await put(join(folder, 'no-header.md'), '# just text\n')
    await put(join(folder, 'bad-name', 'SKILL.md'), skill('Bad Name', '名称含空格'))
    await put(join(folder, 'legacy.md'), '---\nname: legacy\ndescription: d\nuserInvocable: false\n---\n')
    await put(join(folder, '.broken.md'), '# dotfile without a header\n')
    await put(join(folder, 'notes.txt'), 'ignored')
    await mkdir(join(folder, '.system', 'empty'), { recursive: true })
    const body = await read(base)
    expect(body.effective.filter(entry => entry.source === 'user-dsh').map(entry => entry.name)).toEqual(['alpha', 'zeta'])
    expect(body.invalid).toEqual([
      { entry: '.broken.md', problem: 'invalid-frontmatter' },
      { entry: 'bad-name', problem: 'invalid-name' },
      { entry: 'bad-yaml', problem: 'invalid-frontmatter' },
      { entry: 'legacy.md', problem: 'invalid-invocation' },
      { entry: 'no-body', problem: 'missing-skill-md' },
      { entry: 'no-header.md', problem: 'invalid-frontmatter' },
    ])
    expect(body.inactive).toEqual([])
  })

  it('answers the connection rejection and refuses other methods', async () => {
    const { base } = await boot()
    trust.rejection = 401
    expect((await fetch(base + NORTH_SKILLS_PATH)).status).toBe(401)
    trust.rejection = undefined
    const post = await fetch(base + NORTH_SKILLS_PATH, { method: 'POST' })
    expect(post.status).toBe(405)
    expect(post.headers.get('allow')).toBe('GET')
  })

  it('reports unreadable entries per entry and keeps the usable skills', async () => {
    const { base, folder } = await boot()
    await mkdir(folder, { recursive: true })
    await writeFile(join(folder, 'alpha.md'), skill('alpha', 'Flat skill'))
    await symlink(join(folder, 'missing-target'), join(folder, 'dangling'))
    await symlink(join(folder, 'missing-target'), join(folder, 'dangling.md'))
    await symlink(join(folder, 'missing-target'), join(folder, 'notes.txt'))
    const body = await read(base)
    expect(body.effective.find(entry => entry.name === 'alpha')).toMatchObject({ source: 'user-dsh', invocation: both })
    expect(body).toMatchObject({ complete: true, inactive: [] })
    expect(body.invalid).toEqual([
      { entry: 'dangling', problem: 'unreadable' },
      { entry: 'dangling.md', problem: 'unreadable' },
    ])

    await rm(join(folder, 'dangling'))
    await rm(join(folder, 'dangling.md'))
    expect((await read(base)).invalid).toEqual([])
  })

  it('reports incomplete discovery and unloaded folder skills when the provider cannot read an entry', async () => {
    const { base, folder } = await boot()
    await put(join(folder, 'alpha.md'), skill('alpha', 'Flat skill'))
    // A directory named SKILL.md stops the filesystem provider's whole discovery.
    await mkdir(join(folder, 'odd', 'SKILL.md'), { recursive: true })
    const body = await read(base)
    expect(body.complete).toBe(false)
    expect(body.effective.find(entry => entry.name === 'alpha')).toBeUndefined()
    expect(body.invalid).toEqual([{ entry: 'odd', problem: 'unreadable' }])
    expect(body.inactive).toEqual([{ entry: 'alpha.md', name: 'alpha' }])

    await rm(join(folder, 'odd'), { recursive: true })
    const recovered = await read(base)
    expect(recovered).toMatchObject({ complete: true, invalid: [], inactive: [] })
    expect(recovered.effective.find(entry => entry.name === 'alpha')).toMatchObject({ source: 'user-dsh' })
  })

  it('reports each invocation policy, including a built-in skill that is not user-invocable', async () => {
    const assetRoot = await mkdtemp(join(tmpdir(), 'dsh-north-assets-'))
    try {
      await cp(assets, assetRoot, { recursive: true })
      await writeFile(join(assetRoot, 'translation', 'SKILL.md'), skill('translation', '翻译', 'user-invocable: false\n'))
      const { base, folder, project } = await boot({ assetRoot })
      await put(join(folder, 'audit-hidden.md'), skill('audit-hidden', 'd', 'user-invocable: false\n'))
      await put(join(folder, 'manual-only.md'), skill('manual-only', 'd', 'disable-model-invocation: true\n'))
      await put(join(folder, 'switched-off.md'), skill('switched-off', 'd', 'user-invocable: false\ndisable-model-invocation: true\n'))
      const body = await read(base)
      const policy = Object.fromEntries(body.effective.map(entry => [entry.name, entry.invocation]))
      expect(policy).toMatchObject({
        'audit-hidden': { modelInvocable: true, userInvocable: false },
        'manual-only': { modelInvocable: false, userInvocable: true },
        'switched-off': { modelInvocable: false, userInvocable: false },
        'translation': { modelInvocable: true, userInvocable: false },
        'weekly-report': both,
      })
      const menu = (await context!.skills.list({ cwd: project })).filter(isUserInvocable).map(entry => entry.name)
      expect(menu).not.toContain('translation')
      expect(menu).toContain('weekly-report')
    } finally {
      await rm(assetRoot, { recursive: true, force: true })
    }
  })

  it('reports a user folder path occupied by a file as a server error naming the folder', async () => {
    const { base } = await boot({ folder: dir => join(dir, 'occupied') })
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
