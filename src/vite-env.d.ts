/// <reference types="vite/client" />

declare global {
  interface Window {
    __VITE_API_BASE_URL?: string
  }
}

export {}