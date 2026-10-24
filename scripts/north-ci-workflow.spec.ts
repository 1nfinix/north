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
