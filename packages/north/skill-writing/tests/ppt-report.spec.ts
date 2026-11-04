import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { it } from 'vitest'

const runtime = process.env.DSH_PRIMARY_RUNTIME
const python = runtime && join(runtime, 'dependencies/python', process.platform === 'win32' ? 'python.exe' : 'bin/python3')
const testFile = resolve(import.meta.dirname, 'ppt_report_test.py')

// North CI prepares the pinned Office interpreter before this suite.
it.skipIf(!python || !existsSync(python))('runs the bundled PowerPoint scripts with the Office interpreter', () => {
  execFileSync(python!, [testFile], { stdio: 'inherit', timeout: 60_000 })
})
