/** North development capability layer and request-local Session header contributor. */

import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-llm-pi-ai'

/** Header names that receive the current Session id for each inference call. */
export interface Config {
  /** Non-empty HTTP header names; values come from request metadata, never this configuration. */
  headers: string[]
}

/** Loader validation for the required header names. */
export const Config: z<Config> = z.object({
  headers: z.array(z.string().min(1)).min(1).required(),
})

/** Cordis plugin identity. */
export const name = 'north-dev-session-headers'
/** This contributor uses the pi-ai request-header event without an injected service. */
export const inject = []

/**
 * Add one request identity to every configured header and delegate to later contributors.
 * Session-backed calls reuse their Session id; calls without one receive a fresh UUID per call.
 * @param ctx - Context with the pi-ai request-header waterfall.
 * @param config - Validated header names.
 */
export function apply(ctx: Context, config: Config): void {
  ctx.on('llm-pi-ai/request-headers', (request, headers, next) => {
    const id = request.sessionId ?? randomUUID()
    for (const header of config.headers) headers.set(header, id)
    return next()
  })
}
