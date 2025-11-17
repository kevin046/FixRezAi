import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock crypto.randomBytes for Node.js environment
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    randomBytes: vi.fn(() => Buffer.from('test-random-bytes')),
    getRandomValues: vi.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    })
  } as any;
}

// Mock window.crypto for browser environment
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: vi.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    })
  },
  writable: true,
  configurable: true
});

// Mock scrollIntoView
global.Element.prototype.scrollIntoView = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock performance API
global.performance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
} as any;

// Mock fetch API
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    clone: () => ({}) as Response,
  })
) as any;

// Mock Request and Response
global.Request = vi.fn() as any;
global.Response = vi.fn() as any;

// Mock URL and URLSearchParams
const createMockURL = function(url: string) {
  const match = url.match(/^([^:]+):\/\/([^\/]+)(\/[^?]*)?(\?.*)?$/);
  return {
    href: url,
    hostname: match?.[2] || 'fixrez.com',
    pathname: match?.[3] || '/verify',
    search: match?.[4] || '?token=test-token',
    searchParams: {
      get: (name: string) => name === 'token' ? 'test-token' : null,
      set: vi.fn(),
      has: (name: string) => name === 'token'
    }
  };
};

// Create a proper constructor function
const URLConstructor = function(url: string) {
  return createMockURL(url);
} as any;
URLConstructor.createObjectURL = vi.fn();
URLConstructor.revokeObjectURL = vi.fn();

global.URL = URLConstructor;

global.URLSearchParams = vi.fn(() => ({
  get: vi.fn(),
  set: vi.fn(),
  has: vi.fn(),
  toString: vi.fn(() => 'token=test-token')
})) as any;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

global.localStorage = localStorageMock as any;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

global.sessionStorage = sessionStorageMock as any;

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
});

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    language: 'en-US',
    languages: ['en-US', 'en'],
    onLine: true,
    cookieEnabled: true,
    geolocation: {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn(),
      clearWatch: vi.fn()
    }
  },
  writable: true,
  configurable: true
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://fixrez.com',
    hostname: 'fixrez.com',
    pathname: '/',
    search: '',
    hash: '',
    origin: 'https://fixrez.com',
    protocol: 'https:',
    port: '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn()
  },
  writable: true,
  configurable: true
});

// Mock history API
Object.defineProperty(window, 'history', {
  value: {
    pushState: vi.fn(),
    replaceState: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    length: 1
  },
  writable: true,
  configurable: true
});

// Mock alert, confirm, and prompt
global.alert = vi.fn();
global.confirm = vi.fn(() => true);
global.prompt = vi.fn(() => 'test input');

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});