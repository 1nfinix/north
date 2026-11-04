import { existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const localFile = fileURLToPath(new URL('../resources/north.env', import.meta.url))
const exampleFile = fileURLToPath(new URL('../resources/north.env.example', import.meta.url))

/**
 * Resolve the North settings file copied into a Desktop package.
 * An explicit path must exist; the example is available only for opted-in qualification builds.
 * @param {NodeJS.ProcessEnv} env - Packaging environment.
 * @param {{ localFile: string, exampleFile: string }} sources - Candidate files.
 * @returns {string} Existing file path for electron-builder.
 */
export function resolveNorthEnvSource(env = process.env, sources = { localFile, exampleFile }) {
  if (env.NORTH_ENV_PATH !== undefined) {
    if (!existsSync(env.NORTH_ENV_PATH) || !statSync(env.NORTH_ENV_PATH).isFile()) throw new Error('North packaging: NORTH_ENV_PATH does not name an existing file')
    return env.NORTH_ENV_PATH
  }
  if (existsSync(sources.localFile) && statSync(sources.localFile).isFile()) return sources.localFile
  if (env.NORTH_ENV_ALLOW_EXAMPLE === '1' && existsSync(sources.exampleFile) && statSync(sources.exampleFile).isFile()) return sources.exampleFile
  throw new Error('North packaging: place apps/desktop/resources/north.env or set NORTH_ENV_PATH to an existing file; qualification builds may set NORTH_ENV_ALLOW_EXAMPLE=1')
}
