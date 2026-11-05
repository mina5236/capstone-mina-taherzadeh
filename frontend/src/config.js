// __API_URL__ is filled in by Vite at build time. Tests don't have it, so they use localhost.
export const API = typeof __API_URL__ === 'string' ? __API_URL__ : 'http://localhost:3001/api'