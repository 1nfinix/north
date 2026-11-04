// @vitest-environment jsdom
/** North brand and skills styles: static presentation lives in CSS Modules, and feature text stays at or below weight 500. */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { NorthMark, NorthName } from '../src/client/Brand.tsx'

afterEach(cleanup)

const STYLESHEETS = [
  'ui-brand/src/client/Brand.module.css',
  'skill-writing/src/client/SkillsSection.module.css',
]

it('renders the product name with stylesheet classes and no inline style', () => {
  const t = (key: 'name' | 'localName') => ({ name: 'North', localName: '诺思' })[key]
  const { container } = render(<NorthName t={t as never} />)
  const elements = [...container.querySelectorAll('span')]
  expect(elements).toHaveLength(2)
  for (const element of elements) {
    expect(element.getAttribute('style')).toBeNull()
    expect(element.className).not.toBe('')
  }
})

it('keeps the mark edge as the only runtime geometry', () => {
  const svg = render(<NorthMark size={18} />).container.querySelector('svg')!
  expect(svg.getAttribute('width')).toBe('18')
  expect(svg.getAttribute('height')).toBe('18')
  expect(svg.getAttribute('style')).toBeNull()
})

it.each(STYLESHEETS)('caps every font weight at 500 in %s', (path) => {
  const weights = [...readFileSync(resolve(import.meta.dirname, '../..', path), 'utf8').matchAll(/font-weight:\s*(\d+)/g)].map(match => Number(match[1]))
  expect(weights.length).toBeGreaterThan(0)
  expect(weights.filter(weight => weight > 500)).toEqual([])
})
