import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://oailemrpflfahdhoxbbx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          // Sign in with Supabase
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

          if (error || !data.user) {
            console.error('Supabase auth error:', error);
            return null;
          }

          // Get verification status
          const { data: verificationData } = await supabase
            .rpc('get_user_verification_status', { user_uuid: data.user.id });

          const verificationStatus = verificationData?.[0] || {
            is_verified: false,
            verification_timestamp: null,
            verification_method: null
          };

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.full_name || data.user.email,
            verified: verificationStatus.is_verified,
            verifiedAt: verificationStatus.verification_timestamp,
            verificationMethod: verificationStatus.verification_method,
            emailVerified: !!data.user.email_confirmed_at
          };
        } catch (error) {
          console.error('Authorization error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const,
  },
  pages: {
    signIn: '/login',
    signUp: '/register',
  },
  callbacks: {
    async jwt({ token, user, account }: any) {
      if (user) {
        token.id = user.id;
        token.verified = user.verified;
        token.verifiedAt = user.verifiedAt;
        token.verificationMethod = user.verificationMethod;
        token.emailVerified = user.emailVerified;
      }
      
      // Refresh verification status on token refresh
      if (token.id && !user) {
        try {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          const { data: verificationData } = await supabase
            .rpc('get_user_verification_status', { user_uuid: token.id });
          
          if (verificationData?.[0]) {
            token.verified = verificationData[0].is_verified;
            token.verifiedAt = verificationData[0].verification_timestamp;
            token.verificationMethod = verificationData[0].verification_method;
          }
        } catch (error) {
          console.error('Error refreshing verification status:', error);
        }
      }
      
      return token;
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.verified = token.verified as boolean;
        session.user.verifiedAt = token.verifiedAt as string;
        session.user.verificationMethod = token.verificationMethod as string;
        session.user.emailVerified = token.emailVerified as boolean;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };