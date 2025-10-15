import { describe, it, expect } from 'vitest'
import { sum } from './sum'

describe('sum', () => {
  it('should sum two numbers', () => {
    expect(sum(1, 2)).toBe(3)
  })
})
