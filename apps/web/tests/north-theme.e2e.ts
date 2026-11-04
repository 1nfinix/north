/** North colours through the real Loader and built browser client, without model calls. */
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { expect, it } from 'vitest'
import { openSettings } from './support.ts'
import { launchWebScaffold, watchConsole, seedSession, captureStableAria, compareOrRefreshGolden, webSnapshotMode } from './scaffold.ts'

it('applies North colours in both schemes through the shipped client', async () => {
  const scaffold = await launchWebScaffold({
    extraOverlayPath: fileURLToPath(new URL('./north-theme.overlay.yml', import.meta.url)),
  })
  await seedSession(scaffold, await readFile(new URL('../../../snapshots/web/fresh-round-trip/session.v4.jsonl', import.meta.url), 'utf8'), 'north-theme-review')
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, locale: 'zh-CN' })
    const errors = watchConsole(page)
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
    await page.goto(scaffold.authenticatedUrl)
    await expect.poll(() => page.locator('body').evaluate(element => getComputedStyle(element).getPropertyValue('--dsw-alias-link').trim()), { timeout: 30_000 }).toBe('#1D4ED8')
    const colours = async () => page.locator('body').evaluate((element) => {
      const style = getComputedStyle(element)
      return ['--dsw-alias-bg-base', '--dsw-specific-sidebar-fill', '--dsw-alias-label-primary', '--dsw-alias-link']
        .map(name => style.getPropertyValue(name).trim())
    })
    expect(await colours()).toEqual(['#FFFFFF', '#F3F5F7', '#111827', '#1D4ED8'])
    const output = process.env.NORTH_THEME_REVIEW_DIR
    if (output !== undefined) await mkdir(output, { recursive: true })
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme })
      await expect.poll(colours).toEqual(scheme === 'light'
        ? ['#FFFFFF', '#F3F5F7', '#111827', '#1D4ED8']
        : ['#17191D', '#121418', '#F3F4F6', '#8AB4FF'])
      if (output !== undefined) {
        await page.screenshot({ path: join(output, `${scheme}-north.png`) })
        const original = await page.locator('body').getAttribute('style')
        await page.locator('body').evaluate((element) => {
          for (const name of Array.from(element.style)) {
            if (name.startsWith('--dsw-')) element.style.removeProperty(name)
          }
        })
        await page.screenshot({ path: join(output, `${scheme}-base-palette.png`) })
        await page.locator('body').evaluate((element, style) => { element.setAttribute('style', style ?? '') }, original)
      }
    }
    await page.locator('[role="treeitem"]').first().click()
    await page.locator('[role="treeitem"]').nth(1).click()
    await page.locator('[data-conversation-scroll]').waitFor()
    const transcript = await captureStableAria(page, '[data-conversation-scroll]', scaffold.workspaceCwd)
    await compareOrRefreshGolden(fileURLToPath(new URL('../../../snapshots/web/north-theme/conversation.expected.md', import.meta.url)), transcript, webSnapshotMode())
    await page.getByRole('textbox').last().fill('主题配色验收，不发送')
    const send = page.getByRole('button', { name: '发送消息', exact: true })
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme })
      await expect.poll(() => send.evaluate(element => getComputedStyle(element).backgroundColor))
        .toBe(scheme === 'light' ? 'rgb(17, 24, 39)' : 'rgb(229, 231, 235)')
      await send.hover()
      await expect.poll(() => send.evaluate(element => getComputedStyle(element).backgroundColor))
        .toBe(scheme === 'light' ? 'rgb(38, 50, 68)' : 'rgb(203, 213, 225)')
      await page.mouse.move(0, 0)
    }
    if (output !== undefined) {
      await page.screenshot({ path: join(output, 'dark-conversation.png') })
      await openSettings(page, 'zh')
      await page.getByRole('dialog').waitFor()
      await page.screenshot({ path: join(output, 'dark-settings.png') })
      await page.keyboard.press('Escape')
      await page.setViewportSize({ width: 800, height: 700 })
      await page.screenshot({ path: join(output, 'dark-narrow.png') })
    }
    expect(errors.pageErrors).toEqual([])
  } finally {
    await browser.close()
    await scaffold.close()
  }
})
