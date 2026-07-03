import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { connectDB } from '@/dbConfig/db'
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import UserModel from '@/models/user'
import { generateUniqueUsername } from '@/lib/usernameGenerator'

const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

// A name is unavailable if it's an active username OR reserved in someone's
// history — so auto-assigned names never collide with a link that's still live.
async function usernameTaken(candidate: string): Promise<boolean> {
  const hit = await UserModel.findOne({
    $or: [{ username: candidate }, { previousUsernames: candidate }],
  }).select('_id')
  return !!hit
}

export const authOptions: NextAuthOptions = {
  providers: [
    ...(googleConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text', placeholder: 'Enter your email' },
        password: { label: 'Password', type: 'password', placeholder: 'Enter your password' },
      },
      async authorize(credentials): Promise<any> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        await connectDB()

        const findingUser = await UserModel.findOne({ email: credentials.email })
        if (!findingUser) {
          throw new Error('No account found with this email')
        }
        if (!findingUser.isVerified) {
          throw new Error('Please verify your account before signing in')
        }
        if (findingUser.isBanned) {
          throw new Error('This account has been suspended')
        }

        const isPasswordCorrect = await bcrypt.compare(credentials.password, findingUser.password)
        if (!isPasswordCorrect) {
          throw new Error('Incorrect email or password')
        }

        return findingUser
      },
    }),
  ],
  callbacks: {
    // For Google, create-or-link a User document in our own model, and block
    // banned accounts. Credentials sign-ins are validated in authorize() above.
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return true
      if (!user.email) return false

      await connectDB()
      let dbUser = await UserModel.findOne({ email: user.email })
      if (!dbUser) {
        dbUser = await UserModel.create({
          email: user.email,
          username: await generateUniqueUsername(usernameTaken),
          // OAuth accounts have no password — store an unusable random hash.
          password: await bcrypt.hash(randomUUID(), 10),
          isVerified: true,
          isAcceptingMessage: true,
          verificationCode: '000000',
          verificationCodeExpiry: new Date(),
        })
      }
      if (dbUser.isBanned) return false
      return true
    },

    async jwt({ token, user, account, trigger, session }) {
      // Client called useSession().update({ username }) after an edit — refresh
      // the token so the new username propagates without a re-login.
      if (trigger === 'update' && session?.username) {
        token.username = session.username
      }

      if (user) {
        let role = 'user'

        if (account?.provider === 'google' && user.email) {
          // Load our DB record (Google's user has no _id/username).
          await connectDB()
          const dbUser = await UserModel.findOne({ email: user.email })
          if (dbUser) {
            token._id = String(dbUser._id)
            token.username = dbUser.username
            token.isVerified = dbUser.isVerified
            token.isAcceptingMessage = dbUser.isAcceptingMessage
            role = dbUser.role ?? 'user'
          }
        } else {
          token._id = user._id?.toString()
          token.isVerified = user?.isVerified
          token.isAcceptingMessage = user?.isAcceptingMessage
          token.username = user?.username
          role = (user as any)?.role ?? 'user'
        }

        // Elevate to admin if the email is in the ADMIN_EMAILS bootstrap list.
        const bootstrapAdmins = (process.env.ADMIN_EMAILS ?? '')
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean)
        const email = (user as any)?.email?.toLowerCase?.() ?? ''
        token.role = role === 'admin' || bootstrapAdmins.includes(email) ? 'admin' : 'user'
      }

      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user._id = token._id
        session.user.isVerified = token.isVerified
        session.user.username = token.username
        session.user.isAcceptingMessage = token.isAcceptingMessage
        session.user.role = token.role
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      // Send users to the dashboard after OAuth instead of the home page.
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (url.startsWith(baseUrl)) return url
      return `${baseUrl}/dashboard`
    },
  },
  pages: {
    signIn: '/sign-in',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
