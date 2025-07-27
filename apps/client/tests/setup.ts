import { beforeEach } from 'vitest'

// Mock console.log and console.warn to avoid noise in test output
global.console = {
  ...console,
  log: () => {},
  warn: () => {},
  error: console.error // Keep error for debugging
}

// Mock ResizeObserver for tests
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock IntersectionObserver for tests
global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  // Clear any mocks between tests
  vi.clearAllMocks?.()
})