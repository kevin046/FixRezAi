# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  extends: [
    // other configs...
    // Enable lint rules for React
    reactX.configs['recommended-typescript'],
    // Enable lint rules for React DOM
    reactDom.configs.recommended,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

# Verification Rules

- A user is considered verified only if `user.email_confirmed_at` is set by Supabase.
- Access to `/api/optimize` and `/api/me` requires `Authorization: Bearer <supabase access token>` and verified user.
- Unverified users can browse UI but cannot trigger AI optimization or access `/api/me`.
- All verification attempts are logged server-side with timestamp, IP, user id/email (if present), and verification result.

# Security Measures

- `requireVerified` middleware validates Supabase token via service role and checks `email_confirmed_at`.
- `rateLimiter` per-IP window (`RATE_WINDOW_MS`, `RATE_MAX`) protects `/api/*` endpoints.
- Optional `ipAllowlist` via `ALLOWED_IPS` blocks non-allowed IPs.
- Audit logs written to `logs/verify.log` for verification, rate limit, and IP blocks.

# Error Handling

- Missing token: `401 { success: false, error: 'Missing Authorization token' }`
- Invalid token: `401 { success: false, error: 'Invalid token' }`
- Expired token: `401 { success: false, error: 'Token expired' }`
- Not verified: `403 { success: false, error: 'Email verification required' }`
- Rate limit: `429 { success: false, error: 'Too many requests' }`
- IP not allowed: `403 { success: false, error: 'IP not allowed' }`

# API Endpoints

- `GET /api/me` — returns `{ success, user: { id, email, email_confirmed_at } }` for verified requests.
- `POST /api/optimize` — requires verified user; returns optimized resume JSON.
- `POST /api/contact` — protected by rate limiter, spam checks, and optional email provider.

# Testing Procedures

- Start server: `npm run server` (port `3001`).
- Set `API_BASE` if needed (defaults to `http://localhost:3001/api`).
- Run baseline auth tests: `node test-backend.js` (expects 401 for missing/invalid tokens).
- Run `/api/me` tests: `node test-me.js` (expects 401 for missing/invalid tokens).
- Run rate limit test: `node test-rate-limit.js` (expects a 429 in sequence).
- Run audit log test: `node test-audit.js` (expects `missing_token` entry in `logs/verify.log`).

# Server Configuration

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` required on server.
- Optional `ALLOWED_IPS`, `RATE_WINDOW_MS`, `RATE_MAX` for IP/ratelimit tuning.
- In production, set Supabase `Site URL` and `Redirect URLs` to include `/verify` route.
