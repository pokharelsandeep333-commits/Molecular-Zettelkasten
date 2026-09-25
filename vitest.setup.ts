import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom does not implement scrolling; in-page anchor links call scrollIntoView.
if (typeof window !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}
