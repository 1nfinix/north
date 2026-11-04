import { execFileSync } from 'node:child_process'
import { Context } from '@deepseek-ai/cordis'
import Sandbox from '@deepseek-ai/dsh-sandbox-local'
import SandboxPolicy from '@deepseek-ai/dsh-sandbox-policy'
import SessionProjections from '@deepseek-ai/dsh-session-projection'
import { onTestFinished } from 'vitest'
import type { SandboxMode } from '@deepseek-ai/dsh-sandbox'
import { resolvePythonBin } from '../src/index.ts'

/**
 * The CPython executable that `python3` on the caller's `PATH` finally runs. A wrapper found there first, such as a
 * pyenv shim, runs on every launch and may add variables (pyenv adds `PATH`) to the environment the runtime gives the
 * child, so tests that inspect that environment name this interpreter directly. Falls back to the bare name when no
 * `python3` resolves, which the runtime's load check then reports.
 */
export const TEST_PYTHON = ((): string => {
  const bin = resolvePythonBin('python3')
  if (bin === undefined) return 'python3'
  return execFileSync(bin, ['-I', '-c', 'import sys; sys.stdout.write(sys.executable)'], { encoding: 'utf8' })
})()

/** Mount the Python runtime's policy and confinement providers with owned teardown. */
export async function createRuntimeContext(policy: { mode?: SandboxMode; workspaceRoot?: string } = {}): Promise<Context> {
  const ctx = new Context()
  onTestFinished(async () => { await ctx.fiber.dispose() })
  await ctx.plugin(Sandbox, {})
  await ctx.plugin(SessionProjections)
  await ctx.plugin(SandboxPolicy, { mode: 'danger-full-access', ...policy })
  return ctx
}
