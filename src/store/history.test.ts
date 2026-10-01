// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

const KEY = 'startpage.history.v1'

async function load(seed?: string) {
  vi.resetModules()
  localStorage.clear()
  if (seed !== undefined) localStorage.setItem(KEY, seed)
  return (await import('./history')).history
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('history', () => {
  it('starts empty', async () => {
    const history = await load()
    expect(history.recent()).toEqual([])
  })

  it('reads persisted entries', async () => {
    const history = await load(JSON.stringify(['a', 'b']))
    expect(history.recent()).toEqual(['a', 'b'])
  })

  it('ignores invalid JSON and non-arrays', async () => {
    expect((await load('{ broken')).recent()).toEqual([])
    expect((await load('{"a":1}')).recent()).toEqual([])
  })

  it('filters out non-string entries', async () => {
    const history = await load(JSON.stringify(['a', 1, null, 'b']))
    expect(history.recent()).toEqual(['a', 'b'])
  })

  it('remembers, dedupes and caps the list', async () => {
    const history = await load()
    for (let index = 0; index < 12; index += 1) history.remember(`q${index}`)

    expect(history.recent()).toHaveLength(8)
    expect(history.recent()[0]).toBe('q11')

    history.remember('q5')
    expect(history.recent()[0]).toBe('q5')
    expect(history.recent().filter((item) => item === 'q5')).toHaveLength(1)
  })

  it('ignores blank queries', async () => {
    const history = await load()
    history.remember('   ')
    expect(history.recent()).toEqual([])
  })

  it('survives storage write failures', async () => {
    const history = await load()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    history.remember('q')
    expect(history.recent()).toEqual(['q'])
  })
})
