import { Context } from '@deepseek-ai/cordis'
import { SessionId } from '@deepseek-ai/dsh-session'
import { expect, it } from 'vitest'
import * as DevBundle from '../src/index.ts'

it('uses one Session id for every configured header and delegates without removing other headers', async () => {
  const ctx = new Context()
  try {
    const fiber = await ctx.plugin(DevBundle, { headers: ['X-Session-Id', 'x-session-affinity'] })
    let delegated = false
    ctx.on('llm-pi-ai/request-headers', (_request, headers, next) => {
      delegated = true
      headers.set('X-Other-Contributor', 'retained')
      return next()
    })
    const headers = new Headers({ 'X-Configured': 'retained' })
    const result = ctx.waterfall('llm-pi-ai/request-headers', {
      provider: 'north-lan', model: 'example-model-a', baseURL: 'https://example.com/v1',
      sessionId: SessionId('session-example'),
    }, headers, () => headers)
    expect(delegated).toBe(true)
    expect(result.get('X-Session-Id')).toBe('session-example')
    expect(result.get('x-session-affinity')).toBe('session-example')
    expect(result.get('X-Configured')).toBe('retained')
    expect(result.get('X-Other-Contributor')).toBe('retained')
    await fiber.dispose()
    const afterDispose = new Headers()
    ctx.waterfall('llm-pi-ai/request-headers', {
      provider: 'north-lan', model: 'example-model-a', baseURL: 'https://example.com/v1',
      sessionId: SessionId('session-example'),
    }, afterDispose, () => afterDispose)
    expect(afterDispose.has('X-Session-Id')).toBe(false)
  } finally {
    await ctx.fiber.dispose()
  }
})

it('gives calls without a Session id a distinct UUID per request', async () => {
  const ctx = new Context()
  try {
    await ctx.plugin(DevBundle, { headers: ['X-Session-Id', 'x-session-affinity'] })
    const request = { provider: 'north-lan', model: 'example-model-a', baseURL: 'https://example.com/v1' }
    const first = new Headers()
    const second = new Headers()
    ctx.waterfall('llm-pi-ai/request-headers', request, first, () => first)
    ctx.waterfall('llm-pi-ai/request-headers', request, second, () => second)
    const firstId = first.get('X-Session-Id')
    expect(firstId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u)
    expect(first.get('x-session-affinity')).toBe(firstId)
    expect(second.get('X-Session-Id')).not.toBe(firstId)
    expect(second.get('x-session-affinity')).toBe(second.get('X-Session-Id'))
  } finally {
    await ctx.fiber.dispose()
  }
})
