import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MarkdownRenderer } from '../MarkdownRenderer'
import { escapeUnknownTags, mapOutsideCode } from '@/lib/vaultMarkdown'

const renderNote = (content: string) => render(<MarkdownRenderer content={content} />).container

// The figure from "MATH 316 Problem 2.9 - Connected iff Spanning Tree".
const FIGURE = `<svg viewBox="0 0 270 200" width="270" xmlns="http://www.w3.org/2000/svg">
  <g stroke="currentColor" stroke-width="1.6" opacity="0.75">
    <line x1="45" y1="155" x2="45" y2="45"/>
  </g>
  <g fill="var(--background-primary)" stroke="currentColor" stroke-width="1.8">
    <circle cx="45" cy="45" r="16"/><circle cx="155" cy="45" r="16"/>
  </g>
  <g fill="currentColor" font-size="13" text-anchor="middle" dominant-baseline="central">
    <text x="45" y="45">v₁</text><text x="155" y="45">v₂</text>
  </g>
</svg>

**Figure.** The cycle $v_1v_2v_3v_4v_1$.`

describe('raw HTML in notes', () => {
  it('renders inline SVG figures as graphics, not text', () => {
    const el = renderNote(FIGURE)
    const svg = el.querySelector('svg.vault-svg')
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('viewBox', '0 0 270 200')
    expect(el.querySelectorAll('svg.vault-svg circle')).toHaveLength(2)
    expect(el.querySelector('svg.vault-svg g')).toHaveAttribute('stroke-width', '1.6')
    expect(el.querySelector('svg.vault-svg line')).toHaveAttribute('x1', '45')
    expect(el.querySelector('svg.vault-svg g[text-anchor="middle"]')).not.toBeNull()
    expect(el.textContent).not.toContain('<svg')
    // Math after the figure still renders through KaTeX.
    expect(el.querySelector('.katex')).not.toBeNull()
  })

  it('strips scripts, event handlers, style and javascript: URLs', () => {
    const el = renderNote([
      '<script>window.__x = 1</script>',
      '<img src="x.png" onerror="window.__x = 2">',
      '<svg onload="window.__x = 3"><circle r="4" style="position:fixed"/></svg>',
      '<a href="javascript:alert(1)">bad</a>',
      '<svg><a href="javascript:alert(1)"><text>t</text></a><use href="#x"/><foreignObject><div>f</div></foreignObject></svg>',
    ].join('\n\n'))
    const html = el.innerHTML
    expect(html).not.toMatch(/<script|onerror|onload|javascript:|style="position|<use|<foreignobject/i)
    expect((window as unknown as Record<string, unknown>).__x).toBeUndefined()
  })

  it('keeps <br>, <sup> and <details> from notes', () => {
    const el = renderNote('line one<br>line two x<sup>2</sup>\n\n<details><summary>More</summary>\n\nHidden\n\n</details>')
    expect(el.querySelector('br')).not.toBeNull()
    expect(el.querySelector('sup')?.textContent).toBe('2')
    expect(el.querySelector('details summary')?.textContent).toBe('More')
  })

  it('shows unknown pseudo-tags in prose as text instead of dropping them', () => {
    const el = renderNote('The speaker paused <laugh> and continued.')
    expect(el.textContent).toContain('<laugh>')
  })

  it('leaves code untouched', () => {
    const el = renderNote('Use `#include <iostream>` here.\n\n```cpp\n#include <iostream>\n// [[Not a link]]\n```')
    expect(el.textContent).toContain('#include <iostream>')
    expect(el.textContent).toContain('[[Not a link]]')
    expect(el.textContent).not.toContain('&lt;')
  })

  it('treats unlabeled fenced blocks (CRLF too) as scrollable code blocks, not inline code', () => {
    const el = renderNote('Intro\r\n\r\n```\r\nTraditional way:   Docker way:\r\n+----+   +----+\r\n```\r\n')
    expect(el.querySelector('[aria-label="Copy code"]')).not.toBeNull()
    expect(el.querySelector('code.bg-surface-container')).toBeNull()
    expect(el.textContent).toContain('Traditional way:')
  })

  it('keeps display math in display mode after sanitizing', () => {
    const el = renderNote('$$\n\\sum_{i=1}^n i\n$$')
    expect(el.querySelector('.katex-display')).not.toBeNull()
  })

  it('renders $$\\begin{aligned} with content after the fence inside a callout', () => {
    const el = renderNote([
      '> [!note] What "not dominating" means',
      '> $$\\begin{aligned}',
      '> S &\\quad\\text{if and only if}\\quad T &&\\text{(Definition 69)} \\\\',
      '> &\\quad\\text{if and only if}\\quad U.',
      '> \\end{aligned}$$',
    ].join('\n'))
    expect(el.querySelector('.katex-error')).toBeNull()
    expect(el.querySelector('.katex-display')).not.toBeNull()
  })

  it('renders one-line $$...\\tag{i}$$ as display math', () => {
    const el = renderNote('$$a = b, \\tag{i}$$')
    expect(el.querySelector('.katex-error')).toBeNull()
    expect(el.querySelector('.katex-display')).not.toBeNull()
  })

  it('shows inline $\\tag{ii}$ labels as text instead of a KaTeX error', () => {
    const el = renderNote('so no vertex lies on two of them. $\\tag{ii}$')
    expect(el.querySelector('.katex-error')).toBeNull()
    expect(el.textContent).toContain('(ii)')
  })

  it('keeps Obsidian callouts working through the sanitizer', () => {
    const el = renderNote('> [!WARNING] Careful\n> Body text')
    expect(el.textContent).toContain('Careful')
    expect(el.textContent).toContain('Body text')
    expect(el.querySelector('blockquote')).toBeNull()
  })

  it('embeds YouTube image links as a privacy-friendly player', () => {
    const el = renderNote('![](https://www.youtube.com/watch?v=OWZr4EzQkd8)')
    expect(el.querySelector('iframe')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/OWZr4EzQkd8')
  })

  it('keeps data: images and resolves vault-relative image paths', () => {
    const el = renderNote('![dot](data:image/png;base64,iVBORw0KGgo=)\n\n<img src="assets/banner.png">')
    const imgs = el.querySelectorAll('img')
    expect(imgs[0].getAttribute('src')).toMatch(/^data:image\/png/)
    expect(imgs[1]).toHaveAttribute('src', '/api/raw/assets/banner.png')
  })

  it('SVG id references survive the anti-clobbering prefix', () => {
    const el = renderNote('<svg><defs><marker id="arrow"><path d="M0,0 L4,2 L0,4"/></marker></defs><line x1="0" y1="0" x2="9" y2="9" marker-end="url(#arrow)"/></svg>')
    const id = el.querySelector('marker')?.getAttribute('id')
    expect(id).toBe('user-content-arrow')
    expect(el.querySelector('line')).toHaveAttribute('marker-end', 'url(#user-content-arrow)')
  })
})

describe('escapeUnknownTags / mapOutsideCode', () => {
  it('escapes only tags outside the allowlist', () => {
    expect(escapeUnknownTags('<laugh> <br> <svg> </laugh> a < b <https://x.io>')).toBe('&lt;laugh> <br> <svg> &lt;/laugh> a < b <https://x.io>')
    expect(escapeUnknownTags('[Note](<Concepts/My Note.md>)')).toBe('[Note](<Concepts/My Note.md>)')
  })

  it('skips fenced and inline code', () => {
    const upper = (s: string) => s.toUpperCase()
    expect(mapOutsideCode('a `b` c\n```\nd\n```\ne', upper)).toBe('A `b` C\n```\nd\n```\nE')
  })
})
