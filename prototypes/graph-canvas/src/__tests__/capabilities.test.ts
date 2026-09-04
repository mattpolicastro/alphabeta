import { describe, expect, it } from 'vitest'
import { capabilities, capability, validateRegistry } from '../capabilities'

const good = { id: 'x', kind: 'place', name: 'X', status: 'live' }

describe('validateRegistry', () => {
  it('accepts well-formed entries', () => {
    expect(validateRegistry([good])).toHaveLength(1)
  })

  it('throws on an unknown status', () => {
    expect(() => validateRegistry([{ ...good, status: 'soon' }])).toThrow(/unknown status "soon"/)
  })

  it('throws on an unknown kind', () => {
    expect(() => validateRegistry([{ ...good, kind: 'screen' }])).toThrow(/unknown kind "screen"/)
  })

  it('throws on duplicate ids', () => {
    expect(() => validateRegistry([good, good])).toThrow(/duplicate id/)
  })
})

describe('registry', () => {
  it('loads the landing-site JSON', () => {
    expect(capabilities.length).toBeGreaterThan(0)
    expect(capability('canvas').kind).toBe('place')
  })

  it('throws on an unknown id so drift fails loudly', () => {
    expect(() => capability('nope')).toThrow(/no entry "nope"/)
  })
})
