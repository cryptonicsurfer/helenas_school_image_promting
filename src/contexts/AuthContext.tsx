
"use client";

import type { UserCredential } from "@/lib/credentials";
import { USER_CREDENTIALS } from "@/lib/credentials";
import { useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  currentUser: string | null;
  isAuthenticated: boolean;
  login: (credentials: Pick<UserCredential, 'username' | 'password'>) => boolean;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      setCurrentUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = (credentials: Pick<UserCredential, 'username' | 'password'>): boolean => {
    const user = USER_CREDENTIALS.find(
      (uc) => uc.username === credentials.username && uc.password === credentials.password
    );
    if (user) {
      localStorage.setItem("currentUser", user.username);
      setCurrentUser(user.username);
      router.replace("/prompt"); // Changed from push to replace
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    router.replace("/login"); // Also use replace here for consistency
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated: !!currentUser, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
