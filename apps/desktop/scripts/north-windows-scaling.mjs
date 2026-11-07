/**
 * North Windows qualification: install an unsigned Desktop installer silently, launch the installed application at
 * several device scale factors, check that the main window and the Skills settings section fit without horizontal
 * overflow, capture screenshots, then uninstall silently and check that the installation directory is gone.
 * Usage: node apps/desktop/scripts/north-windows-scaling.mjs <installer.exe> <output-directory>
 * The run sends no model request: a documentation-range `NORTH_LLM_BASE_URL` registers a LAN route as in a deployment;
 * with placeholder `NORTH_LLM_API_KEY`, `NORTH_USER_ID`, and `NORTH_MAC_ID` values it keeps the DeepSeek welcome window
 * out of the way and lets per-user header templates pass startup validation.
 */
import { execFile, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { promisify } from 'node:util'

if (process.platform !== 'win32') throw new Error('north-windows-scaling: requires Windows')
const [installerArgument, outputArgument] = process.argv.slice(2)
if (installerArgument === undefined || outputArgument === undefined) {
  throw new Error('north-windows-scaling: usage: <installer.exe> <output-directory>')
}
const installer = resolve(installerArgument)
const output = resolve(outputArgument)
const execute = promisify(execFile)
const require = createRequire(new URL('../../web/package.json', import.meta.url))
const { chromium } = require('playwright')

const SCALES = [1, 1.25, 1.5, 2]
/** The client follows the Windows display language, so labels are matched in Chinese or English. */
const SETTINGS = /^(?:设置|Settings)$/u
const installDirectory = join(output, 'installed')
const home = join(output, 'dsh-home')
await mkdir(output, { recursive: true })

/** Wait until `read` returns a value other than `undefined`, polling every 500 ms. */
async function waitFor(label, timeoutMs, read) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const value = await read().catch(() => undefined)
    if (value !== undefined) return value
    if (Date.now() > deadline) throw new Error(`north-windows-scaling: timed out waiting for ${label}`)
    await delay(500)
  }
}

async function application() {
  const entries = await readdir(installDirectory)
  const executable = entries.find(name => name.endsWith('.exe') && !/^uninstall/iu.test(name))
  if (executable === undefined) throw new Error(`north-windows-scaling: no application executable in ${installDirectory}: ${entries.join(', ')}`)
  return join(installDirectory, executable)
}

