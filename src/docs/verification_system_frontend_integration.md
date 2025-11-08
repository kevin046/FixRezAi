# Verification System Frontend Integration Guide

## Overview
This guide provides comprehensive instructions for integrating the revised Supabase verification system with your React frontend application.

## Key Changes from Previous System

### 1. Enhanced Verification Status Structure
```typescript
// New verification status interface
interface VerificationStatus {
  verified: boolean;
  verification_timestamp: string | null;
  verification_method: string | null;
  verification_token_id: string | null;
  verification_metadata: Record<string, any> | null;
}
```

### 2. Updated API Endpoints

#### Get Verification Status
```typescript
// Replace your existing verification status check with:
const getVerificationStatus = async (userId: string) => {
  const { data, error } = await supabase
    .rpc('get_verification_status', {
      p_user_id: userId
    });

  if (error) throw error;
  return data;
};
```

#### Create Verification Token
```typescript
const createVerificationToken = async (
  userId: string, 
  type: 'email' | 'phone' | 'password_reset',
  method: 'email' | 'sms' | 'oauth'
) => {
  const { data, error } = await supabase
    .rpc('create_verification_token', {
      p_user_id: userId,
      p_type: type,
      p_method: method,
      p_expires_in_minutes: 60
    });

  if (error) throw error;
  return data; // Returns token_id
};
```

#### Verify Token
```typescript
const verifyToken = async (
  userId: string, 
  token: string,
  ipAddress?: string,
  userAgent?: string
) => {
  const { data, error } = await supabase
    .rpc('verify_user_token', {
      p_user_id: userId,
      p_plain_token: token,
      p_ip_address: ipAddress || 'unknown',
      p_user_agent: userAgent || 'unknown'
    });

  if (error) {
    // Enhanced error handling
    const errorData = await getVerificationError(error.message);
    throw new VerificationError(errorData.user_message, errorData.retry_allowed, errorData.retry_delay_minutes);
  }

  return data;
};
```

## Updated Components

### 1. VerificationIndicator Component
```typescript
// src/components/VerificationIndicator.tsx
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { formatDistanceToNow } from 'date-fns';

interface VerificationIndicatorProps {
  className?: string;
  showTooltip?: boolean;
}

const VerificationIndicator: React.FC<VerificationIndicatorProps> = ({
  className = '',
  showTooltip = true
}) => {
  const { user, verificationStatus, fetchVerificationStatus } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchVerificationStatus(user.id);
    }
  }, [user?.id]);

  const getStatusConfig = () => {
    if (!verificationStatus) {
      return {
        status: 'unknown',
        icon: '❓',
        color: 'text-gray-500',
        tooltip: 'Verification status unknown'
      };
    }

    const { verified, verification_timestamp, verification_method } = verificationStatus;

    if (verified) {
      const verifiedAt = verification_timestamp 
        ? new Date(verification_timestamp)
        : null;
      
      const timeAgo = verifiedAt 
        ? formatDistanceToNow(verifiedAt, { addSuffix: true })
        : null;

      let tooltip = 'Email verified';
      if (timeAgo && verification_method) {
        tooltip = `Email verified ${timeAgo} via ${verification_method}`;
      } else if (timeAgo) {
        tooltip = `Email verified ${timeAgo}`;
      } else if (verification_method) {
        tooltip = `Email verified via ${verification_method}`;
      }

      return {
        status: 'verified',
        icon: '✅',
        color: 'text-green-600',
        tooltip
      };
    }

    return {
      status: 'pending',
      icon: '⏳',
      color: 'text-yellow-600',
      tooltip: 'Check your email for verification link'
    };
  };

  const config = getStatusConfig();

  return (
    <div 
      className={`flex items-center space-x-2 ${className}`}
      title={showTooltip ? config.tooltip : undefined}
    >
      <span className={`${config.color} text-lg`}>
        {config.icon}
      </span>
      <span className={`text-sm ${config.color}`}>
        {config.status === 'verified' ? 'Verified' : 
         config.status === 'pending' ? 'Pending' : 'Unknown'}
      </span>
    </div>
  );
};

export default VerificationIndicator;
```

