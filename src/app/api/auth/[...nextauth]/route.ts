import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { Pool } from 'pg';
import PgAdapter from '@auth/pg-adapter'; // Corrected import
import bcrypt from 'bcrypt';

// Use the existing pool from our database setup
import { pool } from '@/lib/database';

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('Please define the NEXTAUTH_SECRET environment variable');
}
if (!process.env.DATABASE_URL) {
  throw new Error('Please define the DATABASE_URL environment variable');
}

export const authOptions: NextAuthOptions = {
  adapter: PgAdapter(pool as Pool), // Cast because PgAdapter expects pg.Pool
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        // We'll use email as the primary identifier for login
        email: { label: "Email", type: "email", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const client = await pool.connect();
        try {
          // Find user by email
          const result = await client.query('SELECT * FROM users WHERE email = $1', [credentials.email]);
          const user = result.rows[0];

          if (user && user.password) {
            // Compare hashed password
            const isValidPassword = await bcrypt.compare(credentials.password, user.password);
            if (isValidPassword) {
              // Return user object, NextAuth will handle the rest
              // Ensure the returned object matches what NextAuth expects for a user
              return { 
                id: user.id, 
                email: user.email, 
                name: user.name,
                image: user.image 
                // Do not return the password hash
              };
            }
          }
          return null; // Credentials invalid or user not found
        } catch (error) {
          console.error('Error during authorization:', error);
          return null;
        } finally {
          client.release();
        }
      }
    })
  ],
  session: {
    strategy: 'jwt', // Using JWT for session strategy
  },
  pages: {
    signIn: '/login', // Redirect to our custom login page
    // error: '/auth/error', // (optional) custom error page
  },
  callbacks: {
    // To include user ID and other custom properties in the session token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Add other custom properties from your user model if needed
        // token.role = user.role; 
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        // Add other custom properties to the session user object
        // session.user.role = token.role;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };