import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      verified: boolean
      verifiedAt?: string | null
      verificationMethod?: string | null
      emailVerified: boolean
      isAdmin?: boolean
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    verified: boolean
    verifiedAt?: string | null
    verificationMethod?: string | null
    emailVerified: boolean
    isAdmin?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    verified: boolean
    verifiedAt?: string | null
    verificationMethod?: string | null
    emailVerified: boolean
    isAdmin?: boolean
  }
}