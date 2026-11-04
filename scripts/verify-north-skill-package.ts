/** Check the North skill assets after build:artifacts and in the npm package it publishes. */

import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pnpmInvocation } from './pnpm-invocation.ts'
import { capture } from './release/process.ts'
import { tarballFiles } from './release/tarball.ts'

const packageDir = resolve(import.meta.dirname, '../packages/north/skill-writing')
const chart = join(packageDir, 'assets/chart/echarts.min.js')
if (!existsSync(chart) || statSync(chart).size === 0) {
  throw new Error(`North skill package: missing or empty built asset ${chart}; run pnpm run build:artifacts`)
}

const output = mkdtempSync(join(tmpdir(), 'dsh-north-skill-pack-'))
try {
  const invocation = pnpmInvocation(['--dir', packageDir, 'pack', '--pack-destination', output])
  capture(invocation.command, invocation.args)
  const tarballs = readdirSync(output).filter(name => name.endsWith('.tgz'))
  const [tarball] = tarballs
  if (tarball === undefined || tarballs.length !== 1) throw new Error(`North skill package: expected one npm tarball, found ${String(tarballs.length)}`)
  const files = new Set(tarballFiles(join(output, tarball)))
  for (const path of [
    'assets/chart/echarts.min.js',
    'assets/chart/SKILL.md',
    'assets/browser-check/SKILL.md',
    'assets/frontend-page/SKILL.md',
    'assets/frontend-page/LICENSE.txt',
    'assets/skill-creator/SKILL.md',
    'assets/skill-creator/LICENSE.txt',
    'assets/official-notice/references/document-types.md',
    'assets/official-notice/references/word-layout.md',
    'assets/ppt-report/SKILL.md',
    'assets/ppt-report/scripts/deck_common.py',
    'assets/ppt-report/scripts/inspect_template.py',
    'assets/ppt-report/scripts/fill_template.py',
    'assets/ppt-report/scripts/extract_deck.py',
    'assets/ppt-report/references/content-plan.md',
    'assets/ppt-report/references/template-skill.md',
    'assets/ppt-report/assets/default-template.pptx',
  ]) {
    if (!files.has(`package/${path}`)) throw new Error(`North skill package: npm tarball lacks ${path}`)
  }
  console.log('North skill package: built ECharts and required skill resources are packed.')
} finally {
  rmSync(output, { recursive: true, force: true })
}
