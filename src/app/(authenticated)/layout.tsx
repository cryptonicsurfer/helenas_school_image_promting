"use client";

import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
// useRouter might not be needed here anymore if middleware handles all redirects
// import { useRouter } from "next/navigation";
import React from "react"; // Removed useEffect
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // useAuth still provides isLoading and isAuthenticated based on NextAuth's useSession
  const { isAuthenticated, isLoading } = useAuth();
  // const router = useRouter(); // Potentially remove if not used

  // The middleware should handle redirection.
  // This client-side check is now primarily for showing a loading state.
  // useEffect(() => {
  //   // This redirection logic is largely handled by the middleware now.
  //   // Keeping it might cause double redirects or conflicts.
  //   // if (!isLoading && !isAuthenticated) {
  //   //   router.replace("/login");
  //   // }
  // }, [isAuthenticated, isLoading, router]);

  // Show loader while session is being determined, or if unauthenticated (middleware should prevent this state mostly)
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If, for some reason, the middleware didn't redirect and the user is not authenticated,
  // this can be a fallback. However, middleware is the primary guard.
  if (!isAuthenticated) {
     return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        {/* Or a message like <p>Redirecting to login...</p> */}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
