import { describe, expect, it } from 'vitest'
import { allowedNorthAddress, checkNorthAddresses, isNorthPath } from './verify-north-addresses.ts'

describe('North address gate', () => {
  it('rejects unrelated public IPv4 addresses and prefixes', () => {
    expect(checkNorthAddresses('NORTH.md', '8.8.8.8\n45.1.2.3\nNORTH_PROXY_NETWORK=45.1.\n管理网（45.1.*）走代理\n')).toHaveLength(4)
  })

  it('does not read a sentence-final version number as a prefix', () => {
    expect(checkNorthAddresses('NORTH.md', 'Generated with python-pptx 1.0.2.\n')).toEqual([])
    expect(checkNorthAddresses('NORTH.md', '私有网段 10.1.* 不受限制')).toEqual([])
  })

  it('accepts private, loopback, link-local, unspecified, and documentation ranges', () => {
    for (const address of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '192.0.2.10', '198.51.100.20', '203.0.113.7', '0.0.0.0', '169.254.2.3']) {
      expect(checkNorthAddresses('NORTH.md', address), address).toEqual([])
    }
    expect(allowedNorthAddress([172, 32, 0, 1])).toBe(false)
    expect(checkNorthAddresses('NORTH.md', 'NORTH_PROXY_NETWORK=198.51.100.')).toEqual([])
  })

  it('ignores paths outside North ownership', () => {
    expect(isNorthPath('apps/desktop/tests/other.spec.ts')).toBe(false)
    expect(checkNorthAddresses('apps/desktop/tests/other.spec.ts', '8.8.8.8')).toEqual([])
  })
})
