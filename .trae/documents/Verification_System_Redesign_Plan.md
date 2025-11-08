# Account Verification System Redesign Plan

## Current Issues Identified

1. **Status Management Issues:**
   - Current `isVerified()` function relies on multiple sources (email_confirmed_at, user_metadata.verified, profiles.verified)
   - No clear distinction between email confirmation and token-based verification
   - Inconsistent verification status across different parts of the system

2. **Verification Process Gaps:**
   - No proper audit trail for verification events
   - Missing verification timestamp storage
   - No clear token validation workflow

3. **UI/UX Deficiencies:**
   - Limited visual indicators for verification status
   - No tooltips explaining verification requirements
   - Inconsistent status display across interfaces

4. **Backend Validation Weaknesses:**
   - No middleware for verification status checking
   - Missing periodic checks for unverified accounts
   - No reminder email system

## Implementation Plan

### Phase 1: Database Schema Updates

1. **Create verification_tokens table**
2. **Add verification_timestamp to profiles table**
3. **Create verification_audit_log table**

### Phase 2: Enhanced Verification Workflow

1. **Implement proper JWT token validation**
2. **Add verification timestamp tracking**
3. **Create audit logging system**
4. **Implement token expiration handling**

### Phase 3: UI/UX Improvements

1. **Add prominent verification status indicators**
2. **Implement verification tooltips**
3. **Create verification status components**
4. **Add mobile-responsive verification indicators**

### Phase 4: Backend Validation

1. **Create verification middleware**
2. **Implement periodic account checks**
3. **Add reminder email system**
4. **Enhance CSRF protection**

### Phase 5: Testing & Validation

1. **End-to-end verification flow testing**
2. **Status display component validation**
3. **Mobile responsiveness testing**
4. **Security testing for token validation**

## Key Requirements

- ✅ Only mark accounts as "Verified" after successful email token validation
- ✅ Clearly distinguish between "Verified" and "Unverified" states
- ✅ Store verification timestamp in user database records
- ✅ Create audit logs for verification events
- ✅ Display prominent visual indicators for verification status
- ✅ Add middleware to check verification status for protected routes
- ✅ Implement comprehensive testing requirements

## Files to be Modified/Created

### Database
- `supabase/migrations/verification_system_redesign.sql`

### Backend
- `api/server.js` (enhancements)
- `api/middleware/verification.js` (new)
- `api/services/verificationService.js` (new)

### Frontend Components
- `src/components/VerificationStatus.tsx` (new)
- `src/components/VerificationIndicator.tsx` (new)
- `src/lib/verification.ts` (new)

### UI Pages
- `src/pages/verify.tsx` (enhanced)
- `src/pages/dashboard.tsx` (enhanced)
- `src/pages/settings.tsx` (enhanced)

### Testing
- `tests/verification.test.js` (new)
- `tests/e2e/verification-flow.test.js` (new)