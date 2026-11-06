/** North CI reaches the North distribution Web regressions through one narrow, artifact-ordered gate aggregate. */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { gatesForMode } from './run-gates.ts'

const root = resolve(import.meta.dirname, '..')
const NORTH_WEB_TESTS = ['apps/web/tests/north-distribution.e2e.ts', 'apps/web/tests/north-theme.e2e.ts']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function steps(job: Record<string, unknown>): Record<string, unknown>[] {
  if (!Array.isArray(job.steps)) throw new TypeError('North CI job must define steps')
  return job.steps.filter(isRecord)
}

const scripts = (JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { scripts: Record<string, string> }).scripts

describe('North CI', () => {
  it('runs on pull requests to north or manual dispatch, comparing archives against the pull request base', () => {
    const workflow: unknown = yaml.load(readFileSync(resolve(root, '.github/workflows/north-ci.yml'), 'utf8'))
    if (!isRecord(workflow) || !isRecord(workflow.jobs)) throw new TypeError('North CI must define jobs')
    expect(workflow.on).toEqual({ pull_request: { branches: ['north'] }, workflow_dispatch: null })
    const job = workflow.jobs.static
    if (!isRecord(job)) throw new TypeError('North CI must define the static job')
    expect(job.env).toMatchObject({ NODE_OPTIONS: '--max-old-space-size=6144' })
    const gate = steps(job).find(step => step.run === 'pnpm run check:ci:static')
    if (!isRecord(gate?.env) || typeof gate.env.DSH_ARCHIVE_BASE_REF !== 'string') throw new TypeError('North CI static gate must define its archive base')
    expect(gate.env.DSH_ARCHIVE_BASE_REF).toContain('github.event.pull_request.base.sha')
  })

  it('runs the North Web gate aggregate after installing only Chromium on a hosted Linux runner', () => {
    const workflow: unknown = yaml.load(readFileSync(resolve(root, '.github/workflows/north-ci.yml'), 'utf8'))
    if (!isRecord(workflow) || !isRecord(workflow.jobs)) throw new TypeError('North CI must define jobs')
    const job = workflow.jobs['north-web']
    if (!isRecord(job)) throw new TypeError('North CI must define the north-web job')
    expect(job['runs-on']).toBe('ubuntu-latest')
    const runs = steps(job).map(step => typeof step.run === 'string' ? step.run.trim() : '')
    const install = runs.findIndex(run => run.startsWith('pnpm install --frozen-lockfile'))
    const browser = runs.findIndex(run => /playwright install --with-deps chromium$/.test(run))
    const gate = runs.indexOf('pnpm run check:ci:north-web')
    expect(install).toBeGreaterThanOrEqual(0)
    expect(browser).toBeGreaterThan(install)
    expect(gate).toBeGreaterThan(browser)
  })

  it('qualifies an unsigned Windows Desktop on dispatch or its own changes, on a hosted runner, without publishing', () => {
    const workflowText = readFileSync(resolve(root, '.github/workflows/north-windows-desktop.yml'), 'utf8')
    expect(workflowText).not.toContain('secrets.')
    const workflow: unknown = yaml.load(workflowText)
    if (!isRecord(workflow) || !isRecord(workflow.jobs)) throw new TypeError('North Windows qualification must define jobs')
    if (!isRecord(workflow.on)) throw new TypeError('North Windows qualification must define its triggers')
    expect(workflow.on).toEqual({
      workflow_dispatch: null,
      push: { branches: ['north', 'main'], paths: ['.github/workflows/north-windows-desktop.yml', 'apps/desktop/scripts/north-windows-scaling.mjs'] },
    })
    const job = workflow.jobs['qualify']
    if (!isRecord(job)) throw new TypeError('North Windows qualification must define the qualify job')
    expect(job['runs-on']).toBe('windows-latest')
    const jobSteps = steps(job)
    const placeholderStep = jobSteps.find(step => step.name === 'Write packaged North placeholder')
    expect(placeholderStep?.run).toContain("-Value '# Put real settings in %USERPROFILE%\\.north\\north.env; see north.env.example for variables.'")
    expect(placeholderStep?.run).toContain('"NORTH_ENV_PATH=$path" | Out-File -FilePath $env:GITHUB_ENV -Append')
    expect(jobSteps.findIndex(step => step === placeholderStep)).toBeLessThan(jobSteps.findIndex(step => step.name === 'Check packaging configuration and toolchain'))
    const installerArtifact = jobSteps.find(step => step.name === 'Retain unsigned installer')
    expect(installerArtifact?.with).toMatchObject({ 'retention-days': 7 })
    const runs = steps(job).map(step => typeof step.run === 'string' ? step.run.trim() : '')
    const order = [
      'pnpm install --frozen-lockfile',
      'pnpm run package:desktop:win:x64:unsigned --check',
      'pnpm run package:desktop:win:x64:unsigned\n',
      'pnpm --dir apps/desktop run test:installer',
      'pnpm --dir apps/desktop run test:updates:local',
      'node apps/desktop/scripts/north-windows-scaling.mjs',
    ].map(command => runs.findIndex(run => `${run}\n`.includes(command)))
    expect(order.every(index => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(runs.findIndex(run => run.includes('Set-Content -Path $path'))).toBeLessThan(order[1]!)
    expect(runs.join('\n')).not.toMatch(/upload:|--signed|DOWNLOAD_|_SECRET/)
    expect(existsSync(resolve(root, 'apps/desktop/scripts/north-windows-scaling.mjs'))).toBe(true)
  })

  it('builds public unsigned macOS DMGs for both architectures without release settings', () => {
    const workflowText = readFileSync(resolve(root, '.github/workflows/north-macos-desktop.yml'), 'utf8')
    expect(workflowText).not.toContain('secrets.')
    const workflow: unknown = yaml.load(workflowText)
    if (!isRecord(workflow) || !isRecord(workflow.jobs) || !isRecord(workflow.on)) throw new TypeError('North macOS package must define jobs and triggers')
    expect(workflow.on).toEqual({
      workflow_dispatch: null,
      push: { branches: ['north', 'main'], paths: ['.github/workflows/north-macos-desktop.yml'] },
    })
    const job = workflow.jobs.package
    if (!isRecord(job) || !isRecord(job.strategy) || !isRecord(job.strategy.matrix)) throw new TypeError('North macOS package must define an architecture matrix')
    expect(job['runs-on']).toBe('${{ matrix.runner }}')
    expect(job.strategy.matrix.include).toEqual([{ arch: 'arm64', runner: 'macos-latest' }, { arch: 'x64', runner: 'macos-15-intel' }])
    const jobSteps = steps(job)
    const runs = jobSteps.map(step => typeof step.run === 'string' ? step.run : '')
    const placeholder = jobSteps.find(step => step.name === 'Write packaged North placeholder')
    expect(placeholder?.run).toContain("'# Put real settings in ~/.north/north.env; see north.env.example for variables.'")
    expect(placeholder?.run).toContain('NORTH_ENV_PATH=$RUNNER_TEMP/north.env')
    expect(runs).toContain('pnpm run package:desktop:mac:${{ matrix.arch }}:unsigned -- --check')
    expect(runs).toContain('pnpm run package:desktop:mac:${{ matrix.arch }}:unsigned')
    expect(runs.findIndex(run => run.includes('NORTH_ENV_PATH='))).toBeLessThan(runs.findIndex(run => run.includes('-- --check')))
    expect(runs.findIndex(run => run.includes('-- --check'))).toBeLessThan(runs.indexOf('pnpm run package:desktop:mac:${{ matrix.arch }}:unsigned'))
    expect(runs.join('\n')).toContain('test "$(uname -m)" = "$expected"')
    const installer = jobSteps.find(step => step.name === 'Retain unsigned installer')
    const diagnostics = jobSteps.find(step => step.name === 'Retain packaging diagnostics')
    expect(installer?.with).toMatchObject({ 'retention-days': 7, 'if-no-files-found': 'error' })
    expect(installer?.with).toMatchObject({ name: 'north-macos-${{ matrix.arch }}-unsigned-${{ github.run_id }}-${{ github.run_attempt }}' })
    if (!isRecord(installer?.with) || typeof installer.with.path !== 'string') throw new TypeError('North macOS installer artifact must define paths')
    expect(installer.with.path).toContain('unsigned-artifacts/*.dmg')
    expect(installer.with.path).toContain('unsigned-artifacts/*.zip')
    expect(diagnostics?.with).toMatchObject({ 'retention-days': 14, path: 'apps/desktop/.desktop-build/packaging-runs/' })
  })

  it('uses build and site gates rather than installer packaging for North CI Windows blocking', () => {
    const workflow: unknown = yaml.load(readFileSync(resolve(root, '.github/workflows/north-ci.yml'), 'utf8'))
    if (!isRecord(workflow) || !isRecord(workflow.jobs)) throw new TypeError('North CI must define jobs')
    const job = workflow.jobs['windows-build']
    if (!isRecord(job)) throw new TypeError('North CI must define the windows-build job')
    expect(steps(job).some(step => step.run === 'pnpm run check:ci:windows-blocking')).toBe(true)
    expect(scripts['check:ci:windows-blocking']).toBe('tsx scripts/run-gates.ts ci-windows-blocking')
    const gates = gatesForMode('ci-windows-blocking')
    expect(gates.map(gate => gate.id)).toEqual(['windows-build', 'windows-site'])
    expect(gates[0]?.args).toContain('build')
    expect(gates[1]?.args).toContain('docs:build')
    expect(gates.flatMap(gate => gate.args).join(' ')).not.toContain('package:desktop')
  })

  it('builds the artifacts before replaying exactly the two North distribution Web files', () => {
    expect(scripts['check:ci:north-web']).toBe('tsx scripts/run-gates.ts ci-north-web')
    const gates = gatesForMode('ci-north-web')
    expect(gates.map(gate => gate.id)).toEqual(['build', 'north-web'])
    const [build, web] = gates
    expect(build!.args).toContain('build:artifacts')
    expect(web!.needs).toEqual(['build'])
    expect(web!.env).toMatchObject({ DSH_SNAPSHOT: 'replay' })
    expect(web!.args).toContain('test:web:north')
    const command = scripts['test:web:north']!.split(/\s+/)
    expect(command.slice(0, 4)).toEqual(['vitest', 'run', '--config', 'vitest.web.config.ts'])
    expect(command.slice(4).sort()).toEqual([...NORTH_WEB_TESTS].sort())
    for (const path of NORTH_WEB_TESTS) expect(existsSync(resolve(root, path)), path).toBe(true)
  })
})
