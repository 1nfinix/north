// @vitest-environment jsdom
/** The skills section: loading, the folder card and its actions, the three skill lists, invocation labels, and failed loads. */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NorthSkillsSection, type NorthSkillsSectionProps } from '../src/client/SkillsSection.tsx'
import { zh } from '../src/client/locales.ts'
import type { NorthSkillsSnapshot } from '../src/shared.ts'
import { NorthSkillsLoadError, type OpenFolderOutcome } from '../src/client/controller.ts'

afterEach(cleanup)

const t = (key: keyof typeof zh) => zh[key]

const both = { modelInvocable: true, userInvocable: true }

const snapshot: NorthSkillsSnapshot = {
  directory: '/Users/a/.north/skills',
  bundled: [{ name: 'weekly-report', description: '周报', invocation: both }],
  folder: [{ name: 'loan-memo', description: '贷款审查', invocation: both }],
  invalid: [
    { entry: 'draft', problem: 'missing-skill-md' },
    { entry: 'broken.md', problem: 'invalid-frontmatter' },
    { entry: 'Bad Name', problem: 'invalid-name' },
    { entry: 'legacy.md', problem: 'invalid-invocation' },
    { entry: 'dangling', problem: 'unreadable' },
  ],
}

function renderSection(load: () => Promise<NorthSkillsSnapshot>, open: (directory: string) => Promise<OpenFolderOutcome> = () => Promise.resolve('opened')) {
  const props = { t, load, open } as NorthSkillsSectionProps
  return render(<NorthSkillsSection {...props} />)
}

describe('NorthSkillsSection', () => {
  it('shows loading, then the folder, the added, unusable and built-in skills', async () => {
    renderSection(() => Promise.resolve(snapshot))
    expect(screen.getByText(zh.loading)).toBeTruthy()
    expect(await screen.findByText(snapshot.directory)).toBeTruthy()
    expect(screen.getByText('/loan-memo')).toBeTruthy()
    expect(screen.getByText('/weekly-report')).toBeTruthy()
    expect(screen.getByText(zh.problemMissingSkillMd)).toBeTruthy()
    expect(screen.getByText(zh.problemInvalidFrontmatter)).toBeTruthy()
    expect(screen.getByText(zh.problemInvalidName)).toBeTruthy()
    expect(screen.getByText(zh.problemInvalidInvocation)).toBeTruthy()
    expect(screen.getByText('dangling')).toBeTruthy()
    expect(screen.getByText(zh.problemUnreadable)).toBeTruthy()
  })

  it('shows a / command only for user-invocable skills and labels the other policies', async () => {
    renderSection(() => Promise.resolve({
      ...snapshot,
      folder: [
        { name: 'audit-hidden', description: 'a', invocation: { modelInvocable: true, userInvocable: false } },
        { name: 'manual-only', description: 'b', invocation: { modelInvocable: false, userInvocable: true } },
        { name: 'switched-off', description: 'c', invocation: { modelInvocable: false, userInvocable: false } },
      ],
      invalid: [],
    }))
    expect(await screen.findByText('audit-hidden')).toBeTruthy()
    expect(screen.queryByText('/audit-hidden')).toBeNull()
    expect(screen.getByText(zh.invocationModelOnly)).toBeTruthy()
    expect(screen.getByText('/manual-only')).toBeTruthy()
    expect(screen.getByText(zh.invocationUserOnly)).toBeTruthy()
    expect(screen.getByText('switched-off')).toBeTruthy()
    expect(screen.queryByText('/switched-off')).toBeNull()
    expect(screen.getByText(zh.invocationOff)).toBeTruthy()
    expect(screen.getByText('/weekly-report')).toBeTruthy()
    expect(screen.queryAllByText(zh.invocationModelOnly)).toHaveLength(1)
  })

  it('says so when no skill was added and omits the unusable list', async () => {
    renderSection(() => Promise.resolve({ ...snapshot, folder: [], invalid: [] }))
    expect(await screen.findByText(zh.folderEmpty)).toBeTruthy()
    expect(screen.queryByText(zh.invalidTitle)).toBeNull()
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
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.click(button)
    expect((await screen.findByRole('status')).textContent).toBe(zh.openUnavailable)
    fireEvent.click(button)
    expect(await screen.findByText(zh.openFailed)).toBeTruthy()
    fireEvent.click(button)
    await act(() => Promise.resolve())
    expect(screen.getByRole('status').textContent).toBe(zh.openFailed)
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
})
