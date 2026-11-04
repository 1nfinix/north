// Rasterize SVG files to square PNGs with sharp: node render-png.mjs <svg> <png> <edge> [...]
import { createRequire } from 'node:module'

const require = createRequire(new URL('../../../../apps/desktop/package.json', import.meta.url))
const sharp = require('sharp')
const args = process.argv.slice(2)
for (let index = 0; index < args.length; index += 3) {
  const [source, output, edge] = args.slice(index, index + 3)
  await sharp(source, { density: 300 }).resize(Number(edge), Number(edge)).png().toFile(output)
  console.info(`rendered ${output}`)
}
