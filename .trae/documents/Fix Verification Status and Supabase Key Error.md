## Root Causes

* Backend requires `SUPABASE_SERVICE_ROLE_KEY`; missing value throws in `api/services/verificationServiceEnhanced.js:60–62` and breaks `/api/verification/status` (`api/server.js:488–507`).

* UI shows verified incorrectly because `isVerified()` reads `verificationStatus.verified` (`src/lib/auth.ts:5–14`), but the backend returns `status.is_verified`.

## Backend Changes

1. Graceful dev fallback for status

* In `/api/verification/status` and `/api/verification/status/:userId` (`api/server.js:488–536`), if `DEV_AUTH_BYPASS` is true or the service key is missing, return a safe default: `{ success: true, status: { is_verified: false, verification_timestamp: null, verification_method: null, has_valid_token: false, token_expires_at: null } }` instead of throwing.

1. Optional: Service init tolerance

* In `api/services/verificationServiceEnhanced.js` `init()` (`line ~57`), if the key is missing in dev, set a no-op admin and allow calls to return safe defaults (no DB RPC) to avoid 500s.

1. Ensure env loading

* Confirm `.env.local` contains a valid `SUPABASE_SERVICE_ROLE_KEY` and is picked up by `dotenv.config({ path: '.env.local' })` (`api/server.js:1–3`). Restart the server.

## Frontend Changes

1. Normalize verification status in store

* In `src/stores/authStore.ts:92–99`, when setting `verificationStatus`, map `{ verified: result.status.is_verified, verification_timestamp: ..., verification_method: ..., verification_token_id: ... }` so the store shape matches UI expectations.

1. Harden `isVerified()`

* Update `src/lib/auth.ts:5–14` to return `verificationStatus.verified ?? (verificationStatus as any).is_verified ?? !!(user?.email_confirmed_at || (user as any)?.user_metadata?.verified)`.

1. Error handling

* Keep `fetchVerificationStatus` non-throwing; surface errors in `error` state and ensure Settings page uses that to show “not verified” messaging (`src/pages/settings.tsx:55–74` and banner/overlay blocks).

## UX Improvements

* Verify page already instructs users to check email (`src/pages/verify.tsx:172–176`). After fixes, it will display correctly when status fails and provide resend.

* Add a small inline hint in Settings under “Email Verification” when status fetch fails: “Unable to load verification status. Please verify via email or resend.”

## Validation

* Dev: run the API server on `http://localhost:3003` (matching `vite.config.ts:12–16`) and reload `/settings` and `/verify`.

* Confirm:

  * No “supabasekey is required” errors in console.

  * Settings shows unverified state until email confirmed.

  * Resend email works and `/api/verify?token=...` redirects to success.

## Rollback Safety

* All changes are additive and guarded behind `DEV_AUTH_BYPASS` in dev; production behavior unchanged if the service key is present.

## After Approval

* Implement backend

