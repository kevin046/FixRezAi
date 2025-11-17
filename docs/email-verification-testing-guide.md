# Email Verification System Testing Guide

## Overview
This guide provides comprehensive testing procedures for the email verification system, covering edge cases, email client compatibility, and security scenarios.

## Automated Test Suite
The system includes automated tests covering:
- Token generation and validation
- Rate limiting (3 resends per hour)
- Expired and used tokens
- Security vulnerabilities (SQL injection, XSS)
- Performance under load
- Email client compatibility

Run tests with:
```bash
npm test src/lib/__tests__/emailVerification.test.ts
```

## Manual Testing Checklist

### 1. Email Client Compatibility Testing

#### Gmail (Web)
- [ ] Email renders correctly in Gmail web interface
- [ ] Verification button is clickable and functional
- [ ] Email displays properly on mobile Gmail app
- [ ] No broken images or styling issues
- [ ] Email is not marked as spam

#### Outlook (Web & Desktop)
- [ ] Email renders correctly in Outlook web interface
- [ ] Verification button works in Outlook desktop client
- [ ] No CSS styling conflicts
- [ ] Email displays properly on Outlook mobile app

#### Apple Mail (iOS & macOS)
- [ ] Email renders correctly on iPhone/iPad Mail app
- [ ] Email displays properly on macOS Mail app
- [ ] Verification button is functional
- [ ] No font or layout issues

#### Yahoo Mail
- [ ] Email renders correctly in Yahoo Mail web interface
- [ ] Verification button is clickable
- [ ] No styling or image issues

#### Thunderbird
- [ ] Email displays correctly in Thunderbird desktop client
- [ ] Verification link is functional
- [ ] No rendering issues

### 2. Token Testing Scenarios

#### Valid Token Flow
1. [ ] Register new user account
2. [ ] Receive verification email
3. [ ] Click verification link
4. [ ] Account becomes verified
5. [ ] Cannot reuse same token

#### Expired Token Testing
1. [ ] Generate verification token
2. [ ] Wait 25+ hours (or use test utility)
3. [ ] Attempt to use expired token
4. [ ] Receive appropriate error message
5. [ ] Token is marked as expired in database

#### Already Used Token Testing
1. [ ] Use valid verification token
2. [ ] Verify account successfully
3. [ ] Attempt to use same token again
4. [ ] Receive "token already used" error
5. [ ] Account remains verified

#### Invalid/Malformed Token Testing
1. [ ] Attempt to use random string as token
2. [ ] Attempt to use tampered token
3. [ ] Attempt to use empty token
4. [ ] Receive "invalid token" error
5. [ ] Security event is logged

### 3. Rate Limiting Testing

#### Normal Usage
1. [ ] Send verification email
2. [ ] Wait 20+ minutes
3. [ ] Send another verification email
4. [ ] Both attempts succeed

#### Rate Limit Enforcement
1. [ ] Send verification email
2. [ ] Immediately attempt to resend
3. [ ] Attempt third resend
4. [ ] All three attempts succeed
5. [ ] Fourth attempt within 1 hour fails
6. [ ] Appropriate error message displayed
7. [ ] Wait 1 hour, attempt again
8. [ ] New attempt succeeds

### 4. Security Testing

#### SQL Injection Prevention
1. [ ] Attempt registration with SQL injection in email: `test'; DROP TABLE users; --`
2. [ ] Attempt token validation with SQL injection
3. [ ] System should reject malicious input
4. [ ] No database errors should occur

#### XSS Prevention
1. [ ] Register with email containing HTML/JS: `<script>alert('XSS')</script>@example.com`
2. [ ] Verify email content is properly escaped
3. [ ] No JavaScript execution should occur
4. [ ] HTML entities should be encoded

#### Token Security
1. [ ] Verify tokens are cryptographically secure
2. [ ] Check that tokens cannot be predicted
3. [ ] Verify token entropy is sufficient
4. [ ] Ensure tokens are single-use only

### 5. Performance Testing

#### Load Testing
1. [ ] Generate 100+ verification requests simultaneously
2. [ ] Verify system handles load gracefully
3. [ ] Check response times remain acceptable (< 5 seconds)
4. [ ] Verify no memory leaks or crashes

#### Database Performance
1. [ ] Generate 1000+ expired tokens
2. [ ] Run cleanup process
3. [ ] Verify cleanup completes quickly (< 1 second)
4. [ ] Check database indexes are utilized

### 6. Mobile Responsiveness Testing

#### iOS Testing
- [ ] Test on iPhone SE (small screen)
- [ ] Test on iPhone 12/13 (medium screen)
- [ ] Test on iPad (large screen)
- [ ] Verify touch targets are appropriately sized
- [ ] Check that verification forms are usable

#### Android Testing
- [ ] Test on various Android devices
- [ ] Verify email rendering across different email apps
- [ ] Check verification button functionality
- [ ] Test with different screen densities

