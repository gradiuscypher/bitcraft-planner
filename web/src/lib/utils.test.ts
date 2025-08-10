import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
  it('merges class names and removes duplicates', () => {
    const result = cn('p-2', 'text-sm', 'p-2')
    const classes = new Set(result.split(/\s+/).filter(Boolean))
    expect(classes).toEqual(new Set(['p-2', 'text-sm']))
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'x', 'y')).toBe('base y')
  })
})