### 2. Enhanced Auth Store
```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface VerificationStatus {
  verified: boolean;
  verification_timestamp: string | null;
  verification_method: string | null;
  verification_token_id: string | null;
  verification_metadata: Record<string, any> | null;
}

interface AuthStore {
  user: any;
  verificationStatus: VerificationStatus | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchVerificationStatus: (userId: string) => Promise<void>;
  createVerificationToken: (type: string, method: string) => Promise<string>;
  verifyEmail: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  verificationStatus: null,
  isLoading: false,
  error: null,

  fetchVerificationStatus: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .rpc('get_verification_status', {
          p_user_id: userId
        });

      if (error) throw error;
      
      set({ verificationStatus: data });
    } catch (error) {
      set({ error: error.message });
      console.error('Failed to fetch verification status:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createVerificationToken: async (type: string, method: string) => {
    const { user } = get();
    if (!user?.id) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .rpc('create_verification_token', {
        p_user_id: user.id,
        p_type: type,
        p_method: method,
        p_expires_in_minutes: 60
      });

    if (error) throw error;
    return data;
  },

  verifyEmail: async (token: string) => {
    const { user } = get();
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .rpc('verify_user_token', {
          p_user_id: user.id,
          p_plain_token: token,
          p_ip_address: 'client-ip', // You'll need to get this from request
          p_user_agent: navigator.userAgent
        });

      if (error) throw error;

      // Refresh verification status
      await get().fetchVerificationStatus(user.id);
    } catch (error) {
      throw new Error(`Verification failed: ${error.message}`);
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, verificationStatus: null });
  }
}));
```

### 3. Email Verification Component
```typescript
// src/components/EmailVerification.tsx
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useSearchParams } from 'react-router-dom';

const EmailVerification: React.FC = () => {
  const { user, verificationStatus, verifyEmail } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token && user?.id && !verificationStatus?.verified) {
      handleVerification(token);
    }
  }, [searchParams, user?.id, verificationStatus?.verified]);

  const handleVerification = async (token: string) => {
    setIsVerifying(true);
    try {
      await verifyEmail(token);
      setVerificationResult({
        success: true,
        message: 'Email verified successfully! You can now access all features.'
      });
    } catch (error) {
      setVerificationResult({
        success: false,
        message: error.message || 'Verification failed. Please try again.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center">
        <p className="text-gray-600">Please log in to verify your email.</p>
      </div>
    );
  }

  if (verificationStatus?.verified) {
    return (
      <div className="text-center">
        <div className="text-green-600 text-4xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-green-600 mb-2">Email Verified!</h2>
        <p className="text-gray-600">
          Your email was verified on {new Date(verificationStatus.verification_timestamp!).toLocaleDateString()}
        </p>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Verifying your email...</p>
      </div>
    );
  }

  if (verificationResult) {
    return (
      <div className="text-center">
        <div className={`text-4xl mb-4 ${verificationResult.success ? 'text-green-600' : 'text-red-600'}`}>
          {verificationResult.success ? '✅' : '❌'}
        </div>
        <h2 className={`text-2xl font-bold mb-2 ${verificationResult.success ? 'text-green-600' : 'text-red-600'}`}>
          {verificationResult.success ? 'Verification Complete!' : 'Verification Failed'}
        </h2>
        <p className="text-gray-600 mb-4">{verificationResult.message}</p>
        {!verificationResult.success && (
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="text-yellow-600 text-4xl mb-4">⏳</div>
      <h2 className="text-2xl font-bold text-yellow-600 mb-2">Email Verification Pending</h2>
      <p className="text-gray-600 mb-4">
        Please check your email for a verification link. If you don't see it, check your spam folder.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Refresh Status
      </button>
    </div>
  );
};

export default EmailVerification;
```

## Migration Steps

