import '@testing-library/jest-dom'

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom does not implement window.matchMedia. Provide a stub so vi.spyOn() can override it.
Object.defineProperty(globalThis, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (_query: string): MediaQueryList => ({
    matches: false,
    media: _query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Node.js v26 defines localStorage as a getter returning undefined (no --localstorage-file).
// jsdom provides a working localStorage on its window, but Vitest's populateGlobal skips it
// because 'localStorage' is already a key in globalThis. Re-define it here so tests can use it.
const store: Record<string, string> = {}
const localStorageImpl = {
  getItem: (key: string) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
  setItem: (key: string, value: string) => { store[key] = String(value) },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i: number) => Object.keys(store)[i] ?? null,
}
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  enumerable: true,
  value: localStorageImpl,
  writable: true,
})