### 7. Accessibility Testing

#### Screen Reader Compatibility
- [ ] Test with VoiceOver (iOS/macOS)
- [ ] Test with TalkBack (Android)
- [ ] Test with NVDA (Windows)
- [ ] Verify all interactive elements are properly labeled
- [ ] Check that error messages are announced

#### Keyboard Navigation
- [ ] Navigate verification form using only keyboard
- [ ] Verify focus indicators are visible
- [ ] Check that all interactive elements are reachable
- [ ] Test with screen reader enabled

### 8. Edge Case Testing

#### Special Characters
1. [ ] Test with email containing special characters: `test+tag@example.com`
2. [ ] Test with international domain names
3. [ ] Test with quoted strings in email addresses
4. [ ] Verify all characters are handled properly

#### Network Issues
1. [ ] Test with slow network connection
2. [ ] Test with intermittent connectivity
3. [ ] Test with complete network failure
4. [ ] Verify appropriate error messages are shown
5. [ ] Check that retry mechanisms work

#### Browser Compatibility
- [ ] Test on Chrome (latest)
- [ ] Test on Firefox (latest)
- [ ] Test on Safari (latest)
- [ ] Test on Edge (latest)
- [ ] Test on mobile browsers
- [ ] Verify consistent behavior across browsers

### 9. User Experience Testing

#### Error Messages
1. [ ] Verify all error messages are user-friendly
2. [ ] Check that error messages provide actionable guidance
3. [ ] Ensure error messages are consistent
4. [ ] Verify error messages are accessible

#### Success Flows
1. [ ] Test complete successful verification flow
2. [ ] Verify success messages are clear
3. [ ] Check that user is properly redirected
4. [ ] Ensure account status is updated correctly

### 10. Analytics and Monitoring

#### Event Tracking
1. [ ] Verify verification events are logged
2. [ ] Check that security events are tracked
3. [ ] Test analytics dashboard functionality
4. [ ] Verify metrics are calculated correctly

#### Error Monitoring
1. [ ] Test error logging functionality
2. [ ] Verify security events are properly categorized
3. [ ] Check that rate limiting events are tracked
4. [ ] Ensure failed verification attempts are logged

## Test Data Setup

### Test Email Addresses
```
test@example.com - Basic testing
test+tag@example.com - Plus addressing
test.user@example.co.uk - Complex domain
test_user@subdomain.example.com - Subdomain
user+newsletter@company.io - Business email
```

### Test Scenarios
1. **Happy Path**: Normal registration and verification
2. **Expired Token**: Token older than 24 hours
3. **Rate Limited**: Multiple resend attempts
4. **Invalid Token**: Malformed or tampered token
5. **Network Issues**: Connectivity problems
6. **Security Attacks**: Injection attempts

## Automated Test Utilities

### Token Expiration Simulator
```javascript
// Utility to expire tokens for testing
async function expireTokenForTesting(token: string) {
  const { error } = await supabase
    .from('verification_tokens')
    .update({ 
      expires_at: new Date(Date.now() - 1000).toISOString() 
    })
    .eq('token', token)
  
  return !error
}
```

### Rate Limit Reset
```javascript
// Utility to reset rate limits for testing
async function resetRateLimitForTesting(email: string) {
  const { error } = await supabase
    .from('verification_tokens')
    .delete()
    .eq('email', email)
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
  
  return !error
}
```

## Success Criteria

### Functional Requirements
- ✅ All verification flows work correctly
- ✅ Rate limiting prevents abuse
- ✅ Expired tokens are rejected
- ✅ Used tokens cannot be reused
- ✅ Error messages are user-friendly

### Performance Requirements
- ✅ Token generation: < 500ms
- ✅ Email sending: < 5 seconds
- ✅ Token validation: < 200ms
- ✅ Database cleanup: < 1 second

### Security Requirements
- ✅ No SQL injection vulnerabilities
- ✅ No XSS vulnerabilities
- ✅ Tokens are cryptographically secure
- ✅ Rate limiting prevents brute force
- ✅ Security events are properly logged

### Compatibility Requirements
- ✅ Works in major email clients
- ✅ Mobile responsive design
- ✅ Accessible to screen readers
- ✅ Cross-browser compatible

## Continuous Testing

Set up automated testing to run:
- [ ] Daily regression tests
- [ ] Weekly security scans
- [ ] Monthly performance tests
- [ ] Quarterly email client compatibility tests

## Reporting Issues

When reporting issues, include:
1. Browser/email client version
2. Operating system
3. Steps to reproduce
4. Expected vs actual behavior
5. Screenshots if applicable
6. Network conditions (if relevant)

This testing guide ensures comprehensive coverage of all aspects of the email verification system, from basic functionality to edge cases and security scenarios.