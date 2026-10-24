import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import { describe, expect, it } from 'vitest'
import * as SkillWriting from '../src/index.ts'

const assets = fileURLToPath(new URL('../assets/', import.meta.url))

describe('bundled North writing skills', () => {
  it('lists every packaged skill, loads each body, and removes all candidates on disposal', async () => {
    const ctx = new Context()
    try {
      await ctx.plugin(SkillRegistry)
      const fiber = await ctx.plugin(SkillWriting)
      const catalog = await ctx.skills.list()
      expect(catalog.map(skill => skill.name).sort()).toEqual([...SkillWriting.SKILL_NAMES].sort())
      for (const skill of catalog) {
        expect(skill.description.length).toBeLessThanOrEqual(500)
        expect(skill).toMatchObject({ source: 'bundled', provider: 'north-writing', invocation: { modelInvocable: true, userInvocable: true } })
        const loaded = await ctx.skills.get(skill.name)
        expect(loaded?.resourceBase).toEqual({ kind: 'directory', path: join(assets, skill.name).split(sep).join('/') })
        const raw = await readFile(join(assets, skill.name, 'SKILL.md'), 'utf8')
        expect(raw).toMatch(new RegExp(`^---\\r?\\nname: ${skill.name}\\r?\\n`, 'u'))
        expect(loaded?.content).toBe(raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, '').trim())
      }
      await fiber.dispose()
      expect(await ctx.skills.list()).toEqual([])
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('reads each bundled skill invocation policy from its frontmatter', async () => {
    const assetRoot = await mkdtemp(join(tmpdir(), 'dsh-north-assets-'))
    const ctx = new Context()
    try {
      await cp(assets, assetRoot, { recursive: true })
      await writeFile(join(assetRoot, 'translation', 'SKILL.md'), '---\nname: translation\ndescription: 翻译\nuser-invocable: false\ndisable-model-invocation: true\n---\nbody\n')
      await ctx.plugin(SkillRegistry)
      await ctx.plugin(SkillWriting, { assetRoot })
      const catalog = await ctx.skills.list()
      expect(catalog.find(skill => skill.name === 'translation')?.invocation).toEqual({ modelInvocable: false, userInvocable: false })
      expect(catalog.find(skill => skill.name === 'weekly-report')?.invocation).toEqual({ modelInvocable: true, userInvocable: true })
      expect((await ctx.skills.get('translation'))?.invocation).toEqual({ modelInvocable: false, userInvocable: false })
    } finally {
      await ctx.fiber.dispose()
      await rm(assetRoot, { recursive: true, force: true })
    }
  })

  it.each([
    ['no frontmatter', '# body only\n', /missing YAML frontmatter/],
    ['no description', '---\nname: weekly-report\n---\nbody\n', /requires name and description/],
    ['a different name', '---\nname: weekly-summary\ndescription: d\n---\nbody\n', /declares name "weekly-summary"/],
    ['an invalid invocation flag', '---\nname: weekly-report\ndescription: d\nuser-invocable: maybe\n---\nbody\n', /invalid invocation frontmatter/],
  ])('rejects a bundled skill with %s', async (_label, raw, message) => {
    const assetRoot = await mkdtemp(join(tmpdir(), 'dsh-north-assets-'))
    const ctx = new Context()
    try {
      await cp(assets, assetRoot, { recursive: true })
      await writeFile(join(assetRoot, 'weekly-report', 'SKILL.md'), raw)
      await ctx.plugin(SkillRegistry)
      await expect(ctx.plugin(SkillWriting, { assetRoot })).rejects.toThrow(message)
    } finally {
      await ctx.fiber.dispose()
      await rm(assetRoot, { recursive: true, force: true })
    }
  })

  it('rejects a relative assets root', async () => {
    const ctx = new Context()
    try {
      await ctx.plugin(SkillRegistry)
      await expect(ctx.plugin(SkillWriting, { assetRoot: 'assets' })).rejects.toThrow(/absolute/)
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
