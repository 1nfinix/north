/**
 * The complete North bundle as an enabled profile bundle, without model calls:
 * the brand title, the preinstalled sidebar's tabs, and the Skills settings
 * section with user, unusable, and built-in skills. Row-level choices such as
 * disabled plugin management and terminal stay in the bundle's composition test.
 */
import { mkdir, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser } from 'playwright'
import { expect, it, onTestFinished } from 'vitest'
import { connectFreshWorkspaceZh } from './support.ts'
import { captureStableAria, compareOrRefreshGolden, launchWebScaffold, watchConsole, webSnapshotMode, type WebScaffold } from './scaffold.ts'

const NORTH_BUNDLE = fileURLToPath(new URL('../../../packages/north/bundle', import.meta.url))
const GOLDEN = fileURLToPath(new URL('./expected/north-distribution/skills.expected.md', import.meta.url))

it('mounts the North distribution with its Skills section and sidebar', async () => {
  const resources: { scaffold?: WebScaffold; browser?: Browser } = {}
  onTestFinished(async () => {
    try { await resources.browser?.close() } finally { await resources.scaffold?.close() }
  })
  const scaffold = await launchWebScaffold({
    profile: { packages: [{ dir: NORTH_BUNDLE, enabled: true }], hmr: false },
    extraOverlayPath: fileURLToPath(new URL('./pin-browse-picker.overlay.yml', import.meta.url)),
  })
  resources.scaffold = scaffold
  // The Skills section reads the user folder per request, so seeding after boot is observed on first open.
  const skills = join(scaffold.harnessHome, 'skills')
  await mkdir(join(skills, 'loan-memo'), { recursive: true })
  await writeFile(join(skills, 'loan-memo', 'SKILL.md'), '---\nname: loan-memo\ndescription: 贷款审查备忘录\n---\n')
  await writeFile(join(skills, 'audit-hidden.md'), '---\nname: audit-hidden\ndescription: 仅由助手自动使用\nuser-invocable: false\n---\n')
  await symlink(join(skills, 'missing-target'), join(skills, 'dangling'))

  const browser = await chromium.launch()
  resources.browser = browser
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, locale: 'zh-CN' })
  const errors = watchConsole(page)
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
  await expect.poll(() => page.title(), { timeout: 30_000 }).toBe('诺思')

  // The right sidebar belongs to a workspace.
  await connectFreshWorkspaceZh(page, scaffold.workspaceCwd, 'workspace', false)
  await page.getByRole('button', { name: '打开右侧边栏', exact: true }).click()
  for (const name of ['文件', 'Git', '任务管理', '侧边对话(beta)']) {
    await page.getByText(name, { exact: true }).first().waitFor()
  }

  await page.getByRole('button', { name: '设置', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '设置' })
  await dialog.getByText('技能', { exact: true }).first().click()
  await dialog.getByText('/loan-memo', { exact: true }).waitFor()
  const section = await captureStableAria(page, '[role="dialog"] section[aria-label="技能"]', scaffold.workspaceCwd)
  await compareOrRefreshGolden(GOLDEN, section, webSnapshotMode())
  expect(errors.pageErrors).toEqual([])
})
