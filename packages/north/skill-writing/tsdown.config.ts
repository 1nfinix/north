import { copyFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { clientBundle } from '../../client/tsdown.client.ts'

export default clientBundle(import.meta.dirname, ['lib/types/index.js'], {
  hostPhase: true,
  lib: {
    hooks: {
      'build:done': async () => {
        await copyFile(
          createRequire(import.meta.url).resolve('echarts/dist/echarts.min.js'),
          new URL('./assets/chart/echarts.min.js', import.meta.url),
        )
      },
    },
  },
})
