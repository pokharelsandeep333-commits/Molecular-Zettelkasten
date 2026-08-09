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
})
