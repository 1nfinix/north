/**
 * Select an existing North settings file for Desktop packaging.
 * @param env - Packaging environment.
 * @param sources - Candidate files; defaults to the Desktop resources directory.
 * @returns Existing source file path.
 */
export function resolveNorthEnvSource(
  env?: NodeJS.ProcessEnv,
  sources?: { localFile: string; exampleFile: string },
): string
