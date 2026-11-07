import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import { expect, it } from 'vitest'
import * as SkillDev from '../src/index.ts'
import { SKILL_NAMES } from '../src/shared.ts'

const assets = fileURLToPath(new URL('../assets/', import.meta.url))
it('registers and disposes eight bundled development skills', async () => {
  const ctx = new Context()
  try {
    await ctx.plugin(SkillRegistry)
    const fiber = await ctx.plugin(SkillDev)
    const catalog = await ctx.skills.list()
    expect(catalog.map(skill => skill.name).sort()).toEqual([...SKILL_NAMES].sort())
    for (const skill of catalog) {
      expect(skill).toMatchObject({ source: 'bundled', provider: 'north-dev',
        invocation: { modelInvocable: true, userInvocable: true } })
      expect((await ctx.skills.get(skill.name))?.content).toContain('## 检查清单')
      expect(await readFile(join(assets, skill.name, 'SKILL.md'), 'utf8')).toContain('## 输出格式')
    }
    await fiber.dispose()
    expect(await ctx.skills.list()).toEqual([])
  } finally {
    await ctx.fiber.dispose()
  }
})
it('provides actionable guidance in every bundled skill', async () => {
  for (const name of SKILL_NAMES) {
    const content = await readFile(join(assets, name, 'SKILL.md'), 'utf8')
    for (const section of ['何时使用', '分步流程', '检查清单', '输出格式', '常见陷阱']) {
      expect(content, name).toContain(`## ${section}`)
    }
    expect(content.match(/^\d+\. /gmu)?.length, name).toBeGreaterThanOrEqual(5)
    expect(content.match(/^- \[ \] /gmu)?.length, name).toBeGreaterThanOrEqual(6)
    expect(content, name).toMatch(/```(?:`)?markdown/u)
    expect(content, name).toMatch(/PowerShell.*Git Bash|Git Bash.*PowerShell/su)
    expect(content, name).toContain('git ')
  }
})
it('rejects relative assets', async () => {
  const ctx = new Context()
  try {
    await ctx.plugin(SkillRegistry)
    await expect(ctx.plugin(SkillDev, { assetRoot: 'assets' })).rejects.toThrow(/absolute/u)
  } finally {
    await ctx.fiber.dispose()
  }
})

it('rejects malformed or wrongly named bundled skills', async () => {
  for (const [raw, message] of [
    ['body only\n', /frontmatter/u],
    ['---\nname: other\ndescription: sample\n---\nbody\n', /must match/u],
  ] as const) {
    const assetRoot = await mkdtemp(join(tmpdir(), 'north-dev-skills-'))
    const ctx = new Context()
    try {
      await cp(assets, assetRoot, { recursive: true })
      await writeFile(join(assetRoot, 'code-review', 'SKILL.md'), raw)
      await ctx.plugin(SkillRegistry)
      await expect(ctx.plugin(SkillDev, { assetRoot })).rejects.toThrow(message)
    } finally {
      await ctx.fiber.dispose()
      await rm(assetRoot, { recursive: true, force: true })
    }
  }
})

it('retains bundled frontmatter metadata', async () => {
  const assetRoot = await mkdtemp(join(tmpdir(), 'north-dev-skills-'))
  const ctx = new Context()
  try {
    await cp(assets, assetRoot, { recursive: true })
    await writeFile(join(assetRoot, 'code-review', 'SKILL.md'),
      '---\nname: code-review\ndescription: review\nmetadata:\n  owner: north-dev\n---\nbody\n')
    await ctx.plugin(SkillRegistry)
    await ctx.plugin(SkillDev, { assetRoot })
    expect((await ctx.skills.get('code-review'))?.metadata).toEqual({ owner: 'north-dev' })
  } finally {
    await ctx.fiber.dispose()
    await rm(assetRoot, { recursive: true, force: true })
  }
})
