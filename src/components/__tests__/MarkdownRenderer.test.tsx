import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MarkdownRenderer } from '../MarkdownRenderer'

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

  it('strips Obsidian wikilinks correctly', () => {
    // [[Note|Alias]] should become Alias
    // [[Note]] should become Note
    render(<MarkdownRenderer content="Check out [[Knowledge Base|this link]] and [[React]]" />)
    expect(screen.getByText(/Check out this link and React/)).toBeInTheDocument()
  })
})
