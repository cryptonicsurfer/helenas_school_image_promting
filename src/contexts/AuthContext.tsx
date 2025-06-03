
"use client";

import { SessionProvider, signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation"; // Keep for potential programmatic navigation if needed elsewhere
import React, { createContext, useContext, ReactNode, useEffect } from "react";

// Define the shape of your AuthContext, now leveraging NextAuth's session
interface AuthContextType {
  // currentUser will be derived from session.user.email or session.user.name
  // For simplicity, let's assume we'll use session.user.id or email if available
  currentUser: string | null; // Or more detailed user object if needed
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<boolean>; // Login now takes email
  logout: () => void;
  isLoading: boolean; // This will come from useSession's status
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Inner component that uses useSession and provides context
const AuthProviderContent = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();
  const router = useRouter(); // Keep for logout redirect

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const currentUser = session?.user?.email || session?.user?.id || null; // Example: use email or ID as currentUser identifier

  const login = async (credentials: { email: string; password: string }): Promise<boolean> => {
    const result = await signIn("credentials", {
      redirect: false, // We'll handle redirect manually or rely on NextAuth's default behavior
      email: credentials.email,
      password: credentials.password,
    });
    if (result?.ok) {
      // router.replace("/prompt"); // NextAuth might handle this, or you can do it in the login page
      return true;
    }
    return false; // Error will be in result.error
  };

  const logout = () => {
    signOut({ callbackUrl: "/login" }); // Redirect to login page after sign out
  };
  
  // Effect to handle redirection based on auth state, if not handled by NextAuth middleware or pages
  useEffect(() => {
    if (!isLoading && isAuthenticated && window.location.pathname === '/login') {
      router.replace('/prompt');
    }
    // If you want to protect routes and redirect unauthenticated users from protected pages:
    // if (!isLoading && !isAuthenticated && window.location.pathname !== '/login' && /* is a protected route */) {
    //   router.replace('/login');
    // }
  }, [isLoading, isAuthenticated, router]);


  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// The main AuthProvider now just wraps children with SessionProvider
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  return (
    <SessionProvider>
      <AuthProviderContent>{children}</AuthProviderContent>
    </SessionProvider>
  );
};


export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
