// @vitest-environment jsdom
/**
 * The skills section: loading, the folder card and its actions, the effective catalog,
 * folder diagnostics, invocation labels, failed loads, and concurrent refreshes.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NorthSkillsSection, type NorthSkillsSectionProps } from '../src/client/SkillsSection.tsx'
import { BUNDLED_TITLE, en, zh } from '../src/client/locales.ts'
import { NORTH_WRITING_PROVIDER, SKILL_NAMES, type NorthEffectiveSkill, type NorthSkillsSnapshot } from '../src/shared.ts'
import { NorthSkillsLoadError, type OpenFolderOutcome } from '../src/client/controller.ts'

afterEach(cleanup)

const t = (key: keyof typeof zh) => zh[key]

const both = { modelInvocable: true, userInvocable: true }

const builtIn = (name: string, description: string): NorthEffectiveSkill =>
  ({ name, description, invocation: both, source: 'bundled', provider: NORTH_WRITING_PROVIDER })
const fromFolder = (name: string, description: string, invocation = both): NorthEffectiveSkill =>
  ({ name, description, invocation, source: 'user-dsh', provider: 'filesystem', path: `/Users/a/.north/skills/${name}.md` })

const snapshot: NorthSkillsSnapshot = {
  directory: '/Users/a/.north/skills',
  effective: [
    fromFolder('loan-memo', '贷款审查'),
    { name: 'repo-guide', description: '项目说明', invocation: both, source: 'project-dsh', provider: 'filesystem', path: '/work/.dsh/skills/repo-guide.md' },
    { name: 'shared-tool', description: '共享技能', invocation: both, source: 'user-agents', provider: 'filesystem' },
    builtIn('weekly-report', '整理工作记录'),
  ],
  complete: true,
  invalid: [
    { entry: 'draft', problem: 'missing-skill-md' },
    { entry: 'broken.md', problem: 'invalid-frontmatter' },
    { entry: 'Bad Name', problem: 'invalid-name' },
    { entry: 'legacy.md', problem: 'invalid-invocation' },
    { entry: 'dangling', problem: 'unreadable' },
  ],
  inactive: [],
}

/** A load whose settlement the test controls. */
interface Deferred {
  promise: Promise<NorthSkillsSnapshot>
  resolve: (value: NorthSkillsSnapshot) => void
  reject: (reason: unknown) => void
}

