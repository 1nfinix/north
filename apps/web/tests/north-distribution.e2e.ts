/**
 * The complete North bundle as an enabled profile bundle, without model calls:
 * the brand title, the preinstalled sidebar's tabs with no terminal entry, no
 * plugin page in Settings, and the Skills settings section, whose effective
 * skills match the `/` menu of a new chat in the default workspace and whose
 * folder diagnostics list unusable and overridden entries.
 */
import { mkdir, symlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser } from 'playwright'
import { expect, it, onTestFinished } from 'vitest'
import { connectFreshWorkspaceZh } from './support.ts'
import { captureStableAria, compareOrRefreshGolden, launchWebScaffold, watchConsole, webSnapshotMode, type WebScaffold } from './scaffold.ts'

const NORTH_BUNDLE = fileURLToPath(new URL('../../../packages/north/bundle', import.meta.url))
const GOLDEN = fileURLToPath(new URL('./expected/north-distribution/skills.expected.md', import.meta.url))

async function put(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
}

const skill = (name: string, description: string, extra = ''): string => `---\nname: ${name}\ndescription: ${description}\n${extra}---\n`

it('mounts the North distribution with its Skills section, sidebar, and no plugin or terminal entry', async () => {
  const resources: { scaffold?: WebScaffold; browser?: Browser } = {}
  // A placeholder key makes the LAN model usable, so the composer accepts `/`; the scenario sends no model request.
  const hadKey = Object.hasOwn(process.env, 'NORTH_LLM_API_KEY')
  const previousKey = process.env.NORTH_LLM_API_KEY
  process.env.NORTH_LLM_API_KEY = 'north-e2e-placeholder'
  onTestFinished(async () => {
    try {
      try { await resources.browser?.close() } finally { await resources.scaffold?.close() }
    } finally {
      if (hadKey) process.env.NORTH_LLM_API_KEY = previousKey
      else Reflect.deleteProperty(process.env, 'NORTH_LLM_API_KEY')
    }
  })
  const scaffold = await launchWebScaffold({
    profile: { packages: [{ dir: NORTH_BUNDLE, enabled: true }], hmr: false },
    extraOverlayPath: fileURLToPath(new URL('./pin-browse-picker.overlay.yml', import.meta.url)),
  })
  resources.scaffold = scaffold
  // The scaffold root is the project root of both the default working directory and the workspace below it.
  const project = scaffold.workspaceCwd
  await mkdir(join(project, '.git'), { recursive: true })
  await put(join(project, '.dsh', 'skills', 'repo-guide.md'), skill('repo-guide', '项目内的写作约定'))
  await put(join(project, '.dsh', 'skills', 'dup.md'), skill('dup', '项目版本胜出'))
  await put(join(project, '.agents-home', 'skills', 'shared-tool.md'), skill('shared-tool', '共享技能'))
  // The Skills section and the `/` menu read the skill folders per request, so seeding after boot is observed.
  const folder = join(scaffold.harnessHome, 'skills')
  await put(join(folder, 'loan-memo', 'SKILL.md'), skill('loan-memo', '贷款审查备忘录'))
  await put(join(folder, 'audit-hidden.md'), skill('audit-hidden', '仅由助手自动使用', 'user-invocable: false\n'))
  await put(join(folder, '.dotted.md'), skill('dotted', '点文件中的技能'))
  await put(join(folder, 'dup.md'), skill('dup', '被项目版本覆盖'))
  await symlink(join(folder, 'missing-target'), join(folder, 'dangling'))

  const browser = await chromium.launch()
  resources.browser = browser
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, locale: 'zh-CN' })
  const errors = watchConsole(page)
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
  await expect.poll(() => page.title(), { timeout: 30_000 }).toBe('诺思')

  // The right sidebar belongs to a workspace.
  await connectFreshWorkspaceZh(page, scaffold.workspaceCwd, 'workspace')
  await page.getByRole('button', { name: '打开右侧边栏', exact: true }).click()
  for (const name of ['文件', 'Git', '任务管理', '侧边对话(beta)']) {
    await page.getByText(name, { exact: true }).first().waitFor()
  }
  expect(await page.getByText(/终端/).count()).toBe(0)

  await page.getByRole('button', { name: '设置', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '设置' })
  await dialog.getByText('技能', { exact: true }).first().click()
  await dialog.getByText('/loan-memo', { exact: true }).waitFor()
  expect(await dialog.getByText('内置插件', { exact: true }).count()).toBe(0)
  expect(await dialog.getByText(/终端/).count()).toBe(0)
  const section = await captureStableAria(page, '[role="dialog"] section[aria-label="技能"]', scaffold.workspaceCwd)
  await compareOrRefreshGolden(GOLDEN, section, webSnapshotMode())
  const commands = (await dialog.getByRole('region', { name: '当前生效的技能' }).getByText(/^\/[a-z0-9-]+$/).allTextContents())
    .map(command => command.slice(1)).sort()
  expect(commands).toEqual(expect.arrayContaining(['dotted', 'dup', 'loan-memo', 'repo-guide', 'shared-tool', 'weekly-report']))
  expect(commands).not.toContain('audit-hidden')
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })

  // The `/` menu of the blank chat lists exactly the user-invocable skills the section shows.
  await page.locator('[data-composer-input][contenteditable="true"]').first().fill('/')
  const options = page.locator('[role="listbox"] [id^="dsh-slash-option-skill-"]')
  await expect.poll(() => options.count(), { timeout: 15_000 }).toBe(commands.length)
  const offered = await options.allTextContents()
  for (const name of commands) {
    expect(offered.filter(text => text.startsWith(name)).length, name).toBeGreaterThan(0)
  }
  expect(errors.pageErrors).toEqual([])
})
