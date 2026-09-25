import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MarkdownRenderer, preprocessObsidian, wikilinkTarget, headingSlug } from '../MarkdownRenderer'

const note = (target: string) => `#wikilink:${encodeURIComponent(target)}`

describe('MarkdownRenderer', () => {
  it('renders simple text correctly', () => {
    render(<MarkdownRenderer content="Hello World" />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('renders headings correctly', () => {
    render(<MarkdownRenderer content="# Main Heading" />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Main Heading')
  })

  it('renders Obsidian wikilinks correctly', () => {
    // [[Note|Alias]] should become a button with text Alias
    // [[Note]] should become a button with text Note
    render(<MarkdownRenderer content="Check out [[Knowledge Base|this link]] and [[React]]" />)

    expect(screen.getByText(/Check out/)).toBeInTheDocument()
    expect(screen.getByText(/and/)).toBeInTheDocument()

    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveTextContent('this link')
    expect(buttons[1]).toHaveTextContent('React')
  })

  it('renders image embeds whose filenames contain spaces', () => {
    render(<MarkdownRenderer content="![[My Diagram.png]]" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', '/api/raw/My%20Diagram.png')
  })

  it('applies Obsidian embed widths', () => {
    render(<MarkdownRenderer content="![[chart.png|300]]" />)
    expect(screen.getByRole('img')).toHaveAttribute('width', '300')
  })

  it('opens the note, not a heading, for [[Note#Heading]] links', () => {
    const clicks: string[] = []
    render(<MarkdownRenderer content="See [[Folder/Note#Setup]]" onNodeClick={s => clicks.push(s)} />)
    screen.getByRole('button', { name: 'Folder/Note > Setup' }).click()
    expect(clicks).toEqual(['Folder/Note'])
  })

  it('keeps table-of-contents anchors as in-page links with matching heading ids', () => {
    const clicks: string[] = []
    const { container } = render(
      <MarkdownRenderer
        content={'1. [What Docker REALLY Is — Under the Hood](#2-what-docker-really-is--under-the-hood)\n\n## 2. What Docker REALLY Is — Under the Hood'}
        onNodeClick={s => clicks.push(s)}
      />,
    )
    const link = screen.getByRole('link', { name: /What Docker REALLY Is/ })
    expect(link).toHaveAttribute('href', '#2-what-docker-really-is--under-the-hood')
    const heading = container.querySelector<HTMLElement>('[id="2-what-docker-really-is--under-the-hood"]')!
    expect(heading.tagName).toBe('H2')
    const scrolled: Element[] = []
    heading.scrollIntoView = function (this: Element) { scrolled.push(this) }
    link.click()
    expect(scrolled).toEqual([heading]) // scrolls to the matching heading
    expect(clicks).toEqual([]) // not treated as a note
  })

  it('turns [[#Heading]] into an in-page link', () => {
    render(<MarkdownRenderer content={'See [[#Key Ideas]]\n\n## Key Ideas'} />)
    expect(screen.getByRole('link', { name: 'Key Ideas' })).toHaveAttribute('href', '#key-ideas')
  })
})

describe('headingSlug', () => {
  it('matches GitHub anchors', () => {
    expect(headingSlug('1. Your Understanding So Far (Validated & Expanded)')).toBe('1-your-understanding-so-far-validated--expanded')
  })
})

describe('preprocessObsidian', () => {
  it('turns PDF embeds into links instead of broken images', () => {
    expect(preprocessObsidian('![[Paper.pdf]]')).toBe(`[Paper.pdf](${note('Paper.pdf')})`)
  })

  it('encodes nested embed paths per segment', () => {
    expect(preprocessObsidian('![[img/a b.png]]')).toBe('![a b.png](</api/raw/img/a%20b.png>)')
  })

  it('turns relative .md links with spaces and parentheses into note links', () => {
    expect(preprocessObsidian('- [AI Workflow](../Wiki/Concepts/AI Coding Workflow (Matt Pocock).md)'))
      .toBe(`- [AI Workflow](${note('Wiki/Concepts/AI Coding Workflow (Matt Pocock)')})`)
    expect(preprocessObsidian('[Note](<Concepts/My%20Note.md#Intro>)'))
      .toBe(`[Note](${note('Concepts/My Note')})`)
  })

  it('leaves external .md URLs alone', () => {
    const link = '[Readme](https://github.com/x/y/README.md)'
    expect(preprocessObsidian(link)).toBe(link)
  })

  it('keeps aliases for wikilinks', () => {
    expect(preprocessObsidian('[[Target Note|shown]]')).toBe(`[shown](${note('Target Note')})`)
  })
})

describe('wikilinkTarget', () => {
  it('decodes and strips headings', () => {
    expect(wikilinkTarget('#wikilink:Folder%2FNote%23Heading')).toBe('Folder/Note')
  })
})
