/** Browser calls behind the skills section: listing and the file-manager launch through open-in-app. */

import { describe, expect, it } from 'vitest'
import { loadNorthSkills, NorthSkillsLoadError, openFolder, type Fetch } from '../src/client/controller.ts'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/** Carrier answering by path and recording every request. */
function carrier(routes: Record<string, Response>, calls: Array<[string, RequestInit | undefined]> = []): Fetch {
  return (input, init) => {
    calls.push([input, init])
    const response = routes[input]
    if (response === undefined) throw new Error(`unexpected request: ${input}`)
    return Promise.resolve(response)
  }
}

describe('loadNorthSkills', () => {
  it('returns the route snapshot and rejects a failed status', async () => {
    const snapshot = { directory: '/h/skills', bundled: [], folder: [], invalid: [] }
    await expect(loadNorthSkills(carrier({ 'north-skills': json(200, snapshot) }))).resolves.toEqual(snapshot)
    await expect(loadNorthSkills(carrier({ 'north-skills': json(401, {}) }))).rejects.toThrow('HTTP 401')
  })

  it('carries the folder a 500 names so the section can still offer it', async () => {
    const failed = loadNorthSkills(carrier({ 'north-skills': json(500, { code: 'unreadable', message: 'EACCES', directory: '/h/skills' }) }))
    await expect(failed).rejects.toBeInstanceOf(NorthSkillsLoadError)
    await expect(failed).rejects.toMatchObject({ status: 500, directory: '/h/skills' })
    await expect(loadNorthSkills(carrier({ 'north-skills': json(401, {}) }))).rejects.toMatchObject({ status: 401, directory: undefined })
    await expect(loadNorthSkills(carrier({ 'north-skills': json(500, { directory: 7 }) }))).rejects.toMatchObject({ directory: undefined })
    await expect(loadNorthSkills(carrier({ 'north-skills': new Response('gateway down', { status: 502 }) }))).rejects.toMatchObject({ status: 502, directory: undefined })
  })
})

describe('openFolder', () => {
  it('posts the directory to the first offered file manager', async () => {
    const calls: Array<[string, RequestInit | undefined]> = []
    const outcome = await openFolder(carrier({
      'open-in-app/apps': json(200, { apps: ['vscode', 'explorer'] }),
      'open-in-app/open': json(200, { ok: true }),
    }, calls), 'C:/skills')
    expect(outcome).toBe('opened')
    expect(calls[1]).toEqual(['open-in-app/open', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ app: 'explorer', path: 'C:/skills' }),
    }])
  })

  it('reports an unavailable or failed launch', async () => {
    await expect(openFolder(carrier({ 'open-in-app/apps': json(404, {}) }), '/s')).resolves.toBe('unavailable')
    await expect(openFolder(carrier({ 'open-in-app/apps': json(200, { apps: ['vscode'] }) }), '/s')).resolves.toBe('unavailable')
    await expect(openFolder(carrier({
      'open-in-app/apps': json(200, { apps: ['finder'] }),
      'open-in-app/open': json(404, {}),
    }), '/s')).resolves.toBe('failed')
  })
})