### 1. Update Existing Components
Replace existing verification status checks with the new RPC calls:

```typescript
// OLD WAY
const { data: profile } = await supabase
  .from('profiles')
  .select('verified')
  .eq('id', userId)
  .single();

// NEW WAY
const { data: status } = await supabase
  .rpc('get_verification_status', {
    p_user_id: userId
  });
```

### 2. Update Error Handling
```typescript
// Create a custom error class
class VerificationError extends Error {
  constructor(
    message: string,
    public retryAllowed: boolean,
    public retryDelayMinutes: number
  ) {
    super(message);
    this.name = 'VerificationError';
  }
}

// Use it in your verification calls
try {
  await verifyToken(userId, token);
} catch (error) {
  if (error instanceof VerificationError) {
    if (error.retryAllowed && error.retryDelayMinutes > 0) {
      // Show retry message with countdown
      console.log(`Please wait ${error.retryDelayMinutes} minutes before retrying`);
    } else if (!error.retryAllowed) {
      // Show permanent failure message
      console.log('Verification failed permanently. Please contact support.');
    }
  }
}
```

### 3. Update Verification UI
Replace the old verification indicator with the new enhanced version that shows:
- Verification method used
- Verification timestamp
- More detailed status information

## Testing

### 1. Unit Tests
Run the comprehensive test suite:
```bash
npm test verification_system_revision.test.ts
```

### 2. Integration Tests
Test the complete verification flow:
1. Create a new user account
2. Request email verification
3. Click verification link
4. Verify status updates correctly
5. Check audit logs are created

### 3. Error Handling Tests
Test various error scenarios:
- Invalid tokens
- Expired tokens
- Already verified users
- Rate limiting
- Network failures

## Security Considerations

### 1. Rate Limiting
The new system includes built-in rate limiting. Monitor your application for:
- 429 responses from the API
- Retry-After headers
- User feedback on rate limiting

### 2. Token Security
- Tokens are now hashed in the database
- Token expiration is strictly enforced
- Maximum attempt limits prevent brute force

### 3. Audit Trail
All verification actions are logged with:
- User ID
- IP address
- User agent
- Action type
- Error details

## Monitoring and Debugging

### 1. Verification Statistics
Use the built-in statistics function:
```typescript
const getVerificationStats = async (startDate: Date, endDate: Date) => {
  const { data, error } = await supabase
    .rpc('get_verification_statistics', {
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString()
    });

  if (error) throw error;
  return data;
};
```

### 2. Audit Trail Queries
```typescript
const getAuditTrail = async (userId: string, limit = 50) => {
  const { data, error } = await supabase
    .rpc('get_verification_audit_trail', {
      p_user_id: userId,
      p_limit: limit,
      p_offset: 0
    });

  if (error) throw error;
  return data;
};
```

### 3. Data Integrity Checks
```typescript
const checkDataIntegrity = async () => {
  const { data, error } = await supabase
    .rpc('verify_verification_integrity');

  if (error) throw error;
  return data;
};
```

## Common Issues and Solutions

### 1. "User already verified" Error
This means the user is already verified. Check the verification status before attempting verification.

### 2. "Invalid token" Error
The token doesn't exist or has been used. Generate a new verification token.

### 3. "Token expired" Error
The token has expired. Generate a new verification token with a longer expiration time.

### 4. "Maximum attempts exceeded" Error
Too many verification attempts. Wait for the cooldown period or contact support.

### 5. Database Constraint Violations
Ensure all verification fields are properly set when marking a user as verified. Use the provided functions instead of direct database updates.

## Next Steps

1. **Deploy the database migration** using the provided SQL script
2. **Update your frontend components** with the new verification logic
3. **Test thoroughly** in your development environment
4. **Monitor the audit logs** for any issues
5. **Set up monitoring** for verification statistics and error rates

## Support

For issues with the verification system:
1. Check the audit logs for detailed error information
2. Verify data integrity using the provided functions
3. Review the error handling documentation
4. Contact support with relevant audit log entries