/** Launch at one scale, check fit, and capture the main window and the Skills section. */
async function qualify(executable, scale, index) {
  const port = 9300 + index
  const child = spawn(executable, [
    `--force-device-scale-factor=${String(scale)}`, `--remote-debugging-port=${String(port)}`,
  ], {
    env: { ...process.env, DSH_HOME: home, NORTH_LLM_BASE_URL: 'http://192.0.2.1:9/v1', NORTH_LLM_API_KEY: 'north-windows-qualification',
      NORTH_USER_ID: 'qualification-user', NORTH_MAC_ID: 'qualification-mac', DSH_TELEMETRY_DISABLED: '1' },
    stdio: 'ignore',
  })
  try {
    // The first launch prepares the Desktop profile, which takes longer than later launches.
    await waitFor(`DevTools port ${String(port)}`, index === 0 ? 600_000 : 180_000, async () => {
      const response = await fetch(`http://127.0.0.1:${String(port)}/json/version`)
      return response.ok ? true : undefined
    })
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${String(port)}`)
    try {
      const pages = () => browser.contexts().flatMap(context => context.pages())
      const page = await waitFor('the application page', index === 0 ? 600_000 : 180_000, async () => {
        const welcome = pages().find(candidate => candidate.url().includes('welcome'))
        if (welcome !== undefined) await welcome.getByRole('button', { name: /稍后|later/iu }).click({ timeout: 2_000 }).catch(() => undefined)
        const app = pages().find(candidate => candidate.url().startsWith('dsh-app://app'))
        // The title follows the selected Session and narrow windows collapse the sidebar, so readiness is the composer.
        if (app === undefined || !await app.locator('[data-composer-input]').first().isVisible()) return undefined
        return app
      }).catch(async (error) => {
        const seen = []
        for (const [position, candidate] of pages().entries()) {
          seen.push({ url: candidate.url(), title: await candidate.title().catch(() => '') })
          await candidate.screenshot({ path: join(output, `timeout-${String(scale)}x-page-${String(position)}.png`) }).catch(() => undefined)
        }
        throw new Error(`${String(error)}; pages: ${JSON.stringify(seen)}`)
      })
      const notice = page.getByRole('button', { name: /^(?:继续|Continue)$/u })
      if (await notice.isVisible().catch(() => false)) await notice.click()
      await page.waitForTimeout(1_000)
      const viewport = await page.evaluate(() => ({
        devicePixelRatio: window.devicePixelRatio,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      }))
      await page.screenshot({ path: join(output, `main-${String(scale)}x.png`) })
      const settings = page.getByRole('button', { name: SETTINGS })
      const sidebarCollapsed = !await settings.isVisible()
      if (sidebarCollapsed) await page.getByRole('button', { name: /^(?:打开侧边栏|Open sidebar)$/u }).click()
      await settings.click()
      const dialog = page.getByRole('dialog', { name: SETTINGS })
      await dialog.getByText(/^(?:技能|Skills)$/u).first().click()
      const section = dialog.locator('section[aria-label="技能"], section[aria-label="Skills"]')
      await section.getByRole('region', { name: /^(?:当前生效的技能|Skills in effect)$/u }).waitFor({ timeout: 60_000 })
      const skills = await section.evaluate(root => ({
        sectionOverflow: root.scrollWidth > root.clientWidth,
        dialogFits: (() => {
          const box = root.closest('[role="dialog"]')?.getBoundingClientRect()
          return box !== undefined && box.left >= 0 && box.top >= 0 && box.right <= window.innerWidth && box.bottom <= window.innerHeight
        })(),
        commands: [...root.querySelectorAll('li')].map(item => /\/[a-z0-9-]+/u.exec(item.textContent ?? '')?.[0]).filter(Boolean),
      }))
      await page.screenshot({ path: join(output, `skills-${String(scale)}x.png`) })
      return { scale, ...viewport, sidebarCollapsed, ...skills }
    } finally {
      await browser.close().catch(() => undefined)
    }
  } finally {
    // The ordinary quit asks for confirmation; the qualification ends the whole process tree instead.
    await execute('taskkill', ['/PID', String(child.pid), '/T', '/F']).catch(() => undefined)
    await delay(3_000)
  }
}

const results = []
const failures = []
await execute(installer, ['/S', `/D=${installDirectory}`])
const executable = await application()
for (const [index, scale] of SCALES.entries()) {
  try {
    const result = await qualify(executable, scale, index)
    results.push(result)
    if (Math.abs(result.devicePixelRatio - scale) > 0.01) failures.push(`${String(scale)}x: devicePixelRatio ${String(result.devicePixelRatio)}`)
    if (result.horizontalOverflow) failures.push(`${String(scale)}x: main window overflows horizontally`)
    if (result.sectionOverflow) failures.push(`${String(scale)}x: Skills section overflows horizontally`)
    if (!result.dialogFits) failures.push(`${String(scale)}x: Settings dialog exceeds the window`)
    if (result.commands.length === 0) failures.push(`${String(scale)}x: no skill commands listed`)
  } catch (error) {
    failures.push(`${String(scale)}x: ${String(error)}`)
  }
}

const uninstaller = (await readdir(installDirectory)).find(name => /^uninstall.*\.exe$/iu.test(name))
if (uninstaller === undefined) failures.push('no uninstaller in the installation directory')
else {
  await execute(join(installDirectory, uninstaller), ['/S'])
  await waitFor('uninstallation', 120_000, async () => existsSync(join(installDirectory, uninstaller)) ? undefined : true)
    .catch((error) => { failures.push(String(error)) })
}
const report = { installer, installDirectory, results, failures, uninstalled: !existsSync(executable) }
await writeFile(join(output, 'result.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
if (failures.length > 0) process.exitCode = 1
