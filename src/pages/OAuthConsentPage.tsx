import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, AlertCircle, Check, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface AuthorizationDetails {
    client: {
        name: string;
        description?: string;
        logo_uri?: string;
    };
    redirect_uri: string;
    scopes?: string[];
}

const OAuthConsentPage: React.FC = () => {
    const [authorizationId, setAuthorizationId] = useState<string | null>(null);
    const [authDetails, setAuthDetails] = useState<AuthorizationDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const initializeOAuthConsent = async () => {
            // Get authorization_id from URL
            const params = new URLSearchParams(window.location.search);
            const authId = params.get('authorization_id');

            if (!authId) {
                setError('Missing authorization_id parameter');
                setLoading(false);
                return;
            }

            setAuthorizationId(authId);

            // Check if user is authenticated
            const { data: { user: currentUser } } = await supabase.auth.getUser();

            if (!currentUser) {
                // Redirect to auth page, preserving authorization_id
                window.location.href = `/auth?mode=login&redirect=/oauth/consent?authorization_id=${authId}`;
                return;
            }

            setUser(currentUser);

            // Get authorization details
            try {
                const { data, error: detailsError } = await (supabase.auth as any).oauth.getAuthorizationDetails(authId);

                if (detailsError) {
                    setError(detailsError.message || 'Failed to fetch authorization details');
                } else if (data) {
                    setAuthDetails(data);
                } else {
                    setError('Invalid authorization request');
                }
            } catch (err: any) {
                console.error('Error fetching authorization details:', err);
                setError(err.message || 'Failed to fetch authorization details');
            } finally {
                setLoading(false);
            }
        };

        initializeOAuthConsent();
    }, []);

    const handleApprove = async () => {
        if (!authorizationId) return;

        setProcessing(true);
        try {
            const { data, error: approveError } = await (supabase.auth as any).oauth.approveAuthorization(authorizationId);

            if (approveError) {
                toast.error(approveError.message || 'Failed to approve authorization');
                setError(approveError.message);
            } else if (data?.redirect_to) {
                // Redirect back to the client with authorization code
                window.location.href = data.redirect_to;
            }
        } catch (err: any) {
            console.error('Error approving authorization:', err);
            toast.error(err.message || 'Failed to approve authorization');
            setError(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDeny = async () => {
        if (!authorizationId) return;

        setProcessing(true);
        try {
            const { data, error: denyError } = await (supabase.auth as any).oauth.denyAuthorization(authorizationId);

            if (denyError) {
                toast.error(denyError.message || 'Failed to deny authorization');
                setError(denyError.message);
            } else if (data?.redirect_to) {
                // Redirect back to the client with error
                window.location.href = data.redirect_to;
            }
        } catch (err: any) {
            console.error('Error denying authorization:', err);
            toast.error(err.message || 'Failed to deny authorization');
            setError(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const getScopeLabel = (scope: string): string => {
        const scopeLabels: Record<string, string> = {
            'openid': 'Basic profile information',
            'email': 'Email address',
            'profile': 'Full profile details',
            'offline_access': 'Access when you\'re not using the app',
        };
        return scopeLabels[scope] || scope;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading authorization request...</p>
                </div>
            </div>
        );
    }

    if (error || !authDetails) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
                    <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">Authorization Error</h1>
                    <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                        {error || 'Invalid authorization request'}
                    </p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        Return to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-xl w-full overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                    <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mx-auto mb-4">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-center">Authorization Request</h1>
                    <p className="text-center text-blue-100 mt-2">
                        {authDetails.client.name} wants to access your account
                    </p>
                </div>

                {/* Client Info */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-start gap-4">
                        {authDetails.client.logo_uri && (
                            <img
                                src={authDetails.client.logo_uri}
                                alt={authDetails.client.name}
                                className="w-16 h-16 rounded-lg object-cover"
                            />
                        )}
                        <div className="flex-1">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                                {authDetails.client.name}
                            </h2>
                            {authDetails.client.description && (
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    {authDetails.client.description}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                            <ExternalLink className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600 dark:text-gray-400">Will redirect to:</span>
                        </div>
                        <p className="text-gray-900 dark:text-white text-sm font-mono mt-1 break-all">
                            {authDetails.redirect_uri}
                        </p>
                    </div>
                </div>

                {/* Requested Permissions */}
                {authDetails.scopes && authDetails.scopes.length > 0 && (
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            This application will be able to:
                        </h3>
                        <ul className="space-y-3">
                            {authDetails.scopes.map((scope) => (
                                <li key={scope} className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mt-0.5">
                                        <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-gray-900 dark:text-white font-medium">{getScopeLabel(scope)}</p>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                                            Scope: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{scope}</code>
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* User Info */}
                {user && (
                    <div className="p-6 bg-gray-50 dark:bg-gray-900">
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                            Authorizing as <span className="font-semibold text-gray-900 dark:text-white">{user.email}</span>
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="p-6 flex gap-3">
                    <button
                        onClick={handleDeny}
                        disabled={processing}
                        className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
                    >
                        <X className="w-5 h-5" />
                        Deny
                    </button>
                    <button
                        onClick={handleApprove}
                        disabled={processing}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 shadow-lg"
                    >
                        {processing ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Processing...
                            </>
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                Approve
                            </>
                        )}
                    </button>
                </div>

                {/* Security Notice */}
                <div className="px-6 pb-6">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>Security Notice:</strong> Only approve if you trust this application.
                            You can revoke access at any time from your account settings.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OAuthConsentPage;
