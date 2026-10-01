// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { parseBookmarks } from './bookmarks'

const SAMPLE = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
  <DT><H3>Dev</H3>
  <DL><p>
    <DT><A HREF="https://github.com/">GitHub</A>
    <DT><A HREF="https://developer.mozilla.org/">MDN</A>
    <DT><A HREF="https://no-title.example/"></A>
  </DL><p>
  <DT><A HREF="https://news.ycombinator.com/">Hacker News</A>
  <DT><H3>Empty folder</H3>
  <DL><p>
  </DL><p>
</DL><p>`

describe('parseBookmarks', () => {
  it('extracts folders and loose links', () => {
    const groups = parseBookmarks(SAMPLE)
    expect(groups.map((group) => group.title)).toEqual(['Dev', 'Imported'])
    expect(groups[0].links).toEqual([
      { label: 'GitHub', url: 'https://github.com/' },
      { label: 'MDN', url: 'https://developer.mozilla.org/' },
      { label: 'https://no-title.example/', url: 'https://no-title.example/' },
    ])
    expect(groups[1].links).toEqual([
      { label: 'Hacker News', url: 'https://news.ycombinator.com/' },
    ])
  })

  it('handles a <DL> that is a sibling of the <DT>', () => {
    const html =
      '<DL><DT><H3>Sib</H3></DT><DL><DT><A HREF="https://s.test/">S</A></DL></DL>'
    expect(parseBookmarks(html)).toEqual([
      { title: 'Sib', links: [{ label: 'S', url: 'https://s.test/' }] },
    ])
  })

  it('skips intervening elements when finding the folder list', () => {
    const html =
      '<DL><DT><H3>Junk</H3></DT><p>spacer</p>' +
      '<DL><DT><A HREF="https://j.test/">J</A></DL></DL>'
    expect(parseBookmarks(html)).toEqual([
      { title: 'Junk', links: [{ label: 'J', url: 'https://j.test/' }] },
    ])
  })

  it('ignores a folder with no list', () => {
    expect(parseBookmarks('<DL><DT><H3>Lonely</H3></DT></DL>')).toEqual([])
  })

  it('handles a nested <DL> inside the <DT>', () => {
    const html =
      '<DL><DT><H3>Nested</H3><DL><DT><A HREF="https://a.test/">A</A></DL></DL>'
    const groups = parseBookmarks(html)
    expect(groups).toEqual([
      { title: 'Nested', links: [{ label: 'A', url: 'https://a.test/' }] },
    ])
  })

  it('skips anchors with an empty href', () => {
    const html =
      '<DL><DT><A HREF="">Blank</A></DT>' +
      '<DT><A HREF="https://ok.test/">OK</A></DT></DL>'
    expect(parseBookmarks(html)).toEqual([
      { title: 'Imported', links: [{ label: 'OK', url: 'https://ok.test/' }] },
    ])
  })

  it('returns an empty list without a <DL>', () => {
    expect(parseBookmarks('<html><body>nothing here</body></html>')).toEqual([])
  })

  it('skips malformed entries and empty folders', () => {
    const html = [
      '<DL>',
      '<DT>no anchor</DT>',
      '<DT><A NAME="x">No href</A></DT>',
      '<DT><H3></H3><DL><DT><A HREF="https://b.test/">B</A></DL></DT>',
      '</DL>',
    ].join('')
    const groups = parseBookmarks(html)
    // The untitled H3 inherits the parent title, and the only real link lands there.
    expect(groups).toEqual([
      { title: 'Imported', links: [{ label: 'B', url: 'https://b.test/' }] },
    ])
  })
})