function deferred(): Deferred {
  let resolve!: (value: NorthSkillsSnapshot) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<NorthSkillsSnapshot>((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}

function renderSection(load: () => Promise<NorthSkillsSnapshot>, open: (directory: string) => Promise<OpenFolderOutcome> = () => Promise.resolve('opened')) {
  const props = { t, load, open } as NorthSkillsSectionProps
  return render(<NorthSkillsSection {...props} />)
}

function region(name: string): HTMLElement {
  return screen.getByRole('region', { name })
}

describe('NorthSkillsSection', () => {
  it('shows loading, then the folder, the effective skills with their sources, and the folder diagnostics', async () => {
    renderSection(() => Promise.resolve(snapshot))
    expect(screen.getByText(zh.loading)).toBeTruthy()
    expect(await screen.findByText(snapshot.directory)).toBeTruthy()
    const effective = region(zh.effectiveTitle)
    expect(within(effective).getByText('/loan-memo').closest('li')!.textContent).toContain(zh.sourceUserDsh)
    expect(within(effective).getByText('/repo-guide').closest('li')!.textContent).toContain(zh.sourceProjectDsh)
    expect(within(effective).getByText('/shared-tool').closest('li')!.textContent).toContain(zh.sourceUserAgents)
    expect(within(effective).getByText(zh.skillWeeklyReport).closest('li')!.textContent).toContain(zh.sourceBundled)
    const diagnostics = region(zh.diagnosticsTitle)
    expect(within(diagnostics).getByText(zh.problemMissingSkillMd)).toBeTruthy()
    expect(within(diagnostics).getByText(zh.problemInvalidFrontmatter)).toBeTruthy()
    expect(within(diagnostics).getByText(zh.problemInvalidName)).toBeTruthy()
    expect(within(diagnostics).getByText(zh.problemInvalidInvocation)).toBeTruthy()
    expect(within(diagnostics).getByText('dangling')).toBeTruthy()
    expect(within(diagnostics).getByText(zh.problemUnreadable)).toBeTruthy()
    expect(screen.queryByText(zh.incomplete)).toBeNull()
  })

  it('lists an overridden or unloaded folder skill only as a diagnostic, naming the winning source', async () => {
    renderSection(() => Promise.resolve({
      ...snapshot,
      effective: [{ name: 'dup', description: '项目版本', invocation: both, source: 'project-dsh', provider: 'filesystem', path: '/work/.dsh/skills/dup.md' }],
      invalid: [],
      inactive: [
        { entry: 'dup.md', name: 'dup', winner: { source: 'project-dsh', provider: 'filesystem', path: '/work/.dsh/skills/dup.md' } },
        { entry: 'alpha.md', name: 'alpha' },
      ],
    }))
    const effective = await screen.findByRole('region', { name: zh.effectiveTitle })
    expect(within(effective).getAllByRole('listitem')).toHaveLength(1)
    expect(within(effective).queryByText('/alpha')).toBeNull()
    const diagnostics = region(zh.diagnosticsTitle)
    const overridden = within(diagnostics).getByText('dup.md').closest('li')!
    expect(overridden.textContent).toContain(zh.inactiveOverridden)
    expect(overridden.textContent).toContain(zh.sourceProjectDsh)
    expect(within(diagnostics).getByText('alpha.md').closest('li')!.textContent).toContain(zh.inactiveNotLoaded)
  })

  it('warns that the list can be incomplete when discovery did not complete', async () => {
    renderSection(() => Promise.resolve({ ...snapshot, complete: false }))
    expect((await screen.findByRole('status')).textContent).toBe(zh.incomplete)
  })

  it('shows a / command only for user-invocable skills and labels the other policies', async () => {
    renderSection(() => Promise.resolve({
      ...snapshot,
      effective: [
        fromFolder('audit-hidden', 'a', { modelInvocable: true, userInvocable: false }),
        fromFolder('manual-only', 'b', { modelInvocable: false, userInvocable: true }),
        fromFolder('switched-off', 'c', { modelInvocable: false, userInvocable: false }),
        { ...builtIn('translation', '把文本译成目标语言'), invocation: { modelInvocable: true, userInvocable: false } },
        builtIn('weekly-report', '整理工作记录'),
      ],
      invalid: [],
    }))
    expect(await screen.findByText('audit-hidden')).toBeTruthy()
    expect(screen.queryByText('/audit-hidden')).toBeNull()
    expect(screen.getByText('/manual-only')).toBeTruthy()
    expect(screen.getByText(zh.invocationUserOnly)).toBeTruthy()
    expect(screen.getByText('switched-off')).toBeTruthy()
    expect(screen.queryByText('/switched-off')).toBeNull()
    expect(screen.getByText(zh.invocationOff)).toBeTruthy()
    expect(screen.getByText(zh.skillTranslation).closest('li')!.textContent).toContain(zh.invocationModelOnly)
    expect(screen.queryByText('/translation')).toBeNull()
    expect(screen.getByText('/weekly-report')).toBeTruthy()
    expect(screen.queryAllByText(zh.invocationModelOnly)).toHaveLength(2)
  })

  it('titles only the North built-in skills and keeps the command beside the title', async () => {
    renderSection(() => Promise.resolve({
      ...snapshot,
      effective: [builtIn('weekly-report', '整理工作记录'), fromFolder('translation', '用户自己的翻译')],
      invalid: [],
    }))
    const title = await screen.findByText(zh.skillWeeklyReport)
    expect(title.closest('li')!.textContent).toContain('/weekly-report')
    // A folder skill that reuses a built-in name keeps its own name as the heading.
    expect(screen.queryByText(zh.skillTranslation)).toBeNull()
    expect(screen.getByText('用户自己的翻译').closest('li')!.textContent).toContain('/translation')
  })

  it('titles every built-in skill in both locales', () => {
    for (const name of SKILL_NAMES) {
      expect(zh[BUNDLED_TITLE[name]].length, name).toBeGreaterThan(0)
      expect(en[BUNDLED_TITLE[name]].length, name).toBeGreaterThan(0)
    }
  })

  it('says so when no skill is in effect and omits the diagnostics', async () => {
    renderSection(() => Promise.resolve({ ...snapshot, effective: [], invalid: [] }))
    expect(await screen.findByText(zh.effectiveEmpty)).toBeTruthy()
    expect(screen.queryByRole('region', { name: zh.diagnosticsTitle })).toBeNull()
  })

  it('keeps the last listing, the folder and its actions when a refresh fails', async () => {
    const load = vi.fn<() => Promise<NorthSkillsSnapshot>>().mockResolvedValueOnce(snapshot).mockRejectedValueOnce(new Error('down'))
    renderSection(load)
    fireEvent.click(await screen.findByRole('button', { name: zh.refresh }))
    expect((await screen.findByRole('alert')).textContent).toBe(zh.refreshFailed)
    expect(screen.getByText(snapshot.directory)).toBeTruthy()
    expect(screen.getByText('/loan-memo')).toBeTruthy()
    expect(screen.getByText('/weekly-report')).toBeTruthy()
    expect(screen.getByRole('button', { name: zh.open })).toBeTruthy()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('clears the refresh warning once a later refresh succeeds', async () => {
    const load = vi.fn<() => Promise<NorthSkillsSnapshot>>()
      .mockResolvedValueOnce(snapshot)
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce({ ...snapshot, effective: [fromFolder('fresh', '新技能')] })
    renderSection(load)
    fireEvent.click(await screen.findByRole('button', { name: zh.refresh }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: zh.refresh }))
    expect(await screen.findByText('/fresh')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('retries in place after the first load fails', async () => {
    const load = vi.fn<() => Promise<NorthSkillsSnapshot>>().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(snapshot)
    renderSection(load)
    expect((await screen.findByRole('alert')).textContent).toBe(zh.loadFailed)
    fireEvent.click(screen.getByRole('button', { name: zh.refresh }))
    expect(await screen.findByText(snapshot.directory)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('still offers the folder after a first load fails with the folder named', async () => {
    const open = vi.fn<(directory: string) => Promise<OpenFolderOutcome>>().mockResolvedValue('opened')
    const load = vi.fn<() => Promise<NorthSkillsSnapshot>>()
      .mockRejectedValueOnce(new NorthSkillsLoadError(500, snapshot.directory))
      .mockResolvedValueOnce(snapshot)
    renderSection(load, open)
    expect((await screen.findByRole('alert')).textContent).toBe(zh.loadFailed)
    expect(screen.getByText(snapshot.directory)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: zh.open }))
    expect(open).toHaveBeenCalledWith(snapshot.directory)
    fireEvent.click(screen.getByRole('button', { name: zh.refresh }))
    expect(await screen.findByText('/loan-memo')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('opens the folder and explains an unavailable, failed or rejected launch', async () => {
    const open = vi.fn<(directory: string) => Promise<OpenFolderOutcome>>()
      .mockResolvedValueOnce('opened')
      .mockResolvedValueOnce('unavailable')
      .mockResolvedValueOnce('failed')
      .mockRejectedValueOnce(new Error('offline'))
    renderSection(() => Promise.resolve(snapshot), open)
    const button = await screen.findByRole('button', { name: zh.open })
    fireEvent.click(button)
    await act(() => Promise.resolve())
    expect(open).toHaveBeenCalledWith(snapshot.directory)
    expect(screen.queryByText(zh.openUnavailable)).toBeNull()
    fireEvent.click(button)
    expect(await screen.findByText(zh.openUnavailable)).toBeTruthy()
    fireEvent.click(button)
    expect(await screen.findByText(zh.openFailed)).toBeTruthy()
    fireEvent.click(button)
    await act(() => Promise.resolve())
    expect(screen.getByText(zh.openFailed)).toBeTruthy()
  })

  it('ignores a load that settles after unmount', async () => {
    let resolve: (value: NorthSkillsSnapshot) => void = () => {}
    let reject: (reason: unknown) => void = () => {}
    const first = renderSection(() => new Promise((ok) => { resolve = ok }))
    first.unmount()
    await act(async () => { resolve(snapshot) })
    const second = renderSection(() => new Promise((_ok, fail) => { reject = fail }))
    second.unmount()
    await act(async () => { reject(new Error('late')) })
    expect(screen.queryByText(snapshot.directory)).toBeNull()
  })

  it('commits only the latest refresh when an older successful refresh settles later', async () => {
    const older = deferred()
    const newer = deferred()
    const load = vi.fn<() => Promise<NorthSkillsSnapshot>>()
      .mockResolvedValueOnce(snapshot)
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise)
    renderSection(load)
    const refresh = await screen.findByRole('button', { name: zh.refresh })
    fireEvent.click(refresh)
    fireEvent.click(refresh)
    expect(load).toHaveBeenCalledTimes(3)
    await act(async () => { newer.resolve({ ...snapshot, effective: [fromFolder('newest', '最新')] }) })
    expect(screen.getByText('/newest')).toBeTruthy()
    await act(async () => { older.resolve({ ...snapshot, effective: [fromFolder('outdated', '过时')] }) })
    expect(screen.getByText('/newest')).toBeTruthy()
    expect(screen.queryByText('/outdated')).toBeNull()
  })

  it('does not show an older refresh failure after a newer refresh succeeded', async () => {
    const older = deferred()
    const newer = deferred()
    const load = vi.fn<() => Promise<NorthSkillsSnapshot>>()
      .mockResolvedValueOnce(snapshot)
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise)
    renderSection(load)
    const refresh = await screen.findByRole('button', { name: zh.refresh })
    fireEvent.click(refresh)
    fireEvent.click(refresh)
    await act(async () => { newer.resolve({ ...snapshot, effective: [fromFolder('newest', '最新')] }) })
    await act(async () => { older.reject(new Error('late failure')) })
    expect(screen.getByText('/newest')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('ignores a refresh that settles after unmount', async () => {
    const pending = deferred()
    const load = vi.fn<() => Promise<NorthSkillsSnapshot>>().mockResolvedValueOnce(snapshot).mockReturnValueOnce(pending.promise)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const view = renderSection(load)
      fireEvent.click(await screen.findByRole('button', { name: zh.refresh }))
      view.unmount()
      await act(async () => { pending.reject(new Error('late')) })
      expect(errors).not.toHaveBeenCalled()
      expect(screen.queryByRole('alert')).toBeNull()
    } finally {
      errors.mockRestore()
    }
  })
})